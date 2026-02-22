import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";

const installHint = [
  "Playwright is optional and not installed.",
  "To enable Phase 1 smoke tests:",
  "1) npm i -D playwright",
  "2) npx playwright install chromium",
  "3) node scripts/phase1-smoke-v3.mjs"
].join("\n");

let playwright;
try {
  playwright = await import("playwright");
} catch {
  console.log(installHint);
  process.exit(0);
}

const extensionPath = path.resolve(process.cwd(), "mindset-v3");
const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runCheck(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

const context = await playwright.chromium.launchPersistentContext("", {
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`
  ]
});

try {
  const setupPage = await context.newPage();
  await setupPage.goto("https://example.com", { waitUntil: "domcontentloaded" });
  await delay(1500);

  const extensionId = await detectExtensionId(context, setupPage);
  assert(extensionId, "Could not detect extension id.");

  await runCheck("Captures visit metadata and generates report", async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });

    await popupPage.click("#generateReportButton");
    await popupPage.waitForTimeout(2000);

    const totalVisits = await popupPage.evaluate(async () => {
      const data = await chrome.storage.local.get(["latestWeeklyReport"]);
      return data.latestWeeklyReport?.summary?.totalVisits ?? 0;
    });
    assert(totalVisits > 0, "Report summary has zero visits.");
  });

  await runCheck("Generates neutral weekly report", async () => {
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`, { waitUntil: "domcontentloaded" });
    await popupPage.waitForTimeout(300);

    const reflection = await popupPage.$eval("#reflectionText", (el) => (el.textContent || "").toLowerCase());
    assert(reflection.includes("distribution overview"), "Missing expected reflection section heading.");
    assert(!reflection.includes("you should"), "Reflection includes advisory language.");
    assert(!reflection.includes("to improve"), "Reflection includes prescriptive language.");
  });
} finally {
  await context.close();
}

for (const result of results) {
  if (result.ok) {
    console.log(`PASS: ${result.name}`);
  } else {
    console.log(`FAIL: ${result.name} :: ${result.error}`);
  }
}

const failures = results.filter((item) => !item.ok).length;
if (failures > 0) {
  console.error(`\nPhase 1 smoke failed (${failures}/${results.length} checks failed).`);
  process.exit(1);
}

console.log(`\nPhase 1 smoke passed (${results.length} checks).`);

async function detectExtensionId(context, page) {
  const session = await context.newCDPSession(page);
  const maxAttempts = 15;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { targetInfos } = await session.send("Target.getTargets");
    for (const target of targetInfos) {
      const url = String(target.url || "");
      if (!url.startsWith("chrome-extension://")) continue;
      const host = new URL(url).host;
      if (host) return host;
    }
    await delay(500);
  }

  return "";
}
