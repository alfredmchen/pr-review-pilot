# Architecture Research — PR Review Copilot

**Mode:** Ecosystem / Architecture
**Confidence:** HIGH

---

## Key Findings

1. **GitHub API calls belong on the server, never the client.** GitHub tokens in `NEXT_PUBLIC_` env vars are client-visible. Server-side API routes avoid CORS issues, token exposure, and rate-limit pressure. The correct pattern is a Next.js API route at `/api/analyze-pr` that runs GitHub fetch + Anthropic classification as a single orchestrated round trip.

2. **The LLM classification call also belongs in the server API route, not in CopilotKit's runtime.** CopilotKit's `/api/copilotkit` runtime is for conversational/agentic flows. Routing a deterministic structured-output classification through CopilotKit's runtime adds unnecessary indirection and exposes sensitive API calls. Use `@anthropic-ai/sdk` directly in the server route with a forced tool call for structured output.

3. **CopilotKit's generative UI pattern for this use case is "static generative UI."** Engineers define all four card components upfront; the LLM returns a `prType` field from a structured schema; the frontend maps `prType` → component via a `CARD_MAP`. This is the most reliable generative UI pattern — no arbitrary UI generation, full visual control.

4. **`useCopilotAction` with a `render` property is the right integration hook.** It registers the four-component set with CopilotKit's context and allows the optional chat UI to trigger card rendering. The `render` function receives `args` from the LLM and returns the matching React component.

5. **One page, conditional rendering — not separate routes.** The demo's core value is "same URL input, three completely different UIs." Separate routes require navigation (URL change, page transition) which contradicts the product promise.

---

## Component Boundaries & Data Flow

```
Browser: URL input form
  ↓ POST { url }
Next.js: /api/analyze-pr/route.ts
  ├── → GitHub REST API (server→server, GITHUB_TOKEN in env)
  │       GET /repos/{owner}/{repo}/pulls/{n}          → PR metadata
  │       GET /repos/{owner}/{repo}/pulls/{n}/files    → diff + file list
  └── → Anthropic SDK (server→server, ANTHROPIC_API_KEY in env)
          messages.create() with forced tool call
          → returns PRAnalysis { prType, signals }
  ↓ JSON response
Browser: setAnalysis(data)
  ↓ React render
PRResultPanel: CARD_MAP[analysis.prType]
  → SecurityReviewCard | RefactorImpactCard | APIChangeCard | BugFixCard
```

CopilotKit's `/api/copilotkit` route runs in parallel for the optional chat UI — it is **not** in the primary analysis flow.

---

## Suggested Build Order

1. `lib/types.ts` — Define `PRType`, `PRAnalysis`, four signal shapes (everything else consumes these)
2. `/api/analyze-pr/route.ts` — GitHub fetch + Claude structured call, testable with curl before any React work
3. `app/layout.tsx` — Wrap with `<CopilotKit runtimeUrl="/api/copilotkit">`
4. `/api/copilotkit/route.ts` — CopilotRuntime + AnthropicAdapter boilerplate
5. URL input form + `app/page.tsx` — Wire form to call the analyze route, store result in state
6. `PRResultPanel` with `CARD_MAP` — Conditional switcher with placeholder divs initially
7. Four review card components — Replace placeholders one by one, each testable with mock data
8. `useCopilotAction` registration — Additive CopilotKit hook; does not change primary flow

---

## CopilotKit Generative UI Pattern Details

CopilotKit defines three generative UI patterns. **Static generative UI** is correct for this project:

- Engineers define all component variants upfront (the four card types)
- The LLM picks which to display via structured output (not arbitrary UI generation)
- `useCopilotAction({ name, parameters, render: ({ args }) => <Card {...args} /> })` is the hook
- The `render` function is called by CopilotKit when the LLM calls the registered action
- `args` are typed from the parameter schema — map directly to component props
- `status` property (`"inProgress"` | `"complete"`) on `args` enables loading states during streaming

---

## Open Questions / Flags

- **CopilotKit version compatibility:** Verify whether `useCopilotAction` with the `render` property is still the recommended pattern for non-LangGraph setups in the current version, or if `useAgent` from the AG-UI protocol is preferred.
- **Anthropic structured output API:** Tool call (forced) vs. native JSON schema mode — tool call is more reliable for classification. Verify which SDK version and whether native `output_config.format` is GA.
- **GitHub diff size limits:** Large PRs can exceed Claude's context window. The analysis route needs a truncation strategy. Flag for pitfalls.

---

## Roadmap Implications

Architecture drives a clear build order: types → server route → CopilotKit wiring → UI shell → card components → CopilotKit hook. Each step is independently testable before the next begins.
