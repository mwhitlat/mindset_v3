# Mindset – Phase 3 Build Envelope

Version: 1.0
Applies To: Weeks 7-8
Objective: Deliver replay-lite, exposure engine v1, sandbox mode, and density tests with strict neutrality and privacy constraints.

Roadmap Anchor: `/Users/matthewwhitlatch/mindset/mindset-v3/# 90-Day Build Roadmap.md` (Weeks 7-8 section).

---

# 1. Purpose of Phase 3

Phase 3 exists to:

* Add replay-lite for deterministic reflection comparison.
* Add exposure engine v1 with symmetric adjacent perspectives.
* Add sandbox mode for safe variant switching.
* Validate UI density limits under added sections.

This phase does NOT introduce autonomous optimization loops.

---

# 2. Scope (What Must Be Built)

## A. Replay Lite

Implement lightweight replay capability:

* Snapshot weekly summary JSON.
* Re-run local deterministic reflection from snapshot input.
* Provide text diff output between baseline reflection and replay reflection.

No timeline simulation. No scenario generator.

## B. Exposure Engine v1

Implement minimal symmetric exposure suggestions:

* Define adjacent perspectives via simple deterministic domain-tag mapping.
* Surface adjacent sources symmetrically.
* Use neutral framing only.

Exposure output must:

* Avoid ideological ranking.
* Avoid corrective intent language.
* Avoid emotional intensity bias.

## C. Sandbox Mode

Implement sandbox mode for controlled comparison:

* Manual variant switcher (operator-facing only).
* Variant impact shown only in structure/density outputs.
* No hidden autonomous toggles.

Sandbox mode must be clearly labeled and reversible.

## D. Density Tests

Implement density validation checks:

* Verify content additions do not create scroll overload.
* Enforce section/content tradeoff rule.
* Keep charts and text blocks within current design system constraints.

No decorative UI expansion.

---

# 3. Explicit Non-Goals (Must NOT Be Built)

The following are prohibited in Phase 3:

* No autonomous governance automation.
* No experiment scheduler.
* No reinforcement/optimization loops.
* No behavioral scoring or nudging.
* No third-party analytics.
* No hidden telemetry.
* No expanded permission scope without operator approval.

If uncertain, default to exclusion.

---

# 4. Constraints

## Identity Constraints

All user-facing output must remain:

* observational
* descriptive
* neutral
* non-prescriptive

Exposure framing must present options, not directives.

## Privacy Constraints

* Browsing data remains local.
* No raw URLs transmitted externally.
* Replay and exposure inputs remain local artifacts.

## Design Constraints

* Follow Design System v1.
* Keep static charts and neutral typography.
* Do not introduce decorative components.

## Architecture Constraints

* Extend Phase 2 baseline directly.
* Use deterministic, inspectable logic.
* Avoid abstractions for later autonomous phases.

---

# 5. Definition of Done (Phase 3)

Phase 3 is complete when:

1. Replay-lite snapshots can be generated and replayed deterministically.
2. Text diff output is available for replay comparisons.
3. Exposure engine v1 surfaces symmetric adjacent perspective options.
4. Sandbox mode supports manual variant switching and reversal.
5. Density tests pass for added sections and layouts.
6. Neutrality/privacy/performance constraints remain intact.
7. No prohibited optimization or advisory logic has been added.

No additional features required.

---

# 6. Success Criteria

Trusted-user validation (10-15 users).

Success is defined as:

* Replay comparisons are understandable and stable.
* Exposure suggestions feel symmetric and non-directive.
* Sandbox mode is usable and safe.
* UI remains calm and readable under density constraints.
* No privacy or trust regressions are observed.

---

# 7. Stop Condition

Stop Phase 3 when:

* Replay-lite is stable.
* Exposure engine v1 outputs are symmetric and neutral.
* Sandbox mode and density checks are stable.
* No additional phase-3-scope items remain.

Do not start calibration/monitoring work from Weeks 9-12 inside this envelope.

---

# 8. Handoff Rule for Agents

Agents must:

* Build only within this envelope.
* Keep deterministic behavior explicit and testable.
* Avoid introducing phase-4 infrastructure prematurely.
* Escalate irreversible architecture decisions.

If new ideas exceed scope, document and defer.

---

# 9. Escalation Protocol

Escalate only when:

1. Symmetry rules conflict with deterministic implementation constraints.
2. Privacy/performance invariants are at risk.
3. Permission expansion is required.

Escalations must include:

* concise issue summary
* 2 concrete options
* recommended option

---

# 10. Phase Transition Rule

Phase 3 transitions to Phase 4 only when:

* Replay, exposure, sandbox, and density features are stable in trusted-user testing.
* Identity and privacy boundaries remain clean.
* No hidden complexity has been introduced.

No broad calibration rollouts before this transition.

---

# 11. Roadmap Continuity Rule

At phase closeout, the team must create the next phase build envelope before beginning new implementation work.

Requirements for the next envelope:

1. Must explicitly map to the corresponding section in `/Users/matthewwhitlatch/mindset/mindset-v3/# 90-Day Build Roadmap.md`.
2. Must define scope, non-goals, constraints, DoD, and stop condition in the same envelope format.
3. Must be committed with phase closeout artifacts (`PHASE*_DONE.md` and `BUILD_STATE.md` update).

This continuity step is mandatory to prevent scope drift between phases.

---

End of Phase 3 Build Envelope
