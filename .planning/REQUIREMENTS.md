# Requirements — PR Review Copilot

**Version:** v1 (MVP — demo-ready)
**Scope decision date:** 2026-05-09

---

## v1 Requirements

### Input & Fetch

- [x] **FETCH-01**: User can paste a GitHub PR URL into an input field and trigger PR analysis
- [x] **FETCH-02**: App fetches PR metadata + diff from GitHub API (server-side, paginated `/files` endpoint)
- [x] **FETCH-03**: Loading skeleton is visible within 100ms of submit (pipeline takes 3–8 seconds)
- [x] **FETCH-04**: App shows a helpful error for private repos: "This looks like a private repo — a GitHub token with access is required"
- [x] **FETCH-05**: App shows a PR size warning card instead of attempting classification for PRs > 300 files or 20k diff lines

### Classification

- [x] **CLASS-01**: LLM classifies the PR into exactly one of four types (security / refactor / api-change / bug-fix) via a single structured output call

### Review Cards

- [x] **CARD-01**: Security PR renders a card with: risk flags, affected auth paths, OWASP-aligned interactive checklist, severity rating (HIGH / MEDIUM / LOW), hardcoded secrets indicator
- [x] **CARD-02**: Refactor PR renders a card with: files moved/renamed, dependency impact, test coverage delta, behavior preservation note, PR scope assessment
- [x] **CARD-03**: API change PR renders a card with: before/after endpoint surface, breaking change flags, versioning assessment, downstream consumers note, HTTP method/status changes
- [x] **CARD-04**: Bug fix PR renders a card with: root cause summary, blast radius/affected area, fix adequacy signal, regression risk flag, missing test coverage warning

---

## v2 Requirements (deferred)

- Classification rationale displayed ("Classified as Security because auth middleware modified") — **flagged as trust-critical by research; strong candidate for v1.1**
- Fallback card for unrecognized classification types — **flagged as crash risk; consider adding to v1**
- Confidence score + secondary PR type field for ambiguous PRs
- Copy-to-clipboard for card findings
- Raw diff viewer (collapsed)
- Multi-file breakdown within cards
- Private repo OAuth flow

---

## Out of Scope

- Write comments back to GitHub — #1 reason developers disable AI review tools; deliberate exclusion
- PR author prep mode — second audience = second IA; reviewer-first for v1
- More than 4 PR type classifications — complexity grows fast; 4 covers the demo archetypes
- Auto-post AI-generated review — excluded by design
- Session history / persistence — stateless URL-driven tool; no accounts
- Custom team rules system — configuration UX is a separate product
- Line-by-line inline diff annotation — creates alert fatigue

---

## Traceability

| Req ID | Phase | Status |
|--------|-------|--------|
| FETCH-01 | Phase 2 — Type System + GitHub API Integration | Complete |
| FETCH-02 | Phase 2 — Type System + GitHub API Integration | Complete |
| FETCH-03 | Phase 3 — LLM Classification + Core UI | Complete |
| FETCH-04 | Phase 3 — LLM Classification + Core UI | Complete |
| FETCH-05 | Phase 3 — LLM Classification + Core UI | Complete |
| CLASS-01 | Phase 3 — LLM Classification + Core UI | Complete |
| CARD-01 | Phase 4 — Four Review Cards + CopilotKit Hook | Complete |
| CARD-02 | Phase 4 — Four Review Cards + CopilotKit Hook | Complete |
| CARD-03 | Phase 4 — Four Review Cards + CopilotKit Hook | Complete |
| CARD-04 | Phase 4 — Four Review Cards + CopilotKit Hook | Complete |

---

## Notes

> **Classification rationale (v2 candidate):** Research found that black-box classification significantly degrades trust — users don't know *why* the tool chose "Security." This was excluded from v1 at the user's direction but is a strong candidate to pull into v1.1 before wider use. The field (`classification_reason`) should be included in the LLM structured output schema regardless, even if not displayed in v1 — adding it later requires a schema change.

> **Fallback card (risk flag):** Without a fallback card branch in the dispatcher, an unexpected `prType` value from the LLM renders nothing with no error thrown. Recommended: add a 5-line default branch to `CARD_MAP` even if it just shows "Unable to classify — review manually."
