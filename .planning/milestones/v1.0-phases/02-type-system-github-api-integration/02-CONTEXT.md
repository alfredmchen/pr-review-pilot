# Phase 2: Type System + GitHub API Integration - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a shared `lib/types.ts` type contract and a curl-testable POST `/api/analyze-pr` route that:
- Accepts a GitHub PR URL string in the request body
- Validates the URL
- Fetches PR metadata from the GitHub API (read-only, public repos for now)
- Conditionally fetches the paginated PR file diff
- Returns a discriminated-union response shape consumable by Phase 3's UI dispatcher

In scope: URL validation, Octokit configuration, metadata-first size gating, paginated `/files` fetch, response type definitions for `ok` and `size-exceeded` states, Zod runtime validation of the response shape.

Out of scope: LLM classification (Phase 3), private-repo error handling / `private-repo` status (Phase 3, FETCH-04), loading skeleton (Phase 3, FETCH-03), card rendering (Phase 3+4), front-end input field (Phase 3, FETCH-01 user-facing surface).

Phase 2 satisfies FETCH-01 (URL accepted by API) and FETCH-02 (server-side paginated fetch). FETCH-01's UI surface is Phase 3.

</domain>

<decisions>
## Implementation Decisions

### URL Parsing + Validation

- **D-01:** Strict regex match on the request URL: `^https://github\.com/{owner}/{repo}/pull/{N}/?$` (HTTPS only, optional trailing slash). Owner/repo character set follows GitHub rules (`[\w.-]+`); PR number is `\d+`.
- **D-02:** Anything that fails the regex returns HTTP 400 with a descriptive error body. No normalization, no fragment/query stripping, no `/files` or `/commits` suffix tolerance — the user gets a clean error and re-pastes.
- **D-03:** Rationale: surfaces typos and malformed pastes immediately rather than silently extracting from garbage. The cost of one re-paste is lower than the cost of a route that "works" on weird inputs.

### Response Shape — Discriminated Union on `status`

- **D-04:** `/api/analyze-pr` always returns HTTP 200 for *expected* outcomes. The response body is a discriminated union keyed on a `status` field; Phase 3's dispatcher switches on `status` to decide which UI to render.
- **D-05:** Phase 2 enumerates exactly two members of the union: `status: 'ok'` (with `metadata` + `files`) and `status: 'size-exceeded'` (with `fileCount`, `lineCount`). Phase 3 will extend the union (`'private-repo' | 'not-found' | 'invalid-url'` etc.) when wiring FETCH-04.
- **D-06:** Invalid-URL still returns HTTP 400 (per D-02) — it is a request validation failure, not an application state. The "always 200" rule applies to *expected application outcomes from a valid request*.
- **D-07:** HTTP 5xx is reserved for unexpected transport errors (network failure, malformed Octokit response, GitHub outage). Do not collapse these into the status union.
- **D-08:** Type contract lives in `lib/types.ts` and is imported by both the route handler and (in Phase 3) the UI dispatcher. The discriminated union enables exhaustive `switch` checking via TypeScript's never-narrowing.

### Pagination + Early Abort

- **D-09:** Two-stage fetch pattern. Stage 1: GET `/pulls/{id}` (single call, returns metadata including `changed_files`, `additions`, `deletions`). Stage 2: only if metadata passes the size gate, paginate `/pulls/{id}/files`.
- **D-10:** Size gate (between Stage 1 and Stage 2): if `changed_files > 300` OR `(additions + deletions) > 20000`, return `{status:'size-exceeded', fileCount, lineCount}` immediately — do *not* paginate files. This is the cheapest path: one API call for huge PRs.
- **D-11:** For PRs that pass the gate, use `octokit.paginate(octokit.pulls.listFiles, {owner, repo, pull_number, per_page: 100})`. The size gate caps results at 300 files / 3 pages, so paginate-then-process is fine — no need for incremental yield.
- **D-12:** Octokit constructor is configured unconditionally with `auth: process.env.GITHUB_TOKEN`. Authenticated requests get 5000/hr vs anonymous 60/hr; the token is server-only (Phase 1 lockdown) so there is no exposure risk. Public repos still benefit from authenticated rate limits.
- **D-13:** Phase 3 (FETCH-04) will add private-repo detection by catching the 401/404 from `octokit.pulls.get` and mapping to `status: 'private-repo'`. Phase 2 lets that error propagate — defer until Phase 3 extends the union.

### Claude's Discretion

- **PRAnalysis type shape (NOT discussed)** — the user opted out of pre-deciding the discriminated-union-vs-flat shape for the per-card-type signal payload (security/refactor/api-change/bug-fix). Phase 2 only needs the `metadata` + `files` shape; the `PRAnalysis` per-card-type field structure can be deferred until Phase 3 (when the LLM structured output schema is designed) or until the planner proposes a shape based on REQUIREMENTS.md CARD-01..CARD-04 fields. Researcher/planner have latitude here, with the constraint that whatever shape is chosen must be importable by both the route and the (Phase 4) card components without circular dependencies.
- File patch representation — keep `files: Array<{filename, status, additions, deletions, patch}>` as Octokit returns it; do not pre-concat into a unified-diff string. Phase 3 can derive whatever the LLM call needs.
- Zod schema layout — put response schemas adjacent to the type definitions in `lib/types.ts` (or a sibling `lib/schemas.ts` if it grows). Use `z.infer<>` so the TS types and runtime schemas cannot drift.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked requirements + scope
- `.planning/REQUIREMENTS.md` §FETCH-01, §FETCH-02 — the two requirements this phase satisfies. Note: FETCH-04 (private repo error message) and FETCH-05 (size warning card) belong to Phase 3 — type union is designed to extend cleanly.
- `.planning/ROADMAP.md` — Phase 2 success criteria (4 truths the verifier will check); also lists Phase 3+4 dependencies on this phase's contract.
- `.planning/PROJECT.md` §Constraints — tech stack is fixed; §"Out of Scope" — no GitHub write-back, no auth UX.

### Tech stack constraints
- `CLAUDE.md` §"Recommended Stack" — `@octokit/rest@22.0.x` is the GitHub client; `zod@4.4.x` for schema validation. Both are first-time installs in this phase.
- `CLAUDE.md` §"What NOT to Use" — no `NEXT_PUBLIC_GITHUB_TOKEN` (Phase 1 lockdown still applies); no GitHub GraphQL API; no `next-auth`.

### Phase 1 carryover
- `.planning/phases/01-scaffolding-security-foundation/01-RESEARCH.md` §"Standard Stack" — `@octokit/rest` and `zod` were explicitly deferred to Phase 2; version pins documented there.
- `.planning/phases/01-scaffolding-security-foundation/01-VERIFICATION.md` — confirms `lib/server-only.ts` guard pattern is in place; new server modules in this phase MUST import it before reading `process.env.GITHUB_TOKEN`.
- `lib/server-only.ts` — the actual guard module. New files: `app/api/analyze-pr/route.ts` and any helper that reads `GITHUB_TOKEN` must `import "@/lib/server-only"` (or relative path equivalent) at the top.

### GitHub API surface (external — researcher to verify current)
- Octokit `pulls.get` — returns PR metadata with `changed_files`, `additions`, `deletions`. Single call.
- Octokit `pulls.listFiles` — paginated; returns `Array<{filename, status, additions, deletions, patch, ...}>`. Combined with `octokit.paginate()`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/server-only.ts` — Phase 1's build-time guard (`import "server-only"; export {}`). Mandatory at the top of any new server module touching env vars. Pattern is established; new files imitate this import.
- `app/api/copilotkit/route.ts` — Phase 1's existing route handler. Reference for App Router Route Handler conventions in this project (named exports `POST`, return shape, Next.js 16 patterns).
- `app/providers.tsx` (`"use client"`) — establishes the client boundary. Phase 2 adds *no* client-side code; everything new lives server-side.

### Established Patterns
- Server-only env access: `process.env.GITHUB_TOKEN` is read only after `import "@/lib/server-only"`. Never construct a string like `process.env.NEXT_PUBLIC_*` for secrets.
- Route Handler shape: `export async function POST(req: Request) { ... return Response.json(...) }` — match Phase 1's `app/api/copilotkit/route.ts` style.
- Pinned versions: `package.json` pins exact versions (no `^`/`~` for runtime deps — see `next: 16.2.6`, `@copilotkit/react-core: 1.57.1`). Continue this convention for `@octokit/rest` and `zod`.

### Integration Points
- New file: `lib/types.ts` — exports the response discriminated union and (per D-08) is imported by both the route and (in Phase 3) the UI dispatcher in `PRResultPanel`.
- New file: `app/api/analyze-pr/route.ts` — the curl-testable endpoint. Sibling to `app/api/copilotkit/route.ts`.
- `package.json` — adds `@octokit/rest@22.0.x` and `zod@4.4.x` to `dependencies` (not devDependencies — they run at request time).

</code_context>

<specifics>
## Specific Ideas

- Curl-testability is an explicit success criterion (ROADMAP.md Phase 2 success #2). The route must work with `curl -X POST -H 'Content-Type: application/json' -d '{"url":"https://github.com/owner/repo/pull/N"}' http://localhost:3000/api/analyze-pr` and return parseable JSON. No CSRF tokens, no session cookies, no auth headers required from the caller — server-side `GITHUB_TOKEN` is the only secret involved.
- Verification reproducibility: after planning, choose 2-3 known public PRs (one small, one mid-sized, one >300 files) for curl-based verification. The >300-file PR proves D-10 actually returns the size-exceeded shape via the metadata-first path.

</specifics>

<deferred>
## Deferred Ideas

- **Status union extension (Phase 3):** add `'private-repo' | 'not-found' | 'invalid-url'` (or fold invalid-url into HTTP 400) when wiring FETCH-04 and FETCH-05. The discriminated union is open by design.
- **PRAnalysis per-card-type signal shape:** user explicitly skipped this gray area. Decide during Phase 3 LLM structured-output design or planner-led.
- **Manual page-loop with mid-pagination abort:** considered and rejected — metadata-first gating (D-10) makes mid-pagination abort unnecessary for v1.
- **Permissive URL parsing (`?diff=split`, `/files` suffix tolerance):** rejected for v1; revisit if user testing shows real friction.
- **Octokit.request raw diff endpoint** (`GET /repos/{owner}/{repo}/pulls/{number}` with `mediaType.format: 'diff'`) — explicitly avoided by Phase 2's success criterion #4 ("uses paginated `/files` endpoint, not the single-response diff endpoint").

</deferred>

---

*Phase: 02-type-system-github-api-integration*
*Context gathered: 2026-05-09*
