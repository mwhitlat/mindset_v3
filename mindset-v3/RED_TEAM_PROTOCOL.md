# Red Team Protocol

## Purpose

Run lightweight adversarial checks against current-scope behaviors to detect identity/privacy/performance/governance regressions early.

## Cadence

- Run once per maturity phase closeout.
- Run additionally after any change that touches reflection identity invariants, governance flow, or storage behavior.

## Categories

1. Identity Invariant Checks
- Confirm outputs remain observational, descriptive, neutral, and non-prescriptive.
- Confirm invariant checker flags directive/normative phrasing.

2. Privacy Boundary Checks
- Confirm no external transmission of browsing data.
- Confirm URLs remain local and no analytics/telemetry endpoints are introduced.

3. Performance Guardrail Checks
- Confirm no polling loops or blocking operations were added.
- Confirm smoke suite runtime remains stable for unchanged hardware conditions.

4. Governance UI Integrity Checks
- Confirm proposal create/approve/reject/rollback paths remain functional.
- Confirm rollback availability state is clear and consistent.

## Run Procedure

1. Execute automated gate (`npm run test:phase4:v3`).
2. Execute targeted manual checks for categories above.
3. Log results in `RED_TEAM_LOG.md`.
4. If a high-severity issue is found, open an escalation using `ESCALATION_TEMPLATE.md`.
