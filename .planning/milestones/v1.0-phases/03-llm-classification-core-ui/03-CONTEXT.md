# Phase 3: LLM Classification + Core UI - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss for time-boxed run)

<domain>
## Phase Boundary

Users can paste a GitHub PR URL and see a classified result rendered in the browser — loading skeleton within 100ms, Claude classifies the diff into exactly one of four types via structured output, and error states surface for private repos and oversized PRs.

In scope:
- Front-end input field (URL paste + submit) — satisfies FETCH-01's UI surface
- Loading skeleton visible within 100ms (FETCH-03)
- Private-repo error message (FETCH-04)
- PR size warning card (FETCH-05) — wired to Phase 2's `status: 'size-exceeded'` response
- Extend Phase 2's `AnalyzeResponse` discriminated union with `'private-repo' | 'not-found' | 'invalid-url'` members (per CONTEXT D-05 deferred)
- Anthropic SDK structured-output call → returns `prType: 'security' | 'refactor' | 'api-change' | 'bug-fix'` plus per-type signal payload (CLASS-01)
- `PRResultPanel` component dispatches on `status` and `prType` to placeholder card components for all four types (no unhandled render path)
- Zod schema for `PRAnalysis` with discriminated union on `prType`

Out of scope:
- Fully-populated card content (Phase 4)
- `useCopilotAction` hook registration (Phase 4)
- Demo polish / multi-PR walkthrough (Phase 4)

</domain>

<decisions>
## Implementation Decisions

### Carried forward from Phase 2 (locked)
- `lib/types.ts` is the contract — extend it, don't replace.
- `app/api/analyze-pr/route.ts` already does fetch + size gate. Phase 3 extends the same route with: private-repo detection (catch 401/404 from `pulls.get`) and the LLM classification call.
- Server-only env access via `import "@/lib/server-only"` — applies to `ANTHROPIC_API_KEY` access too.
- Status discriminator stays `'ok' | 'size-exceeded' | 'private-repo' | 'not-found' | 'invalid-url'`. The `'ok'` member now also carries `prType` + `signals`.

### Anthropic SDK integration
- Install `@anthropic-ai/sdk@0.95.x` (per CLAUDE.md spec). Pin exact version like Phase 1/2.
- Use Anthropic's structured outputs (beta `structured-outputs-2025-11-13` or current GA equivalent — researcher should verify at install time).
- Single Claude call: input = PR metadata + diff (truncated if needed), output = `{prType, signals}` validated by Zod against the discriminated union.
- Model: `claude-haiku-4-5-20251001` for classification (fast, sufficient for diff classification). Defer Sonnet/Opus to v2 if latency permits.
- Diff size cap for the LLM input: send up to ~80k tokens of patch content. If the post-size-gate diff exceeds this, truncate (keep filenames + first N lines per file). Phase 2's gate (300 files / 20k lines) already excludes the worst cases.

### CopilotKit boundary
- Phase 3 does NOT use `useCopilotAction` yet — that's Phase 4. The classification call goes through the standard Next.js Route Handler at `/api/analyze-pr`, NOT through the CopilotKit runtime endpoint. CopilotKit runtime is for chat/agent flows; classification is a single request/response that doesn't fit that mental model.
- The home page (`app/page.tsx`) wires a Server Action or client-side `fetch` to `/api/analyze-pr`. Use a client component with `useState` for the URL input and result.

### Loading skeleton (FETCH-03)
- Skeleton renders within 100ms of submit. Use `useTransition` or `isPending` from a form action. Tailwind animate-pulse blocks.
- Skeleton shape: title placeholder + 3 card-shaped boxes — matches the eventual card layout.

### Error states
- `'private-repo'` → render `PrivateRepoCard` with message "This looks like a private repo — a GitHub token with access is required" (FETCH-04 verbatim).
- `'not-found'` → render `NotFoundCard` ("PR not found or never existed").
- `'invalid-url'` (Phase 2 returns 400 here, but client also pre-validates and shows inline error before fetching).
- `'size-exceeded'` → render `PRSizeWarningCard` with `fileCount` + `lineCount` displayed (FETCH-05).

### Card dispatcher (`PRResultPanel`)
- Single `switch` on `status` first, then nested `switch` on `prType` when `status === 'ok'`.
- Each `prType` maps to a placeholder card: `<SecurityCardPlaceholder />`, `<RefactorCardPlaceholder />`, `<ApiChangeCardPlaceholder />`, `<BugFixCardPlaceholder />`. Phase 4 fills these in.
- Add a default branch in the `prType` switch that renders an `UnclassifiedCard` so an unexpected `prType` value doesn't render nothing (REQUIREMENTS.md flagged this as a Phase 3 must-have).

### Claude's Discretion
- Layout of the input form (single full-width input vs centered card) — choose what looks reasonable; demo polish lives in Phase 4.
- Whether to use a Server Action vs client `fetch()` for submit — pick whichever is cleaner with Next.js 16 App Router.
- shadcn/ui usage — install Card, Skeleton, Alert primitives (per CLAUDE.md). Use them in the placeholder cards.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked decisions + scope
- `.planning/REQUIREMENTS.md` §FETCH-03, §FETCH-04, §FETCH-05, §CLASS-01 — the four requirements this phase satisfies.
- `.planning/ROADMAP.md` Phase 3 — 5 success criteria the verifier will check.
- `.planning/PROJECT.md` §"Out of Scope" — no GitHub write-back, no auth UX, no session history.

### Tech stack constraints
- `CLAUDE.md` §"Recommended Stack" — `@anthropic-ai/sdk@0.95.x`, `zod@4.4.x` (already installed), `shadcn/ui` via CLI.
- `CLAUDE.md` §"What NOT to Use" — no `NEXT_PUBLIC_ANTHROPIC_API_KEY`; no `@copilotkit/react-ui` (custom cards only); no Vercel AI SDK.
- `CLAUDE.md` §"LLM Classification Architecture" — single classify+extract Claude call returning structured output.

### Phase 2 carryover (must read — Phase 3 extends these)
- `.planning/phases/02-type-system-github-api-integration/02-CONTEXT.md` — D-05 (status union extension to private-repo/not-found is for THIS phase), D-13 (Phase 3 owns 401/404 mapping).
- `lib/types.ts` — current type contract. Phase 3 ADDS members to `AnalyzeResponse` and adds `prType` + `signals` to the `'ok'` member.
- `app/api/analyze-pr/route.ts` — current route. Phase 3 ADDS Anthropic call and private-repo error path.
- `lib/server-only.ts` — guard. Apply to any new module reading `ANTHROPIC_API_KEY`.

### Open questions for the researcher
- Verify Anthropic SDK structured-outputs API: is it stable GA in 0.95.x, or still behind a `betas: ["structured-outputs-2025-11-13"]` flag? Phase 2 STATE.md flagged this as a spike concern.
- Verify Next.js 16 + React 19 Server Actions vs client `fetch` patterns for forms — confirm which renders the loading skeleton within 100ms.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/types.ts` — extend the existing `AnalyzeResponse` union; do not duplicate.
- `app/api/analyze-pr/route.ts` — extend, don't fork.
- `lib/server-only.ts` — apply to any new module reading `ANTHROPIC_API_KEY`.
- `app/providers.tsx` — already wraps `<CopilotKit>`; Phase 3 stays inside that boundary even though it doesn't yet use CopilotKit hooks.

### Established Patterns
- Server-only env access enforced. Pinned versions (no `^`/`~`).
- App Router conventions: Route Handlers in `app/api/*/route.ts`, Server Components by default, `"use client"` only when needed.

### Integration Points
- New file: `lib/anthropic.ts` — Anthropic client factory (server-only).
- New files: `components/PRResultPanel.tsx` (client), `components/cards/{Security,Refactor,ApiChange,BugFix,Unclassified,PrivateRepo,NotFound,PRSizeWarning}Card.tsx` (placeholders).
- Modified: `app/page.tsx` — add input form + dispatcher mount; `app/api/analyze-pr/route.ts` — add Anthropic call + private-repo branch; `lib/types.ts` — extend union, add `prType` + signal types.

</code_context>

<specifics>
## Specific Ideas

- The demo flow is: paste URL → 100ms skeleton → ~3-8s pipeline → card. The 100ms target requires the skeleton to render BEFORE the fetch resolves (use `useTransition` or React Suspense, not awaiting the promise).
- Three test PRs for verification: one small public bug-fix PR (proves end-to-end classification), one private repo URL (proves FETCH-04), one oversized public PR (proves FETCH-05 warning card renders, not error toast).

</specifics>

<deferred>
## Deferred Ideas

- Per-card-type signal payload structure — Phase 3 defines the schema (Zod-validated), Phase 4 populates the signal *content* and renders it.
- `classification_reason` field — REQUIREMENTS.md flagged as v1.1 candidate. Phase 3 SHOULD include the field in the LLM structured output schema even if not displayed (adding later requires schema migration).
- Confidence score + secondary `prType` for ambiguous PRs — v2.

</deferred>

---

*Phase: 03-llm-classification-core-ui*
*Context auto-generated: 2026-05-09 (skip_discuss path)*
