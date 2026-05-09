# Phase 2: Type System + GitHub API Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 02-type-system-github-api-integration
**Areas discussed:** URL parsing + validation, Size-exceeded response shape, Pagination + early-abort

---

## Gray-Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| PRAnalysis type shape | Discriminated union on prType vs flat object with optional signals | |
| URL parsing + validation | Strict regex vs permissive extraction vs strict + normalize | ✓ |
| Size-exceeded response shape | 200 + status field vs HTTP 413 vs hybrid | ✓ |
| Pagination + early-abort strategy | metadata-first abort vs paginate-then-check vs manual loop | ✓ |

**User's choice:** Three of four areas selected; PRAnalysis type shape deferred to researcher/planner discretion.
**Notes:** Skipping the per-card-type signal shape leaves it open for Phase 3 (when the LLM structured output schema is designed). CONTEXT.md flags this in `Claude's Discretion`.

---

## URL Parsing + Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Strict regex match | Only accept `https://github.com/{owner}/{repo}/pull/{N}` (with optional trailing slash). Anything else → 400 | ✓ |
| Permissive extraction | Parse owner/repo/PR# from any string containing them; tolerate `?diff=split`, fragments, `/files` suffix | |
| Strict regex + normalize | Strict pattern but pre-trim whitespace and strip query/fragment/suffixes before matching | |

**User's choice:** Strict regex match.
**Notes:** Locked as `^https://github\.com/{owner}/{repo}/pull/{N}/?$` with HTTPS only and optional trailing slash. Garbage inputs return HTTP 400 — request validation failure, not an application state. No follow-up.

---

## Size-Exceeded Response Shape

| Option | Description | Selected |
|--------|-------------|----------|
| 200 + typed status field | Always 200; body is discriminated union keyed on `status`; UI dispatcher switches on it | ✓ |
| HTTP 413 + error body | 413 Payload Too Large with `{error:{code:'size-exceeded', ...}}`; conventional REST | |
| 200 for size-exceeded, 4xx for invalid input only | Hybrid: 400 for invalid URL, 200 for size-exceeded since it's a valid PR routed to a different card | |

**User's choice:** 200 + typed status field.
**Notes:** All expected application outcomes flow through the same 200 + `status` discriminator. HTTP errors reserved for transport failures (5xx) and request validation (400 for invalid URL). Phase 3's `PRResultPanel` can switch on `status` cleanly.

### Follow-up: Status Set Enumeration

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-2-minimal: `ok \| size-exceeded` | Only what Phase 2 needs; Phase 3 extends the union when adding private-repo etc. | ✓ |
| Forward-compat full set | Enumerate `ok \| size-exceeded \| private-repo \| not-found \| invalid-url` now | |
| Forward-compat + transport errors stay HTTP | Same as above with explicit 5xx for unexpected GitHub failures | |

**User's choice:** Phase-2-minimal.
**Notes:** Discriminated unions extend cleanly in TypeScript; Phase 3 will add union members as it implements FETCH-04/FETCH-05 UI surfaces. Keeps this phase tight.

---

## Pagination + Early-Abort

| Option | Description | Selected |
|--------|-------------|----------|
| Read PR metadata first; abort before pagination | GET `/pulls/{id}` returns `changed_files`; size-gate before paginating `/files` | ✓ |
| `octokit.paginate()` then check | Fetch all pages, sum patch lines, then check thresholds | |
| Manual loop with early-abort during pagination | Loop pages manually; break the moment a threshold is crossed | |

**User's choice:** Metadata-first abort.
**Notes:** Cheapest path — single API call for huge PRs that we will not classify anyway. `changed_files` and `additions+deletions` from PR metadata are sufficient signals.

### Follow-up: Pagination Tactics + Auth

| Option | Description | Selected |
|--------|-------------|----------|
| `octokit.paginate()` + always pass `GITHUB_TOKEN` | Use Octokit's paginate helper; auth Octokit unconditionally for higher rate limits | ✓ |
| `octokit.paginate()` + no token for public repos | Skip auth until Phase 3 adds private-repo handling | |
| Manual loop + always pass `GITHUB_TOKEN` | Hand-roll the page loop | |

**User's choice:** `octokit.paginate()` + always pass `GITHUB_TOKEN`.
**Notes:** Authenticated requests get 5000/hr vs anonymous 60/hr; token is server-only (Phase 1 lockdown) so no exposure risk. Public repos still benefit.

---

## Claude's Discretion

- **PRAnalysis per-card-type signal shape** — user explicitly skipped this gray area. Researcher/planner decide whether to use a discriminated union by `prType` or a flat object with all signals optional. Constraint: shape must be importable by both the API route (now) and Phase 4 card components (later) without circular dependencies.
- **File patch representation** — keep Octokit's native shape (`{filename, status, additions, deletions, patch}`). Do not pre-concat into a unified-diff string. Phase 3 derives whatever the LLM call needs.
- **Zod schema layout** — adjacent to type definitions in `lib/types.ts` (or sibling `lib/schemas.ts` if it grows). Use `z.infer<>` to keep TS types and runtime schemas in sync.

## Deferred Ideas

- Status union extension (`'private-repo' | 'not-found' | 'invalid-url'`) — Phase 3, alongside FETCH-04/FETCH-05.
- PRAnalysis per-card-type signal shape — Phase 3, when LLM structured output schema is designed.
- Manual page-loop with mid-pagination abort — rejected for v1 (metadata-first gating makes it unnecessary).
- Permissive URL parsing (`?diff=split`, `/files` suffix tolerance) — rejected for v1; revisit if user testing surfaces real friction.
- Octokit raw-diff endpoint (`mediaType.format: 'diff'`) — explicitly avoided by Phase 2 success criterion #4.
