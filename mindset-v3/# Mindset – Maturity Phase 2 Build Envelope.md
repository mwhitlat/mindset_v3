# Mindset – Maturity Phase 2 Build Envelope

Version: 1.0
Applies To: Long-Charter Maturity Plan Week 2
Objective: Add structured sandbox comparison reporting, approval markers for structural changes, and clearer rollback safety UX.

Roadmap Anchor:

* `/Users/matthewwhitlatch/mindset/mindset-v3/LONG_CHARTER_MATURITY_PLAN.md` (Week 2)

---

# 1. Purpose

Maturity Phase 2 exists to:

* Make proposal review more auditable with structured comparison output.
* Clearly flag proposals that require approval due to structural impact.
* Improve rollback UX clarity and operator confidence.

---

# 2. Scope (What Must Be Built)

## A. Structured Sandbox Comparison Report

Add report output per proposal/review flow:

* Baseline snapshot summary.
* Proposed configuration summary.
* Deterministic structural diff fields.
* Deterministic text diff summary where applicable.

## B. Approval Markers for Structural Scope Changes

Add explicit marker logic:

* Detect structural scope changes in proposal payload/config deltas.
* Mark proposal as `requires_approval`.
* Surface marker visibly in governance lifecycle panel.

No silent auto-apply for marked entries.

## C. Rollback UX Safety Clarity

Improve rollback interaction:

* Show if rollback target snapshot exists before action.
* Display explicit success/failure detail in governance status.
* Keep rollback single-step and reversible.

## D. Validation Coverage

Add/extend:

* Automated checks for comparison report payload shape.
* Automated checks for structural approval markers.
* Manual checks for rollback clarity states.

---

# 3. Explicit Non-Goals

Do NOT build in this envelope:

* Autonomous approval decisions.
* Semantic classifier-based proposal routing.
* New data collection scope.
* Major UI redesign outside governance panel clarity.

---

# 4. Constraints

## Identity

Review/comparison text must remain neutral and descriptive.

## Privacy

All comparison artifacts remain local.

## Performance

No polling loops and no blocking UI operations.

## Architecture

Extend existing proposal/sandbox/rollback paths; avoid rewrites.

---

# 5. Definition of Done

Maturity Phase 2 is complete when:

1. Structured comparison report is generated for proposal review.
2. Structural-scope proposals are explicitly marked as requiring approval.
3. Rollback UX clearly communicates availability and result.
4. Automated and manual validations pass.

No additional features required.

---

# 6. Stop Condition

Stop when:

* Comparison report and approval markers are stable.
* Rollback clarity issues are resolved.
* Validation confirms no neutrality/privacy/performance regression.

Do not start Week 3 maturity work until stop condition is met.

---

# 7. Maturity Continuity Rule

At maturity phase closeout:

1. Draft the next maturity phase build envelope before implementation of the next phase starts.
2. Tie the next envelope to the exact week/section in `/Users/matthewwhitlatch/mindset/mindset-v3/LONG_CHARTER_MATURITY_PLAN.md`.
3. Commit the next envelope with closeout artifacts (`MATURITY_PHASE*_DONE.md` and `BUILD_STATE.md` update).

This rule is mandatory for all subsequent maturity phases.

---

End of Maturity Phase 2 Build Envelope
