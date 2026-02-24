# Maturity Phase 1 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

* `Creates and transitions proposals from popup UI controls` passes.

## Manual (No DevTools)

1. Open extension popup.
2. In Governance section:
   - Enter proposal summary.
   - Click `Create Proposal`.
   - Confirm new `pending` entry appears.
3. Click `Approve` on that pending row.
4. Confirm row status updates to `approved`.
5. Create another proposal and click `Reject`.
6. Confirm row status updates to `rejected`.
7. Toggle `Manual Review Required` on and confirm proposal creation still starts as `pending`.

Pass condition:

* Proposal creation and lifecycle transitions are fully usable from popup controls only.
