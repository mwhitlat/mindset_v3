# Mindset Long-Charter Maturity Plan

Date: 2026-02-22
Baseline: `v0.1.0-pilot-ready`
Objective: Mature the current MVP into a long-charter-ready system without full rebuild.

---

# 1. Recommendation

Build on the existing MVP.

Do not rebuild from scratch.

Rationale:

* Core architecture is already aligned with identity/privacy/performance constraints.
* Remaining work is governance/process maturity and calibration depth.
* Rebuild would duplicate stable baseline functionality and delay operational learning.

---

# 2. Timeline Options

## Option A: Fast-Track (2-4 weeks)

Use if:

* You prioritize shipping quickly with moderate governance maturity.
* You accept lower confidence in long-term process rigor at initial rollout.

## Option B: Maturity-Track (6-10 weeks)

Use if:

* You want credible long-charter operational maturity before broader rollout.
* You require stronger evidence cycles (red-team, trust trend stability, learning logs).

Recommended: Option B.

---

# 3. Workstreams

## A. Governance Maturity

Goals:

* Complete proposal lifecycle from runtime triggers to operator decision.
* Expand sandbox comparison outputs for structural and semantic diffs.
* Harden rollback safety UX and state integrity checks.

Deliverables:

* Proposal lifecycle map and status dashboard.
* Structured comparison report (baseline vs proposal).
* Rollback guardrails and rollback verification checks.

## B. Trust and Calibration

Goals:

* Improve trust signal quality and warning thresholds.
* Reduce invariant false positives and false negatives.
* Tighten exposure symmetry consistency.

Deliverables:

* Trust trend calibration table and threshold config.
* Invariant check tuning changelog.
* Symmetry audit report across representative domains.

## C. Process and Governance Discipline

Goals:

* Operationalize learning logs and revision discipline.
* Establish recurring red-team protocol.
* Standardize escalation format and decision documentation.

Deliverables:

* `LEARNING_LOG.md` with required schema entries.
* `RED_TEAM_PROTOCOL.md` and run cadence.
* `ESCALATION_TEMPLATE.md` with charter section linking.

## D. Pilot Stabilization

Goals:

* Run trusted-user cycles with controlled change windows.
* Fix defects and reliability issues only.
* Validate ship-definition criteria repeatedly.

Deliverables:

* Pilot issue backlog with severity levels.
* Release candidate checklist.
* Final pilot-readiness signoff record.

---

# 4. Weekly Plan (Maturity-Track, 8-week midpoint)

## Week 1

* Define maturity acceptance criteria and gap map against long charter.
* Implement runtime-triggered proposal creation (from governance checks).
* Add proposal lifecycle visibility in UI.

Exit gate:

* Proposals can be created without DevTools and tracked end-to-end.

## Week 2

* Implement structured sandbox comparison report.
* Add explicit “requires approval” markers for structural changes.
* Improve rollback UX states and error clarity.

Exit gate:

* Proposal review and rollback flow are auditable and operator-clear.

## Week 3

* Add trust threshold configuration and warning tuning.
* Add trend window diagnostics (recent changes, stability indicators).
* Harden trust proxy event quality.

Exit gate:

* Trust warnings are meaningful and stable in repeated runs.

## Week 4

* Calibrate invariant checks (language and structural checks).
* Add calibration tests to automation suite.
* Document tuning decisions.

Exit gate:

* Invariant false alarms reduced and traceable.

## Week 5

* Tighten exposure symmetry logic with deterministic balancing rules.
* Run symmetry audits across representative browsing summaries.

Exit gate:

* Symmetry report passes defined consistency thresholds.

## Week 6

* Implement learning/revision log workflow and templates.
* Add operator escalation protocol outputs in-app/docs.
* Begin red-team runs with documented findings.

Exit gate:

* Process discipline artifacts are active and used.

## Week 7

* Pilot stabilization sprint: defect fixes, reliability hardening.
* Freeze non-critical changes.
* Run full validation battery.

Exit gate:

* No critical defects open; validation suite stable.

## Week 8

* Final pilot readiness review against long-charter criteria.
* Prepare release candidate and signoff.

Exit gate:

* Long-charter readiness approved for broader pilot.

---

# 5. Validation and Quality Gates

At the end of each week:

1. Automated suite passes (`test:phase4:v3` + added maturity checks).
2. Manual validation checklist run and logged.
3. Trust trend reviewed with explicit accept/reject decision.
4. One learning-log entry added for significant changes.

---

# 6. Rebuild vs Add-On Decision

Decision: Add-on.

Revisit rebuild only if any of the following become true:

1. Core data model blocks required governance lifecycle behavior.
2. Privacy boundary cannot be preserved without major architectural change.
3. Rollback/sandbox complexity introduces fragile coupling that cannot be isolated.

Absent these triggers, continue incremental maturity build.

---

# 7. Immediate Next Task

1. Add user-facing proposal creation path (no DevTools dependency).
2. Define and implement proposal trigger from governance checks.
3. Add proposal lifecycle states panel in popup.
