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
  await page.waitForTimeout(3000);
  console.log('Smoke test ran: extension loaded and page opened.');
} finally {
  await context.close();
}
