# Pilot Issues

This backlog tracks pilot stabilization issues for Week 7.

## Severity Legend

- `critical`: blocks safe pilot operation
- `high`: materially degrades reliability or operator trust
- `medium`: visible issue with acceptable workaround
- `low`: minor issue with low pilot impact

## Issue List

### PILOT-001

- Severity: `medium`
- Status: `open`
- Area: Exposure diagnostics relevance
- Summary: Exposure rows can still be generic for unknown domains after topical filtering.
- Pilot impact: Suggestions may have lower utility for domains outside mapped tags.
- Week 7 disposition: deferred with rationale (no pilot safety/privacy risk; deterministic behavior preserved).
- Next action: refine domain-tag mapping during Week 8 final readiness review if needed.

### PILOT-002

- Severity: `low`
- Status: `open`
- Area: Validation script naming clarity
- Summary: `test:phase4:v3` remains the main maturity gate script name through later phases.
- Pilot impact: Low; no functional impact, but naming may cause operator confusion.
- Week 7 disposition: deferred with rationale (no runtime risk; avoid non-critical renames during freeze).
- Next action: evaluate rename after pilot freeze window.

## Critical/High Summary

- Open critical issues: `0`
- Open high issues: `0`
- Week 7 gate status: no critical/high blockers identified.
