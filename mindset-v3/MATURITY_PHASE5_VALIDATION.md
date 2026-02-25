# Maturity Phase 5 Validation

## Automated

Run:

```bash
npm run test:phase4:v3
```

Confirm:

- `Keeps exposure symmetry deterministic and count-balanced` passes.

## Manual

1. Open extension popup.
2. Generate a report.
3. Confirm `Exposure Suggestions` renders rows with adjacent domains.
4. Click `Generate Weekly Report` a second time without changing browsing state.
5. Confirm exposure rows retain stable ordering and no random reordering appears.
6. Set sandbox to `exposure_focus` and verify exposure section remains visible and stable.
7. Toggle sandbox back to `baseline` and confirm exposure rows remain intact.

Pass condition:

- Exposure suggestions remain deterministic across repeated loads and preserve stable balanced row outputs without UI regressions.
