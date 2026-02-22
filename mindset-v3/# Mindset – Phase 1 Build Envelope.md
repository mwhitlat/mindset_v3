# Mindset – Phase 1 Build Envelope

Version: 1.0
Applies To: Weeks 1–4
Objective: Deliver a stable, reflection-only MVP with clean architecture and no governance automation.

---

# 1. Purpose of Phase 1

Phase 1 exists to:

* Establish a stable Chrome extension foundation.
* Implement local browsing capture.
* Generate a deterministic reflection report.
* Implement the locked design system.
* Validate end-to-end usability.
* Preserve identity and privacy from day one.

This phase does NOT implement autonomous evolution.

---

# 2. Scope (What Must Be Built)

## A. Chrome Extension Skeleton

* Manifest v3
* Background service worker
* Content script
* Minimal permissions

## B. Local Data Capture

Capture and store locally:

* URL
* Domain
* Title
* Timestamp

Storage:

* IndexedDB (preferred)
* No external transmission

## C. Reflection Engine (Deterministic)

* Weekly summary aggregation
* Deterministic LLM call (temperature = 0)
* Fixed prompt template
* Summary only (no raw URLs sent)

Output must follow Reflection Invariant.

## D. Report UI

* Built using Design System v1
* Calm, neutral layout
* Single report view
* No variant toggles yet
* No advisory elements
* No behavioral scoring

## E. Performance Baseline

* Startup time measured
* Memory footprint estimated
* No blocking operations
* No polling loops

---

# 3. Explicit Non-Goals (Must NOT Be Built)

The following are prohibited in Phase 1:

* No advisory suggestions
* No exposure engine
* No perspective clustering
* No semantic diff automation
* No dual-model classification
* No governance proposal system
* No experiment scheduler
* No gamification
* No scoring systems
* No ideological labeling
* No telemetry infrastructure beyond basic debug logging

If uncertain whether something belongs in scope, default to exclusion.

---

# 4. Constraints

## Identity Constraints

All output must comply with:

* Reflection Invariant
* Non-prescriptive language
* Neutral tone

## Privacy Constraints

* No raw browsing data leaves device.
* No third-party analytics.
* No hidden logging.

## Design Constraints

* Must strictly follow DESIGN_SYSTEM_V1.md.
* No new UI tokens.
* No decorative elements.

## Architecture Constraints

* Keep architecture simple.
* Avoid premature abstraction.
* Avoid modular overengineering.
* Avoid building for hypothetical Phase 3+ needs.

---

# 5. Definition of Done (Phase 1)

Phase 1 is complete when:

1. Extension installs cleanly.
2. Browsing metadata is stored locally.
3. A weekly reflection report can be generated end-to-end.
4. Report respects neutrality constraints.
5. UI adheres fully to design system.
6. Performance remains lightweight.
7. No advisory or exposure logic exists.

No additional features required.

---

# 6. Success Criteria

Internal validation only.

Success is defined as:

* Reflection feels neutral and coherent.
* No moral framing appears.
* UI feels calm and consistent.
* No visible performance degradation.
* Privacy boundaries are intact.

No external users yet.

---

# 7. Stop Condition

Stop building Phase 1 when:

* Reflection works.
* UI is stable.
* Architecture is clean.
* No governance automation exists.
* You are tempted to “add just one more thing.”

That temptation indicates phase boundary has been reached.

---

# 8. Handoff Rule for Agents

Agents must:

* Build only within this envelope.
* Not anticipate future phases.
* Not expand scope for robustness.
* Not introduce optimization features.
* Not introduce advisory logic.
* Not introduce exposure mechanics.

If an improvement idea emerges, document it separately and do not implement.

---

# 9. Escalation Protocol

If implementation ambiguity arises:

1. Reference Full Charter.
2. Default to simplest compliant solution.
3. Do not invent new system layers.
4. Escalate to operator if architectural change is required.

---

# 10. Phase Transition Rule

Phase 1 transitions to Phase 2 only when:

* Reflection MVP feels legitimate.
* Architecture does not feel fragile.
* Identity boundaries are clean.
* There is no hidden complexity.

No autonomy introduced before Phase 2.

---

End of Phase 1 Build Envelope
