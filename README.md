# Mindset Privacy Policy

This repository hosts the privacy policy for the **Mindset - Digital Diet Tracker** Chrome extension.

## About Mindset

Mindset is a privacy-first browser extension that helps users understand their digital content consumption patterns. It analyzes web page content to identify political bias, emotional tone, and credibility—all processed locally on the user's device.

## Privacy Policy

The privacy policy is available at: [https://matthewwhitlatch.github.io/mindset-privacy/](https://matthewwhitlatch.github.io/mindset-privacy/)

## Contact

For questions about privacy or the extension, contact: mindset.extension.beta@gmail.com

## Extension Details

- **Name:** Mindset - Digital Diet Tracker
- **Purpose:** Content analysis and digital diet tracking
- **Data Processing:** 100% local, no external transmission
- **Platform:** Chrome Web Store

## Developer Test Platform

This repo now includes a lightweight local testing platform to speed iteration.

### 1) Logic tests (fast)

Run:

```bash
npm run test:logic
```

Uses Node built-in tests in `/Users/matthewwhitlatch/mindset/tests/logic`.

### 2) Interactive UI harness

Run:

```bash
npm run dev:test
```

Open:

`http://127.0.0.1:4173/tests/harness/index.html`

Harness pages:
- Browser status indicator: `/tests/harness/harness.html`
- Popup UI: `/tests/harness/popup-harness.html`
- Dashboard UI: `/tests/harness/dashboard-harness.html`

The harness mocks `chrome.runtime.sendMessage` and lets you quickly simulate:
- credibility load levels
- guidance modes
- same-story upgrade eligibility
- page credibility/category/title states

Live reload is enabled for harness pages when files change.

### 3) Optional Playwright smoke

Run:

```bash
npm run test:smoke
```

If Playwright is not installed, the script prints install steps and exits cleanly.
