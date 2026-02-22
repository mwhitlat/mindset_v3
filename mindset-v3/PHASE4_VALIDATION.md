# Phase 4 Validation

## Automated Smoke

Run from workspace root:

```bash
npm run test:phase4:v3
```

Checks:

- Phase 1-3 baseline flows remain stable.
- Invariant check executes and returns status/warnings payload.
- Trust trend history + warnings payload is available.
- Replay/exposure/sandbox/density paths still pass.

## Manual Validation (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and select `/Users/matthewwhitlatch/mindset/mindset-v3`.
4. Open popup and click `Generate Report`.
5. Calibration section:
   - Click `Run Invariant Check`; verify status and warning list render.
   - Click `Refresh Trust Trend`; verify trend summary/warnings render.
6. Trust Proxies section:
   - Record negative feedback and section disablement.
   - Toggle uninstall proxy flag.
   - Refresh trust trend and verify warning behavior near thresholds.
7. Exposure section:
   - Confirm suggestions are symmetric in row length and neutrally framed.
8. Sandbox and density:
   - Toggle sandbox variants and confirm compact/reordered behavior.
   - Run density check and verify checks/status render.
9. Confirm all outputs remain observational, descriptive, neutral, and non-prescriptive.
