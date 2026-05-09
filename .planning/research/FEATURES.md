# Features Research — PR Review Copilot

**Mode:** Ecosystem — Features dimension
**Confidence:** HIGH

---

## Key Findings

- **Noise is the #1 failure mode for AI review tools.** Industry data shows 60–80% of AI code review comments are noise. CodeRabbit and Copilot both suffer from this. The type-adaptive, signal-focused design of this tool is a direct competitive response — not building a "me too" comment wall.

- **Type-adaptive UI is a genuine white space.** Neither CodeRabbit nor GitHub Copilot PR Review renders different UI per PR type. They render the same generic comment thread regardless of whether the PR is a security change or a refactor. The core mechanic here is differentiated.

- **No write-back is a trust differentiator, not a limitation.** The industry consensus is that auto-posting AI comments to GitHub is the top reason developers turn these tools off. Framing this as a deliberate choice builds trust.

- **Classification rationale must be surfaced.** Users will not trust a black-box classifier. The LLM structured output must include a `classification_reason` field, and it must be displayed prominently. This is table stakes for trust, not a v2 nice-to-have.

- **Per-type card contents are well-defined by domain practice.** Security reviews map to OWASP checklists. Refactor reviews focus on dependency impact and test coverage delta. API change reviews center on breaking change detection. Bug fix reviews need root cause + regression risk. These are not arbitrary — they match what senior reviewers actually look for.

---

## Table Stakes (must have or product feels broken)

- PR URL input, GitHub fetch, metadata display
- LLM classification surfaced to user WITH rationale (black-box = low trust)
- Loading states and error handling for bad URLs / private repos
- All four per-type cards with complete content (see below)

### Per-Type Card Requirements

**Security card must have:**
- Risk flags
- Affected auth paths
- Hardcoded secrets indicator
- Interactive OWASP-aligned checklist
- Severity rating (HIGH / MEDIUM / LOW)

**Refactor card must have:**
- Files moved/renamed
- Dependency impact
- Test coverage delta
- Behavior preservation note
- PR scope assessment

**API change card must have:**
- Before/after endpoint surface
- Breaking change flags
- Versioning assessment
- Downstream consumers note
- HTTP method/status changes

**Bug fix card must have:**
- Root cause summary
- Blast radius / affected area
- Fix adequacy signal
- Regression risk flag
- Missing test coverage warning

---

## Differentiators (competitive advantage)

- Type-adaptive UI is the core differentiator — purpose-built interface per PR type
- Single LLM call for classify + extract (faster, coherent, cheaper than multi-pass tools)
- No write-back to GitHub (deliberate trust and noise-reduction signal)
- Signal-over-noise design constraint: 5–7 high-signal items per card, not 40 comments
- Reviewer-centric IA (not author-prep mode)
- Classification rationale visible ("classified as Security because auth middleware modified")

---

## Anti-Features (deliberately excluded from v1)

- Auto-post comments to GitHub — #1 reason developers disable AI review tools
- Line-by-line inline diff annotation — creates alert fatigue, 72-comment PRs
- Multi-type composite classification — doubles complexity, signals an oversized PR
- Score / grade the PR — scores get gamed, create conflict
- Custom rules system — configuration UX is a product in itself; defer to v2
- PR author prep mode — second audience = second IA; reviewer-first for v1
- Suggested fixes / auto-remediate — false confidence, not the reviewer's job

---

## Feature Dependencies (critical for roadmap ordering)

- GitHub PR fetch must come before LLM call (diff is the LLM input)
- LLM structured output schema must be defined before any card can render (schema validates → UI dispatches)
- Security checklist is local state only — zero persistence required
- Diff rendering is enhancement, not gate — cards render without it

---

## Scope Tiers

**MVP (v1 — demo-ready):**
All four type cards + classification display + loading/error states. This is the minimum to run the demo (3 PR URLs → 3 distinct UIs).

**v1.x (post-validation):**
Copy-to-clipboard for findings, raw diff viewer (collapsed), multi-file breakdown within cards, PR size warning.

**v2+ (defer):**
Custom team rules, session history, author mode, private repo OAuth support.

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Table stakes features | HIGH | Competitor analysis comprehensive; OWASP standards authoritative; community consensus clear |
| Per-type card content | HIGH | Domain best practices for security/refactor/API/bugfix review are well-documented and stable |
| Differentiators | HIGH | Competitor feature gap verified across CodeRabbit, Copilot, Qodo — none do type-adaptive UI |
| Anti-features | HIGH | "Noise is the #1 problem" consistent across multiple independent sources |
| CopilotKit rendering mechanics | MEDIUM | Docs confirm useCopilotAction render prop pattern works; edge cases around structured output dispatch need implementation verification |

---

## Open Questions

- Does CopilotKit's generative UI require a chat interface as the trigger, or can it render components triggered directly by a URL submit + LLM call?
- GitHub diff size limits: very large PRs (>10k lines) may hit API response limits — what's the truncation behavior?
- How should the UI handle PRs ambiguous between types (e.g., a security fix that's also a refactor)? Structured output should include `confidence` and `secondary_type` fields.

---

## Roadmap Implications

Phase ordering follows feature dependencies:

1. **GitHub API integration first** — everything gates on fetching PR data
2. **LLM structured output schema second** — the schema is a contract between the LLM call and all four card components; define it before building any card
3. **Security card first among card types** — highest visual impact, richest content, best demo story
4. **Refactor + API cards second** — share structural patterns with Security card
5. **Bug fix card last** — simplest card; serves as validation phase before demo
