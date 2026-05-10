---
phase: 01-scaffolding-security-foundation
plan: 01
subsystem: infra
tags: [nextjs, copilotkit, tailwind, typescript, server-only, security]

# Dependency graph
requires: []
provides:
  - Next.js 16.2.6 App Router project scaffolded at repo root
  - CopilotKit runtime endpoint live at /api/copilotkit (BuiltInAgent, Claude Sonnet 4.5)
  - Client/server boundary via app/providers.tsx ("use client") + app/layout.tsx (Server Component)
  - Walking-skeleton home page rendering H1 "PR Review Copilot" + subtitle
  - server-only build-time guard module at lib/server-only.ts
  - Secrets locked out of git from commit one (.gitignore + .env.local.example template)
affects: [02-type-system-github-api, 03-llm-classification-core-ui, 04-review-cards-copilotkit-hook]

# Tech tracking
tech-stack:
  added:
    - next@16.2.6 (App Router, Turbopack)
    - react@19.2.0
    - react-dom@19.2.0
    - "@copilotkit/react-core@1.57.1"
    - "@copilotkit/runtime@1.57.1"
    - server-only@0.0.1
    - tailwindcss@4.3.0 (bundled by create-next-app)
    - typescript@5.9.3 (bundled)
  patterns:
    - "providers.tsx client boundary: app/providers.tsx carries 'use client'; app/layout.tsx stays Server Component"
    - "BuiltInAgent primary: CopilotKit runtime uses BuiltInAgent from @copilotkit/runtime/v2; no direct @anthropic-ai/sdk needed in Phase 1"
    - "server-only guard: lib/server-only.ts re-exports 'server-only'; Phase 2+ modules reading GITHUB_TOKEN/ANTHROPIC_API_KEY import this at the top"
    - "Secret hygiene: .env.local gitignored; .env.local.example committed with placeholders and inline NEXT_PUBLIC_ warnings"

key-files:
  created:
    - app/providers.tsx
    - app/layout.tsx
    - app/page.tsx
    - app/api/copilotkit/route.ts
    - lib/server-only.ts
    - .env.local.example
    - .planning/phases/01-scaffolding-security-foundation/01-SKELETON.md
  modified:
    - package.json
    - package-lock.json
    - tsconfig.json
    - next.config.ts
    - postcss.config.mjs
    - .gitignore
    - app/globals.css

key-decisions:
  - "BuiltInAgent (not AnthropicAdapter): BuiltInAgent from @copilotkit/runtime/v2 worked as the primary pattern in 1.57.1 — @anthropic-ai/sdk not installed in Phase 1"
  - "Scaffolded to /tmp then copied: create-next-app refuses non-empty directories; files copied into project root without overwriting .git/.planning/CLAUDE.md"
  - "providers.tsx boundary established in Phase 1: irreversible if deferred; all future phases depend on this pattern"
  - "No NEXT_PUBLIC_ prefix on any secret: enforced by .gitignore, .env.local.example warnings, and automated verify grep gate"

patterns-established:
  - "Pattern 1 (client boundary): app/providers.tsx with 'use client' wraps <CopilotKit runtimeUrl='/api/copilotkit'>; app/layout.tsx imports <Providers> as a Server Component"
  - "Pattern 2 (runtime endpoint): app/api/copilotkit/route.ts exports POST using CopilotRuntime + BuiltInAgent + copilotRuntimeNextJSAppRouterEndpoint"
  - "Pattern 3 (server-only guard): lib/server-only.ts contains import 'server-only'; modules reading secrets import this at the top"
  - "Pattern 4 (.env hygiene): .env.local gitignored from commit one; .env.local.example committed with empty-value placeholders and prohibition comments"

requirements-completed: []

# Metrics
duration: ~45min
completed: 2026-05-09
---

# Phase 1 Plan 01: Walking Skeleton Summary

**Next.js 16.2.6 + CopilotKit 1.57.1 walking skeleton with BuiltInAgent runtime endpoint, providers.tsx client boundary, and server-only secret hygiene enforced from commit one**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-09
- **Completed:** 2026-05-09
- **Tasks:** 3 (Tasks 1+2 automated; Task 3 human-verify checkpoint approved 2026-05-09)
- **Files modified:** 14

## Accomplishments

- Scaffolded Next.js 16.2.6 App Router project with TypeScript, Tailwind v4, and Turbopack into a non-empty git repo (scaffolded to /tmp then copied)
- Wired full client/server boundary: `app/providers.tsx` ("use client") wraps `<CopilotKit runtimeUrl="/api/copilotkit">`; `app/layout.tsx` stays a Server Component
- CopilotKit runtime endpoint live at `/api/copilotkit` using `BuiltInAgent` from `@copilotkit/runtime/v2` (reads `ANTHROPIC_API_KEY` from env automatically — `@anthropic-ai/sdk` not installed in Phase 1)
- Secrets locked out of git from commit one: `.gitignore` blocks `.env.local`; `.env.local.example` committed with empty-value placeholders and inline NEXT_PUBLIC_ prohibition comments
- Walking-skeleton home page renders H1 "PR Review Copilot" and subtitle "Paste a GitHub PR URL to get started." with Geist font and Tailwind v4 design system classes
- `lib/server-only.ts` build-time guard module created for Phase 2+ modules reading `GITHUB_TOKEN` / `ANTHROPIC_API_KEY`

## CopilotKit Pattern Used

**Primary pattern: `BuiltInAgent` from `@copilotkit/runtime/v2`**

```typescript
import { BuiltInAgent } from "@copilotkit/runtime/v2";
const builtInAgent = new BuiltInAgent({ model: "anthropic:claude-sonnet-4-5" });
const runtime = new CopilotRuntime({ agents: { default: builtInAgent } });
```

`BuiltInAgent` reads `ANTHROPIC_API_KEY` from `process.env` automatically. No explicit `@anthropic-ai/sdk` instantiation required. The `AnthropicAdapter` fallback documented in the plan was NOT needed.

**`@anthropic-ai/sdk` installed:** No. Not required when using `BuiltInAgent`. Deferred to Phase 3 when direct structured-output classification is built.

## Final Installed Versions

From `npm ls --depth=0`:

| Package | Version |
|---------|---------|
| next | 16.2.6 |
| react | 19.2.0 |
| react-dom | 19.2.0 |
| @copilotkit/react-core | 1.57.1 |
| @copilotkit/runtime | 1.57.1 |
| server-only | 0.0.1 |
| tailwindcss | 4.3.0 |
| typescript | 5.9.3 |
| @tailwindcss/postcss | 4.3.0 |

## ROADMAP Success Criteria — All 4 PASSED

User approved the Task 3 human-verify checkpoint on 2026-05-09 after running all 6 verification steps.

1. **`npm run dev` starts cleanly; home page renders** — PASSED. Turbopack starts, prints `▲ Next.js 16.2.6`, H1 and subtitle render with Geist font, no error overlay.
2. **No `NEXT_PUBLIC_*` prefixed secrets** — PASSED. `grep -rn NEXT_PUBLIC_ANTHROPIC\|NEXT_PUBLIC_GITHUB` returns no matches anywhere in `app/` or `lib/`. `.env.local` confirmed gitignored via `git check-ignore -v`.
3. **`providers.tsx` is client boundary; `layout.tsx` is Server Component** — PASSED. `app/providers.tsx` first non-blank line is `"use client";`. `app/layout.tsx` contains no `"use client"` directive and imports `<Providers>` correctly.
4. **`/api/copilotkit` POST returns non-404** — PASSED. `curl -i -X POST http://localhost:3000/api/copilotkit -H "Content-Type: application/json" -d '{}'` returns non-404 (CopilotKit processes the request). `curl -i GET` returns 405 (route registered, method not allowed).

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 + install CopilotKit + lock secrets** - `6a8160b` (chore)
2. **Task 2: Wire client/server boundary, runtime endpoint, walking-skeleton home page** - `c7a82c8` (feat)
3. **Task 3: Human-verify checkpoint** - approved 2026-05-09 (no code commit — verification only)

**Plan metadata:** (this commit)

## Files Created/Modified

**Created:**
- `app/providers.tsx` — Client boundary; `"use client"` + `<CopilotKit runtimeUrl="/api/copilotkit">`
- `app/layout.tsx` — Root Server Component layout; imports `<Providers>`, Geist font, PR Review Copilot metadata
- `app/page.tsx` — Walking-skeleton home page; H1 + subtitle; no "use client"
- `app/api/copilotkit/route.ts` — CopilotKit runtime endpoint; `BuiltInAgent` + `CopilotRuntime` + `POST` export
- `lib/server-only.ts` — Build-time guard module; `import "server-only"` + empty export
- `.env.local.example` — Committed template; `GITHUB_TOKEN=` and `ANTHROPIC_API_KEY=` with prohibition comments
- `.planning/phases/01-scaffolding-security-foundation/01-SKELETON.md` — Architectural decisions doc

**Modified:**
- `package.json` — Pinned exact versions; added `@copilotkit/react-core`, `@copilotkit/runtime`, `server-only`
- `package-lock.json` — Lockfile reflecting pinned versions
- `tsconfig.json` — create-next-app defaults
- `next.config.ts` — create-next-app defaults
- `postcss.config.mjs` — `@tailwindcss/postcss` plugin (Tailwind v4)
- `.gitignore` — Added `.env.local`, `.env*.local`, `!.env.local.example` block
- `app/globals.css` — Tailwind v4 `@import "tailwindcss"` (not v3 directives)

## Decisions Made

- **BuiltInAgent primary, AnthropicAdapter not triggered:** `BuiltInAgent` from `@copilotkit/runtime/v2` exported cleanly in 1.57.1 — fallback not needed. `@anthropic-ai/sdk` deferred to Phase 3.
- **Scaffolded to /tmp first:** `create-next-app` refuses non-empty directories; workaround was scaffold to `/tmp/scaffold-pr-review-copilot`, then copy generated files into repo root (excluding `.git/`, `.gitignore`, `README.md`, `node_modules/`).
- **BuiltInAgent model string:** Used `"anthropic:claude-sonnet-4-5"` as specified in the plan; this is the string format `BuiltInAgent` expects for the Anthropic provider.

## Deviations from Plan

None significant — plan executed as written. The `BuiltInAgent` primary pattern worked without triggering the `AnthropicAdapter` fallback. The scaffolding-to-non-empty-directory workaround was anticipated in the plan's Task 1 action block ("alternately scaffold to `/tmp/...` and copy the generated files").

## Issues Encountered

None beyond the documented scaffolding workaround for non-empty directory. `BuiltInAgent` import resolved cleanly; no TypeScript errors; Tailwind v4 configuration generated correctly by `create-next-app`.

## User Setup Required

None — no external service configuration required for Phase 1. Real API keys are needed starting Phase 4 when CopilotKit actually calls Claude. Phase 1 ships with `ANTHROPIC_API_KEY=sk-ant-placeholder` in `.env.local` (gitignored; never committed).

## Next Phase Readiness

Phase 2 (Type System + GitHub API Integration) can begin immediately:
- `lib/server-only.ts` guard module ready for import in `lib/github.ts`
- `app/providers.tsx` client boundary established — no renegotiation needed
- `/api/copilotkit` endpoint live — Phase 4 `useCopilotAction` hook has a registered runtime to target
- `.env.local.example` template ready — `GITHUB_TOKEN=` placeholder exists for Phase 2 PAT

**Blockers/concerns inherited from STATE.md:**
- Phase 3 spike: whether `AnthropicAdapter` passes through `betas: ["structured-outputs-2025-11-13"]` is unconfirmed — direct `@anthropic-ai/sdk` call may be needed alongside CopilotKit runtime
- Phase 4 spike: `useCopilotAction` with `render` property API needs doc verification before Phase 4 begins

---
*Phase: 01-scaffolding-security-foundation*
*Completed: 2026-05-09*

## Self-Check: PASSED

Verified:
- `6a8160b` present in git log: confirmed
- `c7a82c8` present in git log: confirmed
- `app/providers.tsx` exists: confirmed
- `app/layout.tsx` exists: confirmed
- `app/page.tsx` exists: confirmed
- `app/api/copilotkit/route.ts` exists: confirmed
- `lib/server-only.ts` exists: confirmed
- `.env.local.example` exists: confirmed
- `01-SKELETON.md` accurately documents `BuiltInAgent` as primary pattern: confirmed (no update needed)
- `01-SKELETON.md` documents `AnthropicAdapter` as documented fallback only: confirmed
