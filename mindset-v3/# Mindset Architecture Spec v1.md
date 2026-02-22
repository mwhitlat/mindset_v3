# Mindset Architecture Spec v1.0

---

## 1. Platform

Chrome Extension (Manifest v3)

Components:

* Background service worker
* Content script (URL + metadata capture)
* Local IndexedDB storage
* Reflection engine (API-based LLM)
* UI panel (fixed design system)

---

## 2. Data Flow

1. Capture:

   * URL
   * Title
   * Timestamp
   * Domain

2. Store locally.

3. Weekly summary generation:

   * Aggregate browsing distribution
   * Send summary (not raw URLs) to LLM
   * Deterministic prompt (temperature = 0)

4. Render reflection report.

---

## 3. Exposure Engine (v1)

* Define “adjacent perspective” via domain clustering or content tags.
* Surface symmetrical alternative domains.
* No ranking by moral valence.
* No behavioral scoring.

---

## 4. Governance Lite (Phase 6A)

* Structural rule checks (hard-coded)
* Proposal JSON logging
* Manual operator review toggle
* Rollback mechanism
* Sandbox mode (variant switcher)

No advanced semantic diff automation in v1.

---

## 5. Replay Lite

* Snapshot browsing summary JSON
* Re-run reflection prompt
* Text diff comparison only

No time simulation required.

---

## 6. Privacy

* No raw browsing export.
* Optional aggregated telemetry only.
* Clear permission minimization.

---

## 7. Performance Targets

Startup: < 200ms overhead
No continuous polling
Memory minimal
No blocking operations

---

End of v1.0
