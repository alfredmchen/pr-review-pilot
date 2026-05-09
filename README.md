# PR Review Copilot

A web tool where you paste a GitHub PR URL and get a completely different review interface depending on what's actually in the diff.

- Security-sensitive change → security checklist with risk flags and OWASP-aligned items
- Big refactor → architecture impact card (files moved, dependency churn, test delta)
- API change → before/after endpoint surface with breaking-change flags
- Small bug fix → simple approve/comment card with root cause and blast radius

The interface adapts to the PR — not the other way around — so reviewers focus on the real risks instead of generating noise.

## How it works

```
Paste PR URL  →  Fetch metadata + diff (Octokit)  →  Classify (Claude, structured output)  →  Render type-specific card
```

One Claude call returns a Zod-validated `PRAnalysis` object whose `prType` is exactly one of `security | refactor | api-change | bug-fix`. A dispatch component picks the matching card. CopilotKit's `useCopilotAction` hook registers each card type for the generative UI layer.

## Stack

| Layer            | Choice                                          |
| ---------------- | ----------------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack) + React 19   |
| Generative UI    | `@copilotkit/react-core` + `@copilotkit/runtime` |
| LLM              | Claude Sonnet 4.5 via `@anthropic-ai/sdk`       |
| GitHub API       | `@octokit/rest` (REST, paginated `/pulls/{id}/files`) |
| Schema validation | Zod 4                                          |
| Styling          | Tailwind CSS v4 + shadcn/ui primitives          |

Notable non-choices: no Vercel AI SDK (Anthropic SDK passes directly into CopilotKit's adapter), no LangGraph (overkill for one classify-then-render pass), no auth (stateless demo with a server-side PAT).

## Status

This is an in-progress project, built in four phases:

- [x] **Phase 1 — Scaffolding + security foundation.** Next.js app boots, CopilotKit runtime endpoint live at `/api/copilotkit`, env vars server-only (no `NEXT_PUBLIC_` prefixes on secrets).
- [ ] **Phase 2 — Type system + GitHub API integration.** Shared `lib/types.ts` contract and a curl-testable `/api/analyze-pr` route with paginated diff fetching and a size gate.
- [ ] **Phase 3 — LLM classification + core UI.** End-to-end pipeline: URL input → fetch → Claude structured output → result panel dispatch, with loading and error states.
- [ ] **Phase 4 — Four review cards + CopilotKit hook.** All four type-specific cards fully populated; `useCopilotAction` registered for generative UI.

Demo success condition: three different PR URLs producing three visibly distinct review UIs.

## Local development

Requires Node 18.18+.

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000.

### Environment variables

Both keys are server-only — never prefix either with `NEXT_PUBLIC_` or they will be inlined into the browser bundle at build time.

| Var                 | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| `GITHUB_TOKEN`      | Classic PAT with `public_repo` scope (read public diffs) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude classification              |

In Phase 1 a placeholder Anthropic key is enough for the runtime endpoint to register; a real key is only needed once classification is wired up in Phase 3.

## Scripts

| Command         | Action                              |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start dev server (Turbopack)        |
| `npm run build` | Production build                    |
| `npm run start` | Run the production build            |
| `npm run lint`  | ESLint with `eslint-config-next`    |

## Project layout

```
app/
  api/copilotkit/route.ts   CopilotKit runtime endpoint
  layout.tsx                Root layout (Server Component)
  providers.tsx             "use client" boundary wrapping <CopilotKit>
  page.tsx                  Home page
lib/
  server-only.ts            Guard against importing secrets into client code
.planning/                  Phase plans, requirements, roadmap
```

## License

Not yet licensed.
