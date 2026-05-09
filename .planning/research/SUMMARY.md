# Project Research Summary

**Project:** PR Review Copilot
**Domain:** AI-powered PR review tool — Next.js + CopilotKit + GitHub API + Claude LLM
**Researched:** 2026-05-09
**Confidence:** HIGH

## Executive Summary

PR Review Copilot is a reviewer-centric AI tool that analyzes GitHub PRs and renders a purpose-built review interface based on the PR's classification (security, refactor, API change, or bug fix). The core insight from research is that existing tools (CodeRabbit, GitHub Copilot PR Review) fail by generating generic comment walls — 60–80% of which are noise. The differentiated bet here is type-adaptive UI: the same URL input yields three visually distinct card interfaces, each structured around what a domain expert actually checks for that PR type. No competitor does this today.

The recommended architecture is a Next.js App Router application with a single server-side orchestration route (`/api/analyze-pr`) that fetches the GitHub diff and runs a Claude structured-output classification in one round trip. The classification result drives a static generative UI pattern via CopilotKit's `useCopilotAction` hook, which maps the returned `prType` to a pre-built card component. The LLM is never invoked client-side; all API keys remain server-only. This is not an agentic or conversational product for v1 — it is a deterministic classify-then-render pipeline with an optional chat layer via CopilotKit.

The two highest risks are both addressable in scaffolding and prompt design: (1) GitHub token exposure via `NEXT_PUBLIC_` env var prefix — a one-way door that cannot be retrofitted; (2) LLM classification false positives due to zero-shot prompting, which degrades to ~22% precision on security detection without few-shot examples. Both have clear prevention strategies. A third structural risk is the schema contract between the LLM output and the component dispatcher — a mismatch string (`"security_review"` vs `"security"`) silently renders nothing. The fix is a shared Zod schema imported by both the prompt builder and the dispatcher, established before any card component is built.

---

## Key Findings

### Recommended Stack

The project runs cleanly on a Next.js 16 App Router scaffold with TypeScript and Tailwind v4 (all defaults from `create-next-app@latest`). CopilotKit is split across two packages: `@copilotkit/react-core` for the client-side provider and hooks, and `@copilotkit/runtime` for the server-side endpoint. The Anthropic SDK (`@anthropic-ai/sdk`) is passed directly into CopilotKit's `AnthropicAdapter` — the Vercel AI SDK is not needed and adds no value. GitHub interaction uses `@octokit/rest` server-side with `mediaType: { format: "diff" }`. Zod validates all structured LLM output. shadcn/ui (card, badge, checkbox) provides the accessible UI primitives.

**Core technologies:**
- Next.js 16 (App Router): Full-stack framework — CopilotKit's native environment; Route Handlers host both the CopilotKit runtime and the analyze endpoint
- @copilotkit/react-core 1.56.x + @copilotkit/runtime 1.57.x: Generative UI framework — `useCopilotAction` render hook drives type-adaptive card dispatch
- @anthropic-ai/sdk 0.95.x: LLM client — passed into `AnthropicAdapter`; also used directly in `/api/analyze-pr` for structured-output classification
- @octokit/rest 22.x: GitHub API client — server-side only; typed diff fetch with pagination support
- Zod 4.x: Schema validation — defines the shared contract between LLM output and card dispatcher; blocks type mismatches at parse time
- shadcn/ui (card, badge, checkbox): UI primitives — copy-in components for the four review cards

**Do not use:** `NEXT_PUBLIC_*` for any API key; `@copilotkit/react-ui` (chat sidebar not needed for v1); `ai` (Vercel AI SDK) — redundant; LangGraph — overkill; `next-auth` — stateless demo, no user accounts.

### Expected Features

The competitive gap is real: no existing tool renders type-adaptive UI. The product is reviewer-centric (not author-prep), signal-focused (5–7 high-value signals per card, not 40 comments), and deliberately excludes write-back to GitHub — framed as a trust feature, not a limitation.

**Must have (table stakes):**
- PR URL input + GitHub fetch + PR metadata display — the entire pipeline gates on this
- LLM classification WITH visible rationale — black-box classification destroys trust; `classification_reason` is not a v2 feature
- Loading states and error handling — 3–8 second round trip; users assume broken app without feedback
- All four type-specific cards with complete domain-appropriate content (security, refactor, API change, bug fix)
- Security card: risk flags, OWASP-aligned interactive checklist, severity rating, hardcoded secrets indicator
- Refactor card: files moved, dependency impact, test coverage delta, behavior preservation note
- API change card: before/after endpoint surface, breaking change flags, versioning assessment
- Bug fix card: root cause, blast radius, fix adequacy signal, regression risk, missing test warning

**Should have (competitive advantage):**
- Type-adaptive UI as the core differentiator — purpose-built interface per PR type
- Single LLM call for classify + extract (faster and cheaper than multi-pass tools)
- Classification rationale prominently displayed ("classified as Security because auth middleware modified")
- Signal-over-noise constraint: 5–7 items per card, not exhaustive comment lists

**Defer (v2+):**
- Auto-post comments to GitHub — #1 reason developers disable AI review tools
- Line-by-line inline diff annotation — creates alert fatigue
- Custom team rules system — configuration UX is a separate product
- Session history and author prep mode — second audience requires second IA
- Private repo OAuth support — token in env var is sufficient for demo

### Architecture Approach

The architecture is a single-page, server-orchestrated classify-then-render pipeline. A Next.js Route Handler at `/api/analyze-pr` is the sole server-side orchestration point: it fetches the PR diff via Octokit, calls Claude with forced tool use for structured output, and returns a `PRAnalysis` object. The client stores this result in React state and passes `prType` to a `PRResultPanel` component, which uses a `CARD_MAP` to render the matching review card. CopilotKit's runtime endpoint runs in parallel but is not in the primary analysis flow — it supports optional chat interaction only. One page, conditional rendering — not separate routes.

**Major components:**
1. `/api/analyze-pr/route.ts` — GitHub diff fetch + Claude structured classification; the entire pipeline lives here
2. `lib/types.ts` — Shared `PRType`, `PRAnalysis`, and four signal shape types; the schema contract all other code imports
3. `PRResultPanel` + `CARD_MAP` — Conditional dispatcher that maps `prType` to card component
4. Four card components (SecurityReviewCard, RefactorImpactCard, APIChangeCard, BugFixCard) — Each testable with mock data independently
5. `app/api/copilotkit/route.ts` + `providers.tsx` — CopilotKit runtime wiring for optional chat layer

**Build order enforced by architecture:** types → server route → CopilotKit wiring → URL input form → PRResultPanel shell → four cards → useCopilotAction registration. Each step is independently testable before the next begins.

### Critical Pitfalls

1. **GitHub token in `NEXT_PUBLIC_` env var** — Cannot be retrofitted; baked into JS bundle at build time. Use `GITHUB_TOKEN` (no prefix) server-only from day one.

2. **Schema mismatch between LLM output and card dispatcher** — `"security_review"` vs `"security"` renders nothing; no error thrown. Define Zod schema once in `lib/types.ts`, import in both prompt builder and dispatcher. Always include a fallback card branch.

3. **GitHub diff truncation on large PRs** — The `/pulls/{id}` diff endpoint hard-stops at 20,000 lines or 1 MB; PRs with > 300 files return a 406. Use `/pulls/{id}/files` with pagination instead. Surface a size warning card for PRs exceeding limits.

4. **CopilotKit `<CopilotKit>` wrapper in a Server Component** — App Router defaults to Server Components; React context is client-only. Create a `providers.tsx` file with `"use client"` directive; never put `<CopilotKit>` directly in `layout.tsx`.

5. **Zero-shot classification false positives** — Security detection precision is ~22% zero-shot. Include 3–5 few-shot examples per type in system prompt. Maintain a 12-PR ground-truth fixture for prompt regression testing.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Project Scaffolding + Security Foundation
**Rationale:** Three scaffolding pitfalls (PAT auth, providers.tsx client boundary, token exposure) cannot be retrofitted. Token exposure in particular is a one-way door — retrofitting means rebuilding. These must be correct from commit one.
**Delivers:** Running Next.js app with correct env var setup, `providers.tsx` client boundary, CopilotKit runtime endpoint wired, `.env.local` template with `GITHUB_TOKEN` and `ANTHROPIC_API_KEY` documented as server-only.
**Addresses:** App shell, routing, loading skeleton placeholder
**Avoids:** Pitfalls #2 (PAT auth), #5 (providers.tsx), #8 (token exposure) — all irreversible if deferred

### Phase 2: Type System + GitHub API Integration
**Rationale:** Everything downstream gates on having a valid diff in hand. The shared type system (`lib/types.ts`) must be defined before any LLM or card work begins — it is the contract all other modules import. GitHub integration with proper pagination avoids the silent truncation pitfall.
**Delivers:** `lib/types.ts` with `PRType`, `PRAnalysis`, and four signal shapes; `/api/analyze-pr` skeleton with Octokit fetching PR metadata and diff via paginated `/files` endpoint; curl-testable before any UI work.
**Uses:** @octokit/rest 22.x, Zod 4.x, TypeScript
**Avoids:** Pitfalls #1 (diff truncation), #7 (abort controller), #10 (race condition)

### Phase 3: LLM Classification + Structured Output Schema
**Rationale:** The Zod schema for the LLM response is a shared contract. It must be finalized before any card component is built, because card props are derived from the schema. Classification quality depends on few-shot examples — the prompt must include them from the start, not as a polish step.
**Delivers:** Complete `/api/analyze-pr` route with Claude structured-output call; Zod-validated response; `classification_reason` and `confidence` fields in response; few-shot examples for all 4 types in system prompt; 12-PR test fixture for prompt regression testing.
**Uses:** @anthropic-ai/sdk 0.95.x, Zod 4.x, claude-sonnet-4-5 with structured outputs beta
**Avoids:** Pitfalls #3 (context window / lost-in-middle), #4 (schema mismatch), #9 (zero-shot false positives)

### Phase 4: Core UI — URL Form + PRResultPanel + Card Shell
**Rationale:** With the server route returning valid structured data, the UI can be wired end-to-end with placeholder cards. This proves the full pipeline works (form → fetch → classification → dispatch) before investing in card content.
**Delivers:** URL input form with validation; loading skeleton visible within 100ms of submit; PRResultPanel with CARD_MAP dispatcher; placeholder cards for all four types; error states for invalid URLs, private repos (401), and oversized PRs (> 300 files).
**Implements:** PRResultPanel + CARD_MAP architecture component
**Avoids:** UX pitfalls (no loading state, unhelpful 401 error message, stale data flash)

### Phase 5: Four Review Cards — Content + Interactivity
**Rationale:** Cards are independently testable with mock data. Build security first (highest visual impact, richest checklist content, best demo story). Refactor and API cards share structural patterns with security. Bug fix card is simplest and validates the pattern before demo.
**Delivers:** All four fully-populated cards: SecurityReviewCard (OWASP checklist as interactive local state, severity badge, risk flags); RefactorImpactCard; APIChangeCard; BugFixCard. Classification rationale displayed prominently on all cards.
**Uses:** shadcn/ui card, badge, checkbox; Tailwind v4
**Avoids:** Pitfall #6 (useCopilotAction render returns null — every branch returns ReactNode)

### Phase 6: CopilotKit Generative UI Hook + Demo Polish
**Rationale:** `useCopilotAction` registration is additive — it does not change the primary flow and can be wired after all four cards are proven correct. Demo polish rounds out the demo story.
**Delivers:** `useCopilotAction` registered with all four card types; optional chat sidebar for follow-on questions; "looks done but isn't" checklist fully verified.
**Uses:** @copilotkit/react-core useCopilotAction, render prop pattern
**Avoids:** Pitfall #6 (null render crash)

### Phase Ordering Rationale

- Security-first is non-negotiable: token exposure and CopilotKit client boundary errors touch every file and cannot be retrofitted.
- Type system before LLM before cards: the Zod schema is a shared contract. Building any card before the schema is final risks rebuilding props after schema changes.
- Server route before UI: the route is curl-testable, which catches classification bugs without React in the loop and shortens the debugging surface significantly.
- CopilotKit hook last: it is additive, not load-bearing for the primary flow. Keeping it late means the four cards are validated with real data before the hook wires them into CopilotKit's context.
- GitHub pagination pitfall must be addressed in Phase 2, not deferred: a silently truncated diff produces wrong classification with no visible error, corrupting all subsequent testing.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (LLM Classification):** CopilotKit's structured output support via `AnthropicAdapter` is unverified — may require bypassing the CopilotKit runtime for the classification call entirely. Whether `strict: true` on tool use is accessible through CopilotKit's abstraction layer needs a spike.
- **Phase 6 (CopilotKit Generative UI):** Whether `useCopilotAction` with the `render` property is still the recommended pattern for non-LangGraph setups in CopilotKit 1.56.x needs doc verification — the AG-UI protocol / `useAgent` may have superseded it.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Scaffolding):** create-next-app + providers.tsx client boundary is extensively documented; pitfall prevention is mechanical.
- **Phase 2 (GitHub API):** Octokit REST usage is stable and well-documented; pagination pattern is a standard REST pattern.
- **Phase 5 (Card Components):** shadcn/ui card primitives + Tailwind utility classes are well-documented; component structure is defined by domain research, not framework novelty.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core package versions verified via npm registry; CopilotKit + Anthropic SDK integration pattern confirmed against official docs; version compatibility table validated |
| Features | HIGH | Competitor analysis comprehensive across CodeRabbit, GitHub Copilot PR Review, Qodo; OWASP standards authoritative; per-type card content derived from established domain practice |
| Architecture | HIGH | Data flow is unambiguous; server-only LLM/GitHub calls are a hard constraint, not a preference; static generative UI pattern is the only viable CopilotKit pattern for pre-defined card sets |
| Pitfalls | HIGH | Confirmed via official GitHub API docs, CopilotKit GitHub issues (#1360, #2749, #2675), and Anthropic structured output docs |

**Overall confidence:** HIGH

### Gaps to Address

- **CopilotKit structured output compatibility:** Whether `AnthropicAdapter` passes through the `betas: ["structured-outputs-2025-11-13"]` header is unconfirmed. If not, the classification call must bypass CopilotKit's runtime entirely. The architecture already accommodates this split — validate with a spike in Phase 3.
- **Diff size truncation strategy:** No confirmed guardrail for Claude Sonnet 4.5's effective context window on large diffs. The two-pass strategy is recommended but needs implementation validation. Spike in Phase 2.
- **`useCopilotAction` render API stability:** Whether the `render` property is current API or deprecated in favor of AG-UI / `useAgent` needs doc verification before Phase 6 begins.
- **Ambiguous PR classification handling:** Structured output schema should include `confidence` and `secondary_type` fields; how to surface these in the UI is unresolved and should be decided in Phase 3 schema definition.

---

## Sources

### Primary (HIGH confidence)
- CopilotKit official docs + GitHub issues — CopilotKit runtime setup, useCopilotAction render prop, providers.tsx pattern, issues #1360, #2749, #2675
- Anthropic API docs — structured outputs beta header, claude-sonnet-4-5 model, forced tool call pattern
- GitHub REST API docs — `/pulls/{id}` diff limits (20k lines / 1MB / 300 files), `/pulls/{id}/files` pagination, PAT scopes
- npm registry — package versions for @copilotkit/react-core 1.56.x, @copilotkit/runtime 1.57.x, @anthropic-ai/sdk 0.95.x, @octokit/rest 22.x, Zod 4.4.x
- shadcn/ui docs — card, badge, checkbox component CLI installation

### Secondary (MEDIUM confidence)
- CodeRabbit, GitHub Copilot PR Review, Qodo feature analysis — competitor feature gap for type-adaptive UI verified by feature page inspection
- OWASP Top 10 / security review checklists — security card content requirements

### Tertiary (LOW confidence)
- Academic benchmarks — "22% zero-shot security detection precision" — directionally reliable; validate with own few-shot prompt testing
- Industry reports — "60–80% of AI review comments are noise" — community consensus; exact figure varies by source

---
*Research completed: 2026-05-09*
*Ready for roadmap: yes*
