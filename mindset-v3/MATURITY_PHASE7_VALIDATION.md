# Maturity Phase 7 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

- `Validates Phase 7 pilot stabilization artifacts` passes.

## Manual

1. Review `/Users/matthewwhitlatch/mindset/mindset-v3/PILOT_ISSUES.md`:
   - Severity legend exists.
   - Issue statuses are present.
   - Critical/high summary is present.
2. Review `/Users/matthewwhitlatch/mindset/mindset-v3/PILOT_CHANGE_FREEZE.md`:
   - Frozen categories are listed.
   - Allowed change classes are listed.
   - Exception path references `ESCALATION_TEMPLATE.md`.
3. Review `/Users/matthewwhitlatch/mindset/mindset-v3/RED_TEAM_LOG.md`:
   - Contains an additional Week 7 run entry.
4. Run key UI sanity checks:
   - Open popup and generate report.
   - Create and approve one proposal.
   - Confirm rollback status still renders without errors.

Pass condition:

- Pilot stabilization artifacts are complete and active, and no critical/high blockers are open for pilot baseline.
