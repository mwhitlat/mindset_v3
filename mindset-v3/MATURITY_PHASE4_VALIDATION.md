# Maturity Phase 4 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

- `Calibrates invariant checks with deterministic outputs` passes.

## Manual

1. Open extension popup.
2. Generate a fresh report.
3. In `Calibration Diagnostics`, click `Run Invariant Check`.
4. Confirm a neutral report shows:
   - `Status: PASS`
   - `No invariant warnings or violations.`
5. Create a pending proposal with a clearly directive summary, then approve it (to ensure governance paths still work after calibration updates).
6. Click `Run Invariant Check` again and confirm invariant diagnostics still render without UI errors.
7. Optional strict-path spot check in DevTools console (popup page):

```js
await chrome.storage.local.set({
  latestWeeklyReport: {
    reflection: [
      'Distribution Overview',
      'You should reduce high-frequency domain usage.',
      '',
      'Frequency Patterns',
      'Score: 8',
      '',
      'Notable Concentrations',
      'Concentration is shown in one domain.'
    ].join('\n')
  }
});
```

Then click `Run Invariant Check` and confirm:
- `Status: FAIL`
- At least one `Violation:` row appears.

Pass condition:

- Calibrated invariant checks reduce warning noise on neutral text while preserving strict rejection for clearly prohibited framing, with deterministic automated results.
