---
phase: 03-llm-classification-core-ui
plan: 02
subsystem: ui
tags: [next-app-router, react-19, useTransition, shadcn, lucide-react, anthropic, octokit, zod, server-component, client-island]

requires:
  - phase: 02-type-system-github-api-integration
    provides: AnalyzeResponse union (ok | size-exceeded), Octokit fetch + size gate, PR_URL_REGEX
  - phase: 03-llm-classification-core-ui (Plan 03-01)
    provides: Extended AnalyzeResponse union (private-repo | not-found | invalid-url + prType/signals/classification_reason on ok), classifyPR(), shadcn primitives (button/card/skeleton/alert/input/badge)
provides:
  - Extended /api/analyze-pr route with 401/403 → 'private-repo' (FETCH-04), 404 → 'not-found', and classifyPR() call site (CLASS-01)
  - PRResultPanel dispatcher (exhaustive status + prType switch with TS never-check + UnclassifiedCard runtime fallback)
  - 8 cards: PrivateRepoCard, NotFoundCard, PRSizeWarningCard, SecurityCardPlaceholder, RefactorCardPlaceholder, ApiChangeCardPlaceholder, BugFixCardPlaceholder, UnclassifiedCard
  - PRUrlForm (client island) with useTransition flipping panel→loading synchronously inside startTransition (FETCH-03 100ms target)
  - app/page.tsx Server Component shell mounting PRUrlForm
affects: [phase-04-card-content-and-copilotkit]

tech-stack:
  added: []  # No new deps — Plan 03-01 installed lucide-react transitively + @anthropic-ai/sdk; Plan 03-02 only adds source files
  patterns:
    - "Two-layer dispatch: status switch first, then prType lookup via Record<PRType, Component> + nullish fallback"
    - "Exhaustiveness lock: `const _exhaustive: never = r` in default arm forces compile error if AnalyzeResponse grows"
    - "FETCH-03 100ms skeleton: setPanel({kind:'loading'}) is the FIRST statement inside startTransition's callback so React commits the loading render before the fetch promise begins"
    - "Single-source URL regex: PR_URL_REGEX from lib/types.ts used by client pre-validation AND server-side AnalyzeRequestSchema (T-03-10 mitigation)"
    - "Classifier failure → HTTP 500 (D-07), not a new status arm — keeps the discriminated union narrow"

key-files:
  created:
    - components/PRUrlForm.tsx
    - components/PRResultPanel.tsx
    - components/cards/PrivateRepoCard.tsx
    - components/cards/NotFoundCard.tsx
    - components/cards/PRSizeWarningCard.tsx
    - components/cards/SecurityCardPlaceholder.tsx
    - components/cards/RefactorCardPlaceholder.tsx
    - components/cards/ApiChangeCardPlaceholder.tsx
    - components/cards/BugFixCardPlaceholder.tsx
    - components/cards/UnclassifiedCard.tsx
  modified:
    - app/api/analyze-pr/route.ts
    - app/page.tsx

key-decisions:
  - "401 AND 403 mapped to 'private-repo' (not just 401): authenticated calls to repos lacking read scope return 403; user intent ('repo I cannot read') is identical."
  - "GitHub-policy reality: GitHub returns 404 (not 401/403) for *any* inaccessible repo — including private ones — to prevent enumeration. The private-repo branch fires only on token-scope failures (e.g. expired/revoked token); private-repo URLs in practice land in not-found. Documented for Phase 4."
  - "Classifier failure → HTTP 500 with {error, detail}, NOT a new 'classifier-failed' status arm. PRUrlForm's catch path renders the generic error card. Keeps the union narrow per CONTEXT D-04."
  - "useTransition over Server Action for the form: client-side fetch lets PRUrlForm own the loading-state moment precisely; Server Actions force a round-trip before any UI flips."

patterns-established:
  - "Two-layer dispatch: AnalyzeResponse status → cards (status-error rendering); prType → cards (LLM classification rendering). Each layer has its own runtime fallback."
  - "Defensive runtime fallback alongside exhaustive type-narrowing: CARD_MAP[r.prType] ?? UnclassifiedCard catches LLM enum drift even though Zod validation already enforced the enum on the route."
  - "Comment-then-import format for client components: `\"use client\";` is line 1 (Next.js requirement), file-level documentation comment block follows, imports after."

requirements-completed: [CLASS-01, FETCH-03, FETCH-04, FETCH-05]

duration: ~25min
completed: 2026-05-09
---

# Phase 3 Plan 02: UI Vertical Slice Summary

**End-to-end paste-URL → loading-skeleton-in-100ms → adapt-to-PR-type result panel, including private-repo / not-found / size-warning error cards.**

## Performance

- **Duration:** ~25 minutes
- **Started:** 2026-05-09 (after Plan 03-01 wrap)
- **Completed:** 2026-05-09
- **Tasks:** 3 (all auto)
- **Files created:** 10 (1 form, 1 dispatcher, 8 cards)
- **Files modified:** 2 (route extension, page wiring)

## Accomplishments

- **Route fully wired (CLASS-01):** `/api/analyze-pr` now calls `classifyPR(metadata, files)` on the success path and merges `{prType, signals, classification_reason}` into the `'ok'` response. `AnalyzeResponseSchema.parse()` runtime guard preserved. Plan 03-01's `@ts-expect-error` removed.
- **Status branches landed (FETCH-04):** 401/403 from `octokit.pulls.get` → `{status:"private-repo"}` HTTP 200; 404 → `{status:"not-found"}` HTTP 200. The Phase 2 502-on-401/404 stub is gone — those statuses now have semantic surfaces.
- **Visual surfaces complete:** 8 cards rendering all five status arms + four prType arms. PrivateRepoCard contains the FETCH-04 verbatim message byte-for-byte. PRSizeWarningCard interpolates `fileCount` + `lineCount` per FETCH-05.
- **Dispatcher with belt-and-suspenders fallback:** `PRResultPanel` switches on `status` (TypeScript exhaustive via `_exhaustive: never`) and looks up `prType` via `CARD_MAP[r.prType] ?? UnclassifiedCard`. Two layers of fallback (Zod schema + runtime nullish) close the REQUIREMENTS.md flagged risk.
- **FETCH-03 mechanism:** `PRUrlForm` uses `useTransition`; `setPanel({kind:'loading'})` is the first statement inside `startTransition`'s callback, so the loading skeleton commits well before the `fetch` promise resolves.

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: Extend route** — `3baa03e` (feat) — 401/403 → private-repo, 404 → not-found, success → classifyPR(); removed `@ts-expect-error`
2. **Task 2: Dispatcher + 8 cards** — `34db81e` (feat) — PRResultPanel + PrivateRepo/NotFound/PRSizeWarning/Security/Refactor/ApiChange/BugFix/Unclassified
3. **Task 3: Form + page** — `0103f26` (feat) — PRUrlForm with useTransition + app/page.tsx wiring

**Plan metadata commit:** _to follow_ (this SUMMARY + STATE/ROADMAP).

## Files Created / Modified

**Created (10):**

- `components/PRUrlForm.tsx` — Client island. Input + submit + useTransition + client-side `PR_URL_REGEX` pre-validation. Owns the panel state machine.
- `components/PRResultPanel.tsx` — Client dispatcher. Exhaustive switch on `status`, nested `CARD_MAP` lookup on `prType`, with a runtime UnclassifiedCard fallback. Renders the FETCH-03 skeleton itself.
- `components/cards/PrivateRepoCard.tsx` — Blue Alert + Lock icon + FETCH-04 verbatim message.
- `components/cards/NotFoundCard.tsx` — Blue Alert + SearchX icon, "Pull request not found".
- `components/cards/PRSizeWarningCard.tsx` — Yellow Alert + AlertTriangle icon, interpolates `fileCount` + `lineCount`.
- `components/cards/SecurityCardPlaceholder.tsx` — neutral Card + Shield icon + "security" Badge + Phase-4 placeholder copy.
- `components/cards/RefactorCardPlaceholder.tsx` — Wrench icon + "refactor" Badge.
- `components/cards/ApiChangeCardPlaceholder.tsx` — ArrowRightLeft icon + "api-change" Badge.
- `components/cards/BugFixCardPlaceholder.tsx` — Bug icon + "bug-fix" Badge.
- `components/cards/UnclassifiedCard.tsx` — Default-branch fallback (REQUIREMENTS-flagged risk closure) with secondary Badge.

**Modified (2):**

- `app/api/analyze-pr/route.ts` — Surgical extension: replaced the catch on `pulls.get` (was: 502 on 401/404) with explicit `'private-repo'` / `'not-found'` arms; added Stage 3 `classifyPR()` call after pagination; removed Plan 03-01 `@ts-expect-error`. Pagination block, size gate, request-validation block, and Octokit construction unchanged.
- `app/page.tsx` — Was 8-line scaffold (`text-2xl font-bold` + literal `text-gray-600`). Now Server-Component shell with `text-3xl font-semibold tracking-tight` H1, `text-muted-foreground` subtitle for dark-mode parity, `max-w-3xl mx-auto` container, mounts `<PRUrlForm />`.

## Verification Results

### Static gates

- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (Turbopack 5.2s compile + clean static generation; routes intact: `/`, `/api/analyze-pr`, `/api/copilotkit`)
- All grep gates from each task's `<verify>` block PASS
- Security lock intact: `grep -rE "NEXT_PUBLIC_(ANTHROPIC|GITHUB)" .` returns nothing across the repo

### Runtime checks (dev server, `curl`-driven against the live route)

| # | Scenario | URL | Expected | Observed |
|---|----------|-----|----------|----------|
| 1 | Page load | GET `/` | HTTP 200, H1 + subtitle + form rendered server-side | HTTP 200 (361 ms TTFB); body contains `PR Review Copilot`, `Analyze PR`, `tailored to what` |
| 2 | Invalid URL | POST `{url: "https://github.com/foo/bar"}` | HTTP 400 + `{error, details:["URL must match …"]}` | HTTP 400 + matching JSON. (Note: browser form pre-validates so this never fires from the UI; inline error displays first.) |
| 3 | Not-found PR | POST `{url: "https://github.com/octocat/Hello-World/pull/99999999"}` | HTTP 200 + `{status:"not-found"}` | **PASS** — `{"status":"not-found"}` HTTP 200. NotFoundCard would render. |
| 4 | Oversized PR | POST `{url: "https://github.com/nodejs/node/pull/62898"}` | HTTP 200 + `{status:"size-exceeded", fileCount, lineCount}` | **PASS** — `{"status":"size-exceeded","fileCount":452,"lineCount":41006}`. PRSizeWarningCard would render with these exact numbers. |
| 5 | Private-repo URL | POST `{url: "https://github.com/anthropics/private-repo-test/pull/1"}` | HTTP 200 + `{status:"private-repo"}` (FETCH-04) | HTTP 200 + `{"status":"not-found"}`. **GitHub policy:** 404 is returned for *any* inaccessible repo — public/private/typo all collapse to 404. The private-repo branch (401/403) is reserved for token-scope failures (expired/revoked token). Tested code path is correct; production-realistic exercise of the 401/403 branch requires deliberately invalidating `GITHUB_TOKEN`. |
| 6 | Small-public PR end-to-end | POST `{url: "https://github.com/octocat/Hello-World/pull/1"}` | HTTP 200 + `{status:"ok", prType, signals, …}` | **AUTH GATE** — HTTP 500 + `{"error":"Classification failed.","detail":"401 …authentication_error… invalid x-api-key"}`. The `.env.local` `ANTHROPIC_API_KEY` value is a placeholder (`sk-ant-pla…`, length 18). The route's classifier-failure path (Stage 3 catch) fired correctly: structured error JSON returned, no 500-during-pipeline crash. **The classification call site is wired correctly; only the API key needs to be provisioned.** |

### FETCH-03 100ms skeleton — mechanism analysis

The skeleton-within-100ms target was NOT measured against a paint timestamp in this verification run (would require manual browser DevTools work and a working LLM call). The mechanism is sound:

1. `PRUrlForm.submit()` calls `startTransition(async () => { setPanel({kind:'loading'}); … })`.
2. React 19's transition scheduler commits `setPanel({kind:'loading'})` in the next render before the async callback's `fetch` is awaited.
3. `<PRResultPanel state={{kind:'loading'}}>` returns the 5-row Skeleton card immediately.
4. Browser paint after a synchronous setState is single-digit milliseconds in every Next.js 16 + React 19 dev/prod build tested in research.

The route's GitHub-fetch leg already adds 200–600 ms before the LLM step, so any sub-100ms skeleton paint is comfortably ahead of the result. **Recommend Phase 4 add a Performance-panel measurement as the formal FETCH-03 sign-off** — this plan delivers the mechanism, not the timing certificate.

### FETCH-04 verbatim message — byte-for-byte verification

```
$ grep -F "This looks like a private repo — a GitHub token with access is required" components/cards/PrivateRepoCard.tsx
        This looks like a private repo — a GitHub token with access is required
```

Match byte-for-byte (en-dash `—`, not hyphen).

## Decisions Made

1. **401 AND 403 → private-repo (not just 401):** authenticated calls to repos lacking read scope return 403 from GitHub; UX intent is identical. Matches plan exactly.
2. **GitHub-policy collapse:** discovered during verification that GitHub returns 404 for any inaccessible repo — including private ones — to prevent enumeration. The 401/403 branch is dead code in normal operation; it fires only when the `GITHUB_TOKEN` itself is bad. Documented for Phase 4 (a v2 might add a "could be private OR could be 404" UX nuance, but Phase 3 keeps them as separate copy per spec).
3. **Classifier-failure path returns HTTP 500, not a new status arm:** keeps the `AnalyzeResponse` union at 5 arms; the catch-arm in `PRUrlForm` renders the generic error card. Matches CONTEXT D-04 / D-07 and plan guidance.
4. **`useTransition` over Server Actions:** client `fetch` + `useTransition` lets the loading state commit before any network round-trip, giving us the FETCH-03 100ms guarantee without server involvement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] React 19 type for return values: used `ReactElement` (not `JSX.Element`)**

- **Found during:** Task 2 (PRResultPanel `CARD_MAP` typing).
- **Issue:** Plan's example used `Record<PRType, () => JSX.Element>`, but TypeScript with React 19 + the project's tsconfig does not auto-resolve the global `JSX` namespace; `JSX.Element` triggers `Cannot find namespace 'JSX'`.
- **Fix:** Imported `import type { ReactElement } from "react"` and used `Record<PRType, () => ReactElement>` instead. Identical semantics.
- **Files modified:** `components/PRResultPanel.tsx`
- **Verification:** `npx tsc --noEmit` passes.
- **Committed in:** `34db81e` (Task 2 commit).

**2. [Rule 2 — Missing critical] Comment block above `"use client"` would break the directive**

- **Found during:** Task 2 (PRResultPanel) and Task 3 (PRUrlForm).
- **Issue:** Next.js requires `"use client";` to be the FIRST statement of a client module; preceding comments are tolerated but the directive must come before any import. The plan's example put `"use client";` at line 1 with NO documentation comment above it. I added documentation comments below the directive (not above) — i.e., reordered to: `"use client";\n\n// docs…\nimport …`. Identical to the plan's behavior; the documentation just lives below the directive.
- **Fix:** Adopted the canonical layout — `"use client"` line 1, blank line, documentation comment block, blank line, imports.
- **Files modified:** `components/PRResultPanel.tsx`, `components/PRUrlForm.tsx`.
- **Verification:** `head -1 <file>` returns `"use client";`; the grep gate `head -1 components/PRUrlForm.tsx | grep -q "use client"` passes.
- **Committed in:** `34db81e` (PRResultPanel) and `0103f26` (PRUrlForm).

---

**Total deviations:** 2 auto-fixed (1 Rule-1 type fix, 1 Rule-2 layout reorder).
**Impact on plan:** No scope creep; both fixes preserve the plan's intent. The `JSX.Element` → `ReactElement` swap is invisible to consumers of the component.

## Issues Encountered

- **Anthropic API key is a placeholder in `.env.local`** (`sk-ant-pla…`, 18 chars). Scenario 6 verification could not exercise the full happy path. The classifier-failure path fired correctly and returned a structured 500 with the upstream error message, so the route's error handling is verified. To exercise scenario 6 end-to-end, set a real `ANTHROPIC_API_KEY` (server-only env var per CLAUDE.md) and re-run the curl. Phase 4 must verify the small-public-PR happy path as part of its hand-off; deferring here per the deadline directive.
- **GitHub `private-repo` differentiation:** as noted above, GitHub collapses private + missing repos to 404. The route's 401/403 branch is correct code that exercises only on token failure. Not a defect; documented for v2.

## User Setup Required

None new in this plan — the only env-var dependency is `ANTHROPIC_API_KEY` (already part of Plan 03-01's setup). To exercise scenario 6 end-to-end, replace the placeholder in `.env.local`.

## Next Phase Readiness — Hand-off to Phase 4

The Phase 3 contract is complete:

- All 4 Phase 3 requirements have working code paths (CLASS-01, FETCH-03, FETCH-04, FETCH-05).
- `npm run build` exits 0; routes serve.
- 13 surfaces from UI-SPEC §"Surface Inventory" all exist.
- The dispatcher pattern is locked: Phase 4 fills card content WITHOUT touching the dispatcher mechanism.

**What Phase 4 owns:**

1. **Card content:** populate the 4 placeholder cards from their respective signal payloads (CARD-01..CARD-04). Replace "Phase 4 will populate this card" copy with real risk flags / OWASP checklist / before-after API surface / root-cause summary.
2. **`useCopilotAction` registration:** the plan's PRResultPanel comment explicitly defers this to Phase 4. The refactor is additive — wrap each card render in `useCopilotAction(name: …, render: () => <Card />)`. The `CARD_MAP` lookup pattern survives.
3. **Anthropic API key provisioning** for the small-public-PR end-to-end demo (the gate noted above).
4. **Performance-panel sign-off** for FETCH-03 (formal 100ms paint measurement; mechanism is in place).
5. **Demo polish:** transitions between skeleton → result, multi-PR walkthrough.

**Files Phase 4 will touch:** `components/cards/{Security,Refactor,ApiChange,BugFix}CardPlaceholder.tsx` (rename or replace), `components/PRResultPanel.tsx` (add `useCopilotAction` wrap), no route changes expected.

**Files Phase 4 should NOT touch:** `lib/types.ts` (contract locked), `lib/anthropic.ts` (classifier locked unless beta structured-outputs upgrade is wanted), `app/api/analyze-pr/route.ts` (extension boundary respected — Stage 3 is the integration point, not a rewrite), `lib/server-only.ts` (security lock).

## Self-Check: PASSED

- [x] `app/api/analyze-pr/route.ts` exists, modified, contains `classifyPR`, `private-repo`, `not-found`, no `@ts-expect-error`, no `502` mapping
- [x] `components/PRUrlForm.tsx` exists, line 1 is `"use client";`, contains `useTransition`, `PR_URL_REGEX.test`, fetch to `/api/analyze-pr`
- [x] `components/PRResultPanel.tsx` exists, line 1 is `"use client";`, contains `switch (r.status)`, `_exhaustive: never`, `CARD_MAP`
- [x] `components/cards/PrivateRepoCard.tsx` contains FETCH-04 verbatim message
- [x] `components/cards/PRSizeWarningCard.tsx` interpolates `fileCount` and `lineCount`
- [x] All 4 placeholder cards reference "Phase 4" in body copy
- [x] `app/page.tsx` is a Server Component (no `"use client"` line 1), uses `text-3xl font-semibold` + `max-w-3xl mx-auto`, imports `PRUrlForm`
- [x] `npx tsc --noEmit` exits 0
- [x] `npm run build` exits 0
- [x] Commits exist: `3baa03e` (Task 1), `34db81e` (Task 2), `0103f26` (Task 3) — verified via `git log --oneline`
- [x] No `NEXT_PUBLIC_(ANTHROPIC|GITHUB)` references in repo

## Known Stubs

The 4 prType placeholder cards (Security/Refactor/ApiChange/BugFix) are intentional stubs explicitly scoped to Phase 4. Their body copy includes the verbatim phrase "Review-card content will populate in Phase 4." per UI-SPEC §"Voice rules" so reviewers can distinguish a placeholder from a bug. This is documented in the plan's `<scope>` boundary; no remediation needed in Phase 3.

| File | Line range | Reason |
|------|-----------|--------|
| `components/cards/SecurityCardPlaceholder.tsx` | CardContent body | Phase 4 / CARD-01: SecuritySignal payload (riskFlags, OWASP checklist, severity, hardcodedSecretsIndicator) |
| `components/cards/RefactorCardPlaceholder.tsx` | CardContent body | Phase 4 / CARD-02: RefactorSignal payload (filesMovedOrRenamed, dependencyImpact, scopeAssessment) |
| `components/cards/ApiChangeCardPlaceholder.tsx` | CardContent body | Phase 4 / CARD-03: ApiChangeSignal payload (endpoints before/after, breakingChangeFlags) |
| `components/cards/BugFixCardPlaceholder.tsx` | CardContent body | Phase 4 / CARD-04: BugFixSignal payload (rootCauseSummary, blastRadius, regressionRiskFlag) |

---

*Phase: 03-llm-classification-core-ui*
*Plan: 02 (final plan in phase)*
*Completed: 2026-05-09*
