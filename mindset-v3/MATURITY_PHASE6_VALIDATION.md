# Maturity Phase 6 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

- `Validates Phase 6 process artifacts` passes.

## Manual

1. Open and review process artifacts:
   - `LEARNING_LOG.md`
   - `ESCALATION_TEMPLATE.md`
   - `RED_TEAM_PROTOCOL.md`
   - `RED_TEAM_LOG.md`
2. Confirm `LEARNING_LOG.md` includes one real entry with all schema fields:
   - Date
   - Change summary
   - Trigger
   - Decision
   - Validation evidence
   - Follow-up action
3. Confirm `ESCALATION_TEMPLATE.md` includes:
   - Risk description
   - Two concrete options
   - Recommended option and rationale
   - Reversibility section
4. Confirm `RED_TEAM_PROTOCOL.md` includes cadence and test categories.
5. Confirm `RED_TEAM_LOG.md` includes at least one documented run and outcomes.

Pass condition:

- Phase 6 process artifacts are complete, structured, and usable, and automated checks pass.
