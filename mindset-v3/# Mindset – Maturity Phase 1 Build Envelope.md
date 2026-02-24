# Mindset – Maturity Phase 1 Build Envelope

Version: 1.0
Applies To: Long-Charter Maturity Plan Week 1
Objective: Remove DevTools dependency by adding user-facing proposal creation and lifecycle visibility.

Roadmap Anchor:

* `/Users/matthewwhitlatch/mindset/mindset-v3/LONG_CHARTER_MATURITY_PLAN.md` (Week 1)

---

# 1. Purpose

Maturity Phase 1 exists to:

* Enable proposal creation from normal product usage (no DevTools).
* Add explicit lifecycle visibility for governance proposals.
* Establish operator-ready proposal flow needed for deeper charter maturity.

---

# 2. Scope (What Must Be Built)

## A. User-Facing Proposal Creation

Implement at least one in-product path that creates proposals:

* Manual create action in popup governance section (test-safe).
* Optional automatic create trigger from existing governance checks (deterministic only).

Created proposals must include required schema fields:

* id
* timestamp
* proposed change summary
* triggering checks
* status

## B. Proposal Lifecycle Panel

Add lifecycle panel in popup that shows:

* pending
* approved
* rejected
* rolled_back

Panel requirements:

* Shows latest entries clearly.
* Supports explicit manual transitions for eligible pending entries.
* No silent state changes.

## C. Manual Review Integrity

Enforce and surface review constraints:

* If `review_required` is true, new proposals are `pending`.
* Only pending entries can be transitioned.
* Lifecycle actions provide visible success/failure feedback.

## D. Validation Coverage

Extend automation + manual runbook:

* Add smoke checks for user-facing creation path.
* Add smoke checks for lifecycle transitions from UI-triggerable flow.
* Add/update manual validation instructions.

---

# 3. Explicit Non-Goals

Do NOT build in this envelope:

* Autonomous proposal approval logic.
* Semantic classification pipelines.
* New telemetry services.
* Large UI redesign.
* Exposure/replay feature expansion.

If uncertain, exclude.

---

# 4. Constraints

## Identity

All user-facing text must remain observational, descriptive, neutral, non-prescriptive.

## Privacy

All proposal data remains local.

## Performance

No polling loops or blocking UI operations.

## Architecture

Use existing governance storage/message paths; avoid major refactors.

---

# 5. Definition of Done

Maturity Phase 1 is complete when:

1. A user can create a proposal from the popup without DevTools.
2. Proposal lifecycle states are visible in UI.
3. Pending proposals can be explicitly approved/rejected through supported controls.
4. Manual review constraints are enforced and visible.
5. Automated and manual validations pass.

No additional features required.

---

# 6. Stop Condition

Stop when:

* DevTools dependency for proposal creation is removed.
* Lifecycle visibility and transitions are stable.
* Validation confirms no regression in neutrality/privacy/performance.

Do not start Week 2 maturity work until this stop condition is met.

---

# 7. Escalation Protocol

Escalate only for:

1. Required permission expansion.
2. Data model changes that break rollback integrity.
3. Conflicts with identity/privacy invariants.

Escalation response must include:

* concise issue summary
* 2 options
* recommended option

---

End of Maturity Phase 1 Build Envelope
