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
| LLM              | Claude Haiku 4.5 via `@anthropic-ai/sdk`        |
| GitHub API       | `@octokit/rest` (REST, paginated `/pulls/{id}/files`) |
| Schema validation | Zod 4                                          |
| Styling          | Tailwind CSS v4 + shadcn/ui primitives          |

Notable non-choices: no Vercel AI SDK (Anthropic SDK passes directly into CopilotKit's adapter), no LangGraph (overkill for one classify-then-render pass), no auth (stateless demo with a server-side PAT).

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
| `GITHUB_TOKEN`      | Classic PAT with `public_repo` scope (read public diffs) — optional but raises rate limit from 60/hr to 5000/hr |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude classification — required for the LLM call |

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
  api/analyze-pr/route.ts   POST endpoint — fetch + size gate + classify
  api/copilotkit/route.ts   CopilotKit runtime endpoint
  layout.tsx                Root layout (Server Component)
  providers.tsx             "use client" boundary wrapping <CopilotKit>
  page.tsx                  Home page (server-rendered shell + form mount)
components/
  CopilotPRResultPanel.tsx  Client wrapper registering useCopilotAction
  PRResultPanel.tsx         Status + prType dispatcher (exhaustive switch)
  PRUrlForm.tsx             Input form with useTransition (100ms skeleton)
  cards/                    8 cards: 4 prType + 4 status (private-repo, etc.)
  ui/                       shadcn primitives (button, card, alert, …)
lib/
  types.ts                  Shared contract: PRType, AnalyzeResponse, signals
  anthropic.ts              classifyPR() — server-only Anthropic client
  server-only.ts            Guard against importing secrets into client code
  utils.ts                  shadcn cn() helper
.planning/                  Phase plans, milestone archives, project state
```

## License

Not yet licensed.
