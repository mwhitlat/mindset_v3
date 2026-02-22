# Phase 1 Validation

## Automated Smoke

Run from workspace root:

```bash
npm run test:phase1:v3
```

Checks:

- Extension captures page visit metadata through normal browsing.
- Weekly report generation succeeds with fully local deterministic reflection.
- Reflection text remains non-prescriptive (`you should` and `to improve` are rejected in smoke checks).

## Manual Validation (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and choose `/Users/matthewwhitlatch/mindset/mindset-v3`.
4. Browse a few normal pages (`https://example.com` is sufficient).
5. Open extension popup and click `Generate Report`.
6. Confirm:
   - Domain Distribution chart renders.
   - Reflection has neutral headings and descriptive tone.
   - No advisory language appears.
7. Confirm no external model configuration is required for report generation.
