# Phase 3 Validation

## Automated Smoke

Run from workspace root:

```bash
npm run test:phase3:v3
```

Checks:

- Local capture and weekly reflection generation.
- Governance proposal logging/review/rollback.
- Trust proxy counter and flag updates.
- Replay snapshot creation and deterministic replay diff.
- Exposure suggestions generation.
- Sandbox config persistence.
- Density check execution.

## Manual Validation (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and choose `/Users/matthewwhitlatch/mindset/mindset-v3`.
4. Open popup and click `Generate Report`.
5. Replay Lite:
   - Click `Create Replay Snapshot`.
   - Click `Run Replay Diff`.
   - Confirm diff summary is shown.
6. Exposure:
   - Confirm adjacent perspective rows appear after report generation.
7. Sandbox:
   - Enable sandbox.
   - Switch between `baseline`, `compact`, `replay_focus`, and `exposure_focus`.
   - Confirm controls persist and section ordering/density changes are visible.
8. Density:
   - Click `Run Density Check`.
   - Confirm check list renders with pass/warn status.
9. Confirm overall output remains observational, descriptive, neutral, and non-prescriptive.
