# Calibration Log

## Entry 2026-02-25

- Rule changed: Invariant calibration ruleset advanced from `calibration-v1.1` to `calibration-v1.2`.
- Why changed: Prior rule set used broad advisory phrase matching (for example `to improve`) that created noise in neutral reflections.
- Expected impact:
  - Reduce false-positive invariant warnings for neutral descriptive text.
  - Preserve strict rejection for clearly prohibited phrasing (directives, behavioral nudging, normative scoring).
  - Keep deterministic output ordering for repeated invariant runs.
- Validation evidence:
  - Automated check `Calibrates invariant checks with deterministic outputs` added in `/Users/matthewwhitlatch/mindset/scripts/phase1-smoke-v3.mjs`.
  - Scenario A confirms neutral phrase `used to improve instrumentation diagnostics` returns `pass` with zero warnings/violations.
  - Scenario B confirms directive/scoring reflection returns `fail` with violations and stable repeated output.
