# Learning Log

This log records material implementation decisions and observed outcomes.

## Entry 2026-02-25-01

- Date: 2026-02-25
- Change summary: Refined exposure suggestion relevance by filtering non-topical domains (auth/internal/local hosts) while keeping deterministic symmetry behavior.
- Trigger: Manual Phase 5 validation feedback indicating low relevance from domains such as `accounts.*` and internal tailnet hosts.
- Decision: Keep deterministic balancing logic and add topical-domain filtering before exposure row generation.
- Validation evidence:
  - Automated gate `npm run test:phase4:v3` passed with symmetry deterministic/count-balance checks.
  - Manual validation confirmed improved exposure relevance and Phase 5 pass.
- Follow-up action: Revisit domain classification heuristics during pilot stabilization if additional false-positive topical mappings appear.
