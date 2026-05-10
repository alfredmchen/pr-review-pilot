# Walking Skeleton — PR Review Copilot

**Phase:** 1 — Scaffolding + Security Foundation
**Generated:** 2026-05-09

## Capability Proven End-to-End

After Phase 1 ships, a developer can run `npm run dev`, open `http://localhost:3000`, see a real Next.js page render with the Geist font, AND issue a curl POST to `/api/copilotkit` that hits a registered CopilotKit runtime route handler — the full architectural backbone (Browser → layout → providers → CopilotKit context → runtime endpoint → Anthropic SDK) is wired with secrets server-only from commit one.

There is no user-facing feature yet (no input field, no analyze button — that's Phase 3). The capability the skeleton proves is **infrastructural correctness**: every layer the future features will sit on is wired and verifiable.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) | CopilotKit's native environment; App Router Route Handlers host the runtime endpoint cleanly; v16 ships React 19.2 (CopilotKit 1.x compatible). Verified via npm registry on 2026-05-09. |
| UI runtime | React 19.2.0 (bundled with Next.js 16) | No alternative — bundled. CopilotKit 1.57.x compatibility confirmed in CLAUDE.md Version Compatibility table. |
| Language | TypeScript 5.x (bundled via create-next-app) | Required for downstream Zod schema inference (Phase 3 LLM output) and CopilotKit's TypeScript-first types. |
| CopilotKit client | `@copilotkit/react-core@1.57.1` | Provides `<CopilotKit>` context wrapper and `useCopilotAction` hook for Phase 4 generative UI. `@copilotkit/react-ui` deliberately NOT installed (chat sidebar not needed for v1; bundle weight). |
| CopilotKit server | `@copilotkit/runtime@1.57.1` + `BuiltInAgent` from `@copilotkit/runtime/v2` | Current documented pattern in 1.57.x docs (verified via Context7). `BuiltInAgent` reads `ANTHROPIC_API_KEY` from environment automatically — no explicit SDK instantiation. Fallback to `AnthropicAdapter` + `@anthropic-ai/sdk@0.95.x` documented if v2 import fails. |
| LLM | Claude Sonnet 4.5 (via `model: "anthropic:claude-sonnet-4-5"`) | Specified in CLAUDE.md tech stack; routed through CopilotKit's BuiltInAgent rather than direct SDK to keep the architecture aligned with current CopilotKit docs. |
| Secret storage | `.env.local` (gitignored) + `.env.local.example` (committed template) | Next.js convention; `import "server-only"` package guards modules at build time. NO `NEXT_PUBLIC_` prefix on any secret — would bake into JS bundle. |
| Client/server boundary | `app/providers.tsx` with `"use client"` directive; `app/layout.tsx` stays a Server Component | App Router default is Server Components; CopilotKit needs React context (client-only). Putting `<CopilotKit>` directly in `layout.tsx` throws `createContext is not a function`. The `providers.tsx` pattern is the canonical isolation point per RESEARCH.md Pattern 1. |
| Styling | Tailwind CSS 4.3.0 (CSS-first config) | Bundled via `create-next-app`; `@import "tailwindcss"` in `globals.css` + `@tailwindcss/postcss` plugin. shadcn/ui CLI deferred to Phase 3 when the first real components are added. |
| Auth | None (stateless demo) | Per CLAUDE.md / REQUIREMENTS.md Out of Scope: no user accounts, no sessions, no `next-auth`. The only "auth" is the server-side `GITHUB_TOKEN` env var used to call the GitHub API in Phase 2. |
| Deployment target | Local `npm run dev` (Turbopack) for Phase 1; Vercel preview deferred until Phase 3 has real user-visible functionality | Walking Skeleton needs proof the stack runs end-to-end; deploying an empty home page provides no additional verification value. |
| Directory layout | `app/` (App Router routes), `lib/` (server-only utility modules), no `src/` wrapper | Matches Next.js 16 default scaffold (`--no-src-dir`). `lib/server-only.ts` is the established home for the build-time guard module that Phase 2+ will import. |

## Stack Touched in Phase 1

- [x] **Project scaffold** — Next.js 16.2.6 + TypeScript + Tailwind v4 + ESLint via `create-next-app@16.2.6 . --yes`; Turbopack as default dev server.
- [x] **Routing** — At least one real route: `app/page.tsx` (home page Server Component) AND `app/api/copilotkit/route.ts` (runtime endpoint Route Handler).
- [ ] **Database** — N/A for Phase 1. The PR Review Copilot is a stateless URL-driven tool (per REQUIREMENTS.md Out of Scope: no session history, no persistence). No database is in any phase of v1.
- [x] **UI** — One real rendered page (home) with the design-system typography (Geist Sans, `text-2xl font-bold`) and spacing (`p-8`) from UI-SPEC. No interactive elements yet (Phase 3 adds the URL input).
- [x] **Server-side integration wired** — `<CopilotKit runtimeUrl="/api/copilotkit">` provider points at a real registered endpoint with `BuiltInAgent` configured for Anthropic Claude Sonnet 4.5.
- [x] **Local full-stack run command** — `npm run dev` exercises the full stack: page renders + runtime endpoint responds to curl. This is the documented verification command (Task 3 of `01-01-PLAN.md`).

**Note on the unchecked DB box:** PR Review Copilot is intentionally stateless. The Walking Skeleton template assumes a typical "user can sign up and see their name" flow that requires DB read+write. Our equivalent is "developer can run the app + the CopilotKit runtime route is registered + endpoint responds to a real HTTP POST" — the integration the project does have.

## Out of Scope (Deferred to Later Slices)

The following are deliberately NOT in Phase 1, even though they might appear in a typical Walking Skeleton. Each deferral is referenced to its phase or to an explicit out-of-scope decision:

- **`@anthropic-ai/sdk` direct usage** — deferred to Phase 3 when structured-output classification is built. Phase 1 uses `BuiltInAgent` which wraps the SDK internally.
- **`@octokit/rest` and any GitHub integration** — deferred to Phase 2 (`FETCH-01`, `FETCH-02`).
- **Zod schemas** — deferred to Phase 2 (type contract) and Phase 3 (LLM output validation).
- **shadcn/ui components (Card, Badge, Checkbox)** — deferred to Phase 3–4. UI-SPEC § shadcn gate note explicitly defers `npx shadcn@latest init` to Phase 3.
- **Real Anthropic API key in `.env.local`** — Phase 1 uses `ANTHROPIC_API_KEY=sk-ant-placeholder` to satisfy `BuiltInAgent` module-level constructor; real key only needed when CopilotKit actually calls Claude (Phase 4+).
- **Deployment to Vercel / production hosting** — deferred until Phase 3 has user-visible functionality worth previewing.
- **CI / GitHub Actions** — out of scope for v1 entirely.
- **Database / persistence** — out of scope for v1 entirely (REQUIREMENTS.md Out of Scope: "Session history / persistence — stateless URL-driven tool; no accounts").
- **Authentication (next-auth, OAuth)** — out of scope for v1 entirely.
- **CopilotKit chat sidebar (`@copilotkit/react-ui`)** — explicitly forbidden by CLAUDE.md "What NOT to Use" for v1.
- **Vercel AI SDK (`ai` package)** — explicitly forbidden by CLAUDE.md "What NOT to Use".
- **LangGraph JS** — explicitly forbidden by CLAUDE.md "What NOT to Use".
- **Dark mode** — UI-SPEC § Color: "Dark mode: Out of scope for v1."
- **PR Author prep mode, multi-file breakdown, copy-to-clipboard, raw diff viewer, OAuth for private repos** — all explicitly listed in REQUIREMENTS.md v2/Out of Scope.

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton WITHOUT altering any architectural decision in the table above. Specifically: no swapping CopilotKit for a different agent runtime, no introducing a database, no adding `next-auth`, no changing the `providers.tsx` boundary pattern.

- **Phase 2 — Type System + GitHub API Integration** (`FETCH-01`, `FETCH-02`):
  - Adds `lib/types.ts` (shared `PRType`, `PRAnalysis`, four signal shapes — Zod-derived).
  - Adds `app/api/analyze-pr/route.ts` (curl-testable endpoint that fetches PR metadata and full paginated diff via `@octokit/rest@22.0.x`).
  - Adds `lib/github.ts` with `import "../lib/server-only"` at the top to guard against client bundling of the GitHub token.
  - Adds size-exceeded structured signal for PRs > 300 files / 20k lines.
  - User capability gained: a developer can curl the analyze-pr endpoint and get real PR data back.

- **Phase 3 — LLM Classification + Core UI** (`FETCH-03`, `FETCH-04`, `FETCH-05`, `CLASS-01`):
  - Initializes shadcn/ui (`npx shadcn@latest init` per UI-SPEC § shadcn gate note) and installs `card`, `badge`, `checkbox` blocks.
  - Adds `@anthropic-ai/sdk@0.95.x` for direct structured-output classification (the BuiltInAgent runtime stays for Phase 4 generative UI).
  - Adds the home-page URL input + Analyze PR button (UI-SPEC Copywriting Contract).
  - Adds loading skeleton (within 100ms), private-repo error message (verbatim copy), PR-too-large warning card.
  - Adds `PRResultPanel` dispatcher with placeholder cards for all four `prType` values.
  - User capability gained: a real user can paste a PR URL and see a classified placeholder card.

- **Phase 4 — Four Review Cards + CopilotKit Hook** (`CARD-01`, `CARD-02`, `CARD-03`, `CARD-04`):
  - Replaces the four placeholder cards with fully populated security/refactor/api-change/bug-fix cards (severity badges, OWASP checklist, before/after surface, etc.).
  - Registers `useCopilotAction` with `render` for all four card types — wires to the `<CopilotKit>` runtime established in Phase 1.
  - User capability gained: the demo shows three distinct PR URLs producing three visually distinct, fully-populated review cards.

**Architectural invariants maintained across all four phases:**
- `app/providers.tsx` first line is `"use client";` — never changes.
- `app/layout.tsx` is never marked `"use client"` — stays a Server Component.
- No `NEXT_PUBLIC_` prefix on any secret, ever.
- All modules reading `GITHUB_TOKEN` or `ANTHROPIC_API_KEY` import `lib/server-only.ts` at the top.
- The CopilotKit runtime endpoint stays at `/api/copilotkit`; the `runtimeUrl` prop on `<CopilotKit>` stays a same-origin relative URL.
