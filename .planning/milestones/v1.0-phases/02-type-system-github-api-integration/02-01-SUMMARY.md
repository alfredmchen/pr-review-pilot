---
phase: 02-type-system-github-api-integration
plan: 01
subsystem: github-api-integration
tags:
  - github-api
  - octokit
  - zod
  - route-handler
  - typescript
dependency-graph:
  requires:
    - "@/lib/server-only (Phase 1 build-time guard for env-var-touching modules)"
    - "Next.js App Router Route Handler convention (Phase 1)"
    - "process.env.GITHUB_TOKEN (server-only, may be empty in dev)"
  provides:
    - "POST /api/analyze-pr — curl-testable GitHub PR analysis endpoint"
    - "lib/types.ts — Phase 2/3 shared type contract (PRType, PRAnalysis, AnalyzeResponse, signal placeholders, Zod schemas)"
    - "AnalyzeResponse discriminated union extensible by Phase 3 (private-repo, not-found, etc.)"
  affects:
    - "Phase 3 LLM classification + UI dispatcher (consumes AnalyzeResponse, narrows signal placeholders)"
    - "Phase 4 card components (CARD-01..CARD-04 import their respective signal types)"
tech-stack:
  added:
    - "@octokit/rest@22.0.1 (exact-pinned)"
    - "zod@4.4.3 (exact-pinned)"
  patterns:
    - "Discriminated union response keyed on `status` (D-04, D-05)"
    - "Two-stage fetch: pulls.get → size gate → octokit.paginate(pulls.listFiles)"
    - "Runtime validation of every 200-path response via AnalyzeResponseSchema.parse"
    - "Single-source PR_URL_REGEX shared between schema + capture-group extraction"
key-files:
  created:
    - lib/types.ts (137 lines)
    - app/api/analyze-pr/route.ts (147 lines)
    - .planning/phases/02-type-system-github-api-integration/02-CURL-LOG.md (108 lines)
  modified:
    - package.json (added @octokit/rest, zod)
    - package-lock.json (resolved transitive deps)
decisions:
  - "Used module-scoped Octokit (constructed once at module load) for cross-request reuse — auth value frozen at first import; acceptable for stateless server"
  - "Mapped 401/404 from pulls.get to HTTP 502 (with upstreamStatus in body); 5xx-other stays 500. Phase 3 will narrow these into status:'private-repo' / 'not-found' (D-13)"
  - "Used Record<string, unknown> intersection placeholders for signal types — exists, importable, will narrow in Phase 3 without breaking imports"
metrics:
  duration: "5 minutes"
  tasks_completed: 3
  files_created: 3
  files_modified: 2
  completed_date: 2026-05-09
requirements:
  completed:
    - FETCH-01
    - FETCH-02
---

# Phase 2 Plan 1: Type System + GitHub API Integration Summary

Two-stage Octokit fetch with metadata-first size gate, returning a status-keyed discriminated union — verified against three real public PRs at runtime.

## What Shipped

- `lib/types.ts` — the Phase 2/3 shared type contract: `PRType` enum, four signal placeholder types (`SecuritySignal`, `RefactorSignal`, `ApiChangeSignal`, `BugFixSignal`), `PRMetadata`, `PRFile`, `PRAnalysis`, `AnalyzeResponse` discriminated union (`'ok' | 'size-exceeded'`), paired Zod schemas via `z.infer<>`, `PR_URL_REGEX`, `SIZE_GATE_MAX_FILES = 300`, `SIZE_GATE_MAX_LINES = 20000`.
- `app/api/analyze-pr/route.ts` — POST handler that validates the request body with `AnalyzeRequestSchema`, fetches PR metadata via `octokit.pulls.get`, returns `{status:'size-exceeded', fileCount, lineCount}` early when either gate trips (D-10), and otherwise paginates `octokit.pulls.listFiles` with `per_page: 100` (D-11). `import "@/lib/server-only"` is the first line — token boundary enforced at build time. Every 200-path response is run through `AnalyzeResponseSchema.parse` so any drift between TS types and runtime shape fails loudly server-side.
- `package.json` updated: `@octokit/rest@22.0.1` and `zod@4.4.3` exact-pinned (no `^`/`~`), per Phase 1 convention.
- `02-CURL-LOG.md` — captured outputs of all three verification scenarios so Phase 3's verifier can replay them.

## Pinned Versions Installed

| Package | Version | Notes |
|---|---|---|
| `@octokit/rest` | `22.0.1` | exact-pinned via `--save-exact`; satisfies CLAUDE.md `22.0.x` constraint |
| `zod` | `4.4.3` | exact-pinned via `--save-exact`; satisfies CLAUDE.md `4.4.x` constraint |

## Curl Fixtures Used (for Phase 3 verifier replay)

| Scenario | URL | Expected | Got |
|---|---|---|---|
| A — small PR | `https://github.com/octocat/Hello-World/pull/1` | HTTP 200, `status:"ok"`, ≥1 file | HTTP 200, `status:"ok"`, 1 file, title "Edited README via GitHub" |
| B — oversized PR | `https://github.com/nodejs/node/pull/62898` | HTTP 200, `status:"size-exceeded"`, gate tripped | HTTP 200, `fileCount=452`, `lineCount=41006` (both gates tripped) |
| C — invalid URL | `https://github.com/foo/bar` | HTTP 400, `error` field populated | HTTP 400, `error:"Invalid request."`, regex hint in `details[]` |

Full response bodies captured in `02-CURL-LOG.md`.

## Decisions Made (Beyond CONTEXT.md)

- **`nodejs/node#62898` chosen for Scenario B fixture.** The plan's default candidate (a kubernetes vendor bump) was checked against the live API and the recent ones did not actually trip the gate — `kubernetes/kubernetes#138573` was at 19593 lines, just 407 lines short of the 20000 threshold. Pivoted to a Node.js npm-vendor bump (`62898`: 452 files, 41006 lines) which trips both gates with significant margin and is unlikely to drift below them since it is a merged PR. Substitute logic documented in `02-CURL-LOG.md`.
- **Used the existing dev server on port 3000 rather than starting a new one.** The execution environment already had `next dev` running, and HMR picked up the new route automatically. Verified via the response shape (no stale 404 — server returned our exact validation error message). No port-conflict workaround needed.

## Verification Evidence

- `npx tsc --noEmit` → exit 0 (after Task 1 and again after Task 2/3)
- `npm run build` → exit 0; `/api/analyze-pr` registered as a dynamic (`ƒ`) route
- All Task 1 grep gates pass (8/8 — every required export present)
- All Task 2 grep gates pass (9/9 — server-only first, POST exported, both Octokit calls present, no diff endpoint, no `NEXT_PUBLIC_`)
- All three curl scenarios pass their assertions (PASS A/B/C)

## Deviations from Plan

**None of substance.** Two minor adjustments:

1. **Scenario B fixture pivoted from kubernetes/kubernetes (suggested) to nodejs/node#62898.** Recent kubernetes vendor PRs were checked and none currently trip the gate; nodejs/node#62898 reliably exceeds both gates. Documented in `02-CURL-LOG.md`. (Plan explicitly invited substitution: "If `octocat/Hello-World/pull/1` is closed/empty, substitute another small public PR" — same principle applies to oversized fixture.)
2. **GitHub API used anonymously, not authenticated.** `.env.local` declares `GITHUB_TOKEN=` but with an empty value, so Octokit falls back to anon (60/hr public-repo limit). Each scenario was a single `pulls.get` call (Scenario B's gate trip prevented `paginate`), well under the limit. Plan explicitly notes this is fine: "Without it the small-PR call still works (anonymous = 60/hr) but the oversized-PR call may bottleneck." Did not bottleneck.

No Rule 1/2/3 auto-fixes were needed — the plan's reference implementations compiled and ran correctly on first try.

## Authentication Gates

None. The endpoint works fully without `GITHUB_TOKEN` for public repos (verified above). The Phase 1 server-only guard is intact: any module that adds a token-touching path must continue to `import "@/lib/server-only"` as the first line.

## Known Stubs

The four `*Signal` types in `lib/types.ts` (`SecuritySignal`, `RefactorSignal`, `ApiChangeSignal`, `BugFixSignal`) are intentional placeholder shapes (`{type: "..."} & Record<string, unknown>`). Phase 2's success criterion is that they exist and are importable — not that they are populated. Phase 3 (FETCH-03 + CLASS-01) will narrow each Record into its CARD-NN-specific fields when the LLM structured-output schema is designed. This is documented in 02-CONTEXT.md "Claude's Discretion" and intentional, not deferred work.

The `PRAnalysis.signals` and `PRAnalysis.prType` fields are optional (`?`) for the same reason — Phase 2 populates `metadata` + `files`; Phase 3 populates the rest. The shape is non-breakingly extensible.

## Forward Pointers for Phase 3

- **Single import point.** Phase 3 dispatcher (`PRResultPanel`) and any helper imports types from `@/lib/types` only. No circular dependencies risk because `lib/types.ts` has zero local imports (only `zod`).
- **Union extension is open.** Phase 3 adds `'private-repo' | 'not-found'` (and possibly `'invalid-url'` if the union is preferred over HTTP 400 for the UI flow) by appending schemas to the `z.discriminatedUnion("status", [...])` array and types to the union. Existing Phase 2 callers' exhaustive `switch` statements will surface the new arms as compile errors — by design.
- **Error mapping handoff.** The route currently returns 5xx for 401/404 from `pulls.get` with `upstreamStatus` in the body (D-13). Phase 3 (FETCH-04) replaces those 5xx returns with `Response.json({status:'private-repo', ...}, {status: 200})`. The catch block at lines 79-89 of `app/api/analyze-pr/route.ts` is the single change-point.
- **`signals` field narrowing.** Phase 3 either keeps `signals?: PRSignals` (current shape) and narrows the union via the `prType` literal, or restructures `PRAnalysis` to be itself discriminated on `prType`. Both paths are non-breaking from Phase 2's perspective because no Phase 2 code reads `signals`.

## Self-Check

Verifying claims before finalizing.

- File `lib/types.ts` exists: FOUND
- File `app/api/analyze-pr/route.ts` exists: FOUND
- File `.planning/phases/02-type-system-github-api-integration/02-CURL-LOG.md` exists: FOUND
- Commit `2204d8d` (Task 1: feat install octokit zod, define type contract): FOUND in git log
- Commit `975d7f9` (Task 2: feat implement /api/analyze-pr route): FOUND in git log
- Commit `21ab2ac` (Task 3: docs curl verification log): FOUND in git log
- `npx tsc --noEmit`: exit 0
- `npm run build`: exit 0
- `@octokit/rest@22.0.1` exact-pinned in package.json: VERIFIED (`pins OK 22.0.1 4.4.3`)
- `zod@4.4.3` exact-pinned in package.json: VERIFIED
- Scenario A response: `status:"ok"`, 1 file, populated metadata: VERIFIED
- Scenario B response: HTTP 200, `status:"size-exceeded"`, 452 files / 41006 lines: VERIFIED
- Scenario C response: HTTP 400, `error` field populated: VERIFIED

## Self-Check: PASSED
