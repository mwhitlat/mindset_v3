import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const installHint = [
  'Playwright is optional and not installed.',
  'To enable smoke tests:',
  '1) npm i -D playwright',
  '2) npx playwright install chromium',
  '3) npm run test:smoke'
].join('\n');

let playwright;
try {
  playwright = await import('playwright');
} catch {
  console.log(installHint);
  process.exit(0);
}

const extensionPath = process.cwd();
const harnessBase = 'http://127.0.0.1:4173/tests/harness';
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runCheck(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

async function canReachHarness() {
  try {
    const res = await fetch(`${harnessBase}/index.html`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHarness(timeoutMs = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await canReachHarness()) return true;
    await delay(150);
  }
  return false;
}

async function ensureHarnessServer() {
  if (await canReachHarness()) {
    return { owned: false, proc: null };
  }

  const proc = spawn(process.execPath, ['scripts/serve-harness.mjs'], {
    cwd: extensionPath,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = await waitForHarness(10000);
  if (!ready) {
    proc.kill('SIGTERM');
    throw new Error('Harness server did not start on http://127.0.0.1:4173');
  }

  return { owned: true, proc };
}

const harnessServer = await ensureHarnessServer();

try {
  await runCheck('Extension loads on a real page', async () => {
    const context = await playwright.chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ]
    });

    try {
      const page = await context.newPage();
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const title = await page.title();
      assert(title.toLowerCase().includes('example'), `Unexpected page title: ${title}`);
    } finally {
      await context.close();
    }
  });

  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    await runCheck('Harness index exposes all entry points', async () => {
      await page.goto(`${harnessBase}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('text=Mindset Test Harness');
      const links = await page.$$eval('a', (anchors) => anchors.map((a) => a.getAttribute('href')));
      assert(links.includes('/tests/harness/harness.html'), 'Missing browser-status harness link');
      assert(links.includes('/tests/harness/popup-harness.html'), 'Missing popup harness link');
      assert(links.includes('/tests/harness/dashboard-harness.html'), 'Missing dashboard harness link');
    });

    await runCheck('Browser status harness initializes and renders intervention UI', async () => {
      await page.goto(`${harnessBase}/harness.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);

      const logText = await page.$eval('#log', (el) => el.textContent || '');
      assert(logText.includes('harness-ready'), 'Harness runtime did not initialize');
      assert(logText.includes('"action":"getCredibilityBudgetStatus"'), 'Credibility status was not requested');
      assert(logText.includes('"action":"getSameStoryUpgrade"'), 'Same-story status was not requested');

      const hasVisibleTopBanner = await page.evaluate(() => {
        const banner = document.getElementById('mindset-warning-banner');
        if (!banner) return false;
        const style = window.getComputedStyle(banner);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      const hasOverlay = (await page.locator('#mindset-echo-breaker, #mindset-credibility-budget, #mindset-interstitial').count()) > 0;
      const hasSameStory = (await page.locator('#mindset-same-story-upgrade').count()) > 0;
      assert(hasVisibleTopBanner || hasOverlay || hasSameStory, 'No intervention UI rendered on harness page');
    });

    await runCheck('Popup harness renders popup UI in iframe', async () => {
      await page.goto(`${harnessBase}/popup-harness.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#previewFrame');

      const frameHandle = await page.$('#previewFrame');
      assert(frameHandle, 'Popup preview frame missing');
      const frame = await frameHandle.contentFrame();
      assert(frame, 'Popup preview frame did not load content');

      await frame.waitForTimeout(1200);
      const trackingToggleCount = await frame.locator('#trackingToggle').count();
      assert(trackingToggleCount === 1, 'Popup tracking toggle not found in popup harness');
    });

    await runCheck('Dashboard harness renders dashboard UI in iframe', async () => {
      await page.goto(`${harnessBase}/dashboard-harness.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#previewFrame');

      const frameHandle = await page.$('#previewFrame');
      assert(frameHandle, 'Dashboard preview frame missing');
      const frame = await frameHandle.contentFrame();
      assert(frame, 'Dashboard preview frame did not load content');

      await frame.waitForSelector('#overallHealthScore', { timeout: 7000 });
      const scoreText = await frame.$eval('#overallHealthScore', (el) => (el.textContent || '').trim());
      assert(scoreText.length > 0 && scoreText !== '-', 'Dashboard score did not populate');
    });
  } finally {
    await browser.close();
  }
} finally {
  if (harnessServer.owned && harnessServer.proc) {
    harnessServer.proc.kill('SIGTERM');
  }
}

for (const result of results) {
  if (result.ok) {
    console.log(`PASS: ${result.name}`);
  } else {
    console.log(`FAIL: ${result.name} :: ${result.error}`);
  }
}

const failures = results.filter((r) => !r.ok).length;
if (failures > 0) {
  console.error(`\nSmoke suite failed (${failures}/${results.length} checks failed).`);
  process.exit(1);
}

console.log(`\nSmoke suite passed (${results.length} checks).`);
