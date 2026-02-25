# Maturity Phase 3 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

* `Persists trust thresholds and returns trend windows/directions` passes.

## Manual

1. Open popup -> Calibration section.
2. Set thresholds:
   - Negative feedback threshold
   - Section disablement threshold
   - Report reopen threshold
   - Uninstall warn toggle
3. Click `Save Trust Thresholds`.
4. Click `Refresh Trust Trend`.
5. Confirm trust trend panel now shows:
   - current thresholds line
   - window summaries (`last5`, `last10`)
   - direction indicators (`up/down/stable`)
6. Trigger trust proxy updates (negative feedback, section disablement, reopen loads) and verify trend updates coherently.
7. Confirm warnings reflect configured threshold values.

Pass condition:

* Thresholds are configurable/persistent and trend diagnostics are clear and deterministic.
