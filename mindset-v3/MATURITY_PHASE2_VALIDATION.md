# Maturity Phase 2 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

* `Produces comparison report and requires_approval marker` passes.
* `Creates and transitions proposals from popup UI controls` still passes.

## Manual

1. Open popup -> Governance section.
2. Check rollback status line:
   - If no snapshot exists, confirm message indicates unavailable.
   - After approving a proposal, confirm rollback target appears.
3. Create a proposal.
4. Confirm lifecycle row shows:
   - status
   - comparison summary line (`governance changes`, `sandbox changes`)
5. Create a structural proposal (if exposed via triggers) or confirm marker appears when such proposals are logged.
6. Approve/reject pending entries and confirm status updates.
7. Trigger rollback and confirm:
   - clear success/failure message
   - rollback status line updates accordingly.

Pass condition:

* Comparison visibility, structural-approval signaling, and rollback clarity are all understandable from popup controls.
