# Symmetry Audit

Date: 2026-02-25
Phase: Maturity Phase 5
Ruleset Focus: Exposure symmetry deterministic balancing

## 1. Test Sample Sets

### Sample Set A (mixed tags)

Input `topDomains`:
- `news.example.com` (general_news)
- `finance.example.com` (finance)
- `reddit.com` (community)
- `youtube.com` (video)

### Sample Set B (technology-heavy)

Input `topDomains`:
- `github.com` (technology)
- `tech.example.com` (technology)
- `verge.example.com` (technology)
- `news.example.com` (general_news)

## 2. Expected Symmetry Behavior

- Output rows are sorted deterministically by `sourceDomain`.
- Each row returns exactly 3 suggestions (balanced count target).
- Suggestions are deterministic for the same input and ruleset version.
- Suggestions exclude the source domain when overlap occurs.

## 3. Observed Behavior

- Automated run validates deterministic repeated output and fixed count=3 using Sample Set A.
- Existing exposure checks continue passing for baseline behavior.
- Ordering regression check confirms lexical source-domain ordering.

## 4. Determinism Confirmation

- Smoke check `Keeps exposure symmetry deterministic and count-balanced` compares two consecutive responses.
- Result confirmed stable with exact payload equality.

## 5. Accepted Edge-Case Limitations

- If configured adjacent-domain pools are reduced below target count in future edits, fallback currently uses default domain pool to preserve count balance.
- Suggestions are domain-level only; no semantic article-level balancing is implemented in this phase.
