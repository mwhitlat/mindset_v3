# Phase 2 Validation

## Automated Smoke

Run from workspace root:

```bash
npm run test:phase2:v3
```

Checks:

- Local capture + weekly reflection report generation.
- Governance proposal append/read.
- Manual review toggle enforcement (`review_required`).
- Proposal status application path for pending proposals.
- Single-step rollback to last approved snapshot with rollback event log.
- Trust proxies counters and uninstall flag updates.

## Manual Validation (Chrome)

1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and choose `/Users/matthewwhitlatch/mindset/mindset-v3`.
4. Open popup and generate report once.
5. In Governance section:
   - Toggle `Manual Review Required` on/off and verify state persists after closing/reopening popup.
   - Trigger rollback and verify status message appears.
   - Confirm latest proposal list shows recent statuses and timestamps.
6. In Trust Proxies section:
   - Click both record buttons and confirm counters increment.
   - Toggle `Uninstall Proxy Flag` and confirm state persists.
7. Confirm reflection output remains observational and non-prescriptive.
