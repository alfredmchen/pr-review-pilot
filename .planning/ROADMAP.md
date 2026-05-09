# Roadmap: PR Review Copilot

## Overview

Four phases deliver a working demo: scaffold the app correctly from day one (security-first), wire GitHub API and shared types, build the classify-then-render pipeline with full UI, and finally populate all four type-specific review cards. The architecture is a straight pipeline — paste URL → fetch diff → classify → render card — and each phase proves the pipeline up to that point before the next begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Scaffolding + Security Foundation** - Running Next.js app with correct env var setup, CopilotKit runtime wired, and `providers.tsx` client boundary in place — security pitfalls blocked from commit one
- [ ] **Phase 2: Type System + GitHub API Integration** - Shared `lib/types.ts` contract and `/api/analyze-pr` skeleton curl-testable with Octokit pagination
- [ ] **Phase 3: LLM Classification + Core UI** - End-to-end pipeline proven: URL input → GitHub fetch → Claude structured output → PRResultPanel dispatch → error and loading states
- [ ] **Phase 4: Four Review Cards + CopilotKit Hook** - All four fully-populated review cards and `useCopilotAction` generative UI hook registered; demo-ready

## Phase Details

### Phase 1: Scaffolding + Security Foundation
**Goal**: A running Next.js app with the correct security posture established — API keys server-only, `providers.tsx` client boundary correct, CopilotKit runtime endpoint live — so no pitfall can be introduced by subsequent phases
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: (none — foundational; enables all downstream requirements)
**Success Criteria** (what must be TRUE):
  1. `npm run dev` starts the app with no errors and the home page renders in the browser
  2. `GITHUB_TOKEN` and `ANTHROPIC_API_KEY` exist only in server-only env vars; no `NEXT_PUBLIC_` prefix is used for any secret
  3. `providers.tsx` carries a `"use client"` directive and wraps `<CopilotKit>` — the app layout does not import it as a Server Component
  4. The CopilotKit runtime endpoint responds to a GET/POST at `/api/copilotkit`
**Plans**: 1 plan
  - [x] 01-01-PLAN.md — Walking Skeleton: scaffold Next.js + lock secrets + wire providers/runtime/home page (3 tasks; ends with human-verify checkpoint)
**UI hint**: yes

### Phase 2: Type System + GitHub API Integration
**Goal**: A shared type contract in `lib/types.ts` and a curl-testable `/api/analyze-pr` route that fetches PR metadata and the full paginated diff from GitHub without silent truncation
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: FETCH-01, FETCH-02
**Success Criteria** (what must be TRUE):
  1. `lib/types.ts` exports `PRType`, `PRAnalysis`, and all four signal shape types; the TypeScript compiler accepts imports of these types with no errors
  2. A curl POST to `/api/analyze-pr` with a valid public GitHub PR URL returns PR metadata (title, author, file count) and diff content — not a truncated stub
  3. A curl POST with a PR URL whose diff exceeds 300 files or 20k lines returns a structured size-exceeded signal (not a 500 or silent truncation)
  4. The route uses the paginated `/pulls/{id}/files` endpoint, not the single-response diff endpoint
**Plans**: TBD

### Phase 3: LLM Classification + Core UI
**Goal**: Users can paste a GitHub PR URL and see a classified result rendered in the browser — loading skeleton within 100ms, Claude classifies the diff into exactly one of four types via structured output, and error states surface for private repos and oversized PRs
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: CLASS-01, FETCH-03, FETCH-04, FETCH-05
**Success Criteria** (what must be TRUE):
  1. Submitting a valid PR URL shows a loading skeleton within 100ms; the full result appears after the 3–8 second pipeline completes
  2. The `/api/analyze-pr` route returns a Zod-validated `PRAnalysis` object where `prType` is exactly one of `security | refactor | api-change | bug-fix`
  3. Submitting a private repo URL shows the message "This looks like a private repo — a GitHub token with access is required" rather than a generic error
  4. Submitting a PR URL that exceeds the size limit renders a PR size warning card instead of attempting classification
  5. `PRResultPanel` dispatches to a placeholder card component for each of the four `prType` values with no unhandled render path
**Plans**: TBD
**UI hint**: yes

### Phase 4: Four Review Cards + CopilotKit Hook
**Goal**: Users see a fully-populated, type-specific review card for any of the four PR types, and `useCopilotAction` registers all four card types for CopilotKit's generative UI layer — the demo shows three distinct PR URLs producing three visually distinct UIs
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04
**Success Criteria** (what must be TRUE):
  1. A security PR URL renders a card with risk flags, affected auth paths, an OWASP-aligned interactive checklist (checkboxes with local state), severity rating (HIGH/MEDIUM/LOW), and a hardcoded secrets indicator
  2. A refactor PR URL renders a card with files moved/renamed, dependency impact, test coverage delta, behavior preservation note, and PR scope assessment
  3. An API change PR URL renders a card with before/after endpoint surface, breaking change flags, versioning assessment, downstream consumers note, and HTTP method/status changes
  4. A bug fix PR URL renders a card with root cause summary, blast radius/affected area, fix adequacy signal, regression risk flag, and missing test coverage warning
  5. `useCopilotAction` is registered and maps all four `prType` values to their card components; the demo shows at least three distinct card UIs from three different PR URLs
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffolding + Security Foundation | 0/1 | Planned    |  |
| 2. Type System + GitHub API Integration | 0/TBD | Not started | - |
| 3. LLM Classification + Core UI | 0/TBD | Not started | - |
| 4. Four Review Cards + CopilotKit Hook | 0/TBD | Not started | - |
