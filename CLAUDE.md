<!-- GSD:project-start source:PROJECT.md -->
## Project

**PR Review Copilot**

A web tool where you paste a GitHub PR URL and get a completely different review interface depending on what's actually in the diff. Security-sensitive change → security checklist card. Big refactor → architecture impact card. API change → before/after surface card. Small bug fix → simple approve/comment card. The interface adapts to the PR — not the other way around.

**Core Value:** The right review interface for this specific PR, so reviewers focus on the real risks instead of generating noise.

### Constraints

- **Tech Stack**: Next.js + CopilotKit + GitHub API + Claude (LLM) — decided upfront
- **Scope**: MVP is 4 PR types, 4 component sets — no scope creep past this for v1
- **Demo**: Must show 3 distinct PR types rendering 3 distinct UIs — that's the success condition
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.x (`create-next-app@latest`) | Full-stack React framework | CopilotKit's native environment; App Router + Route Handlers host the CopilotKit runtime endpoint cleanly; Turbopack default in v16 speeds local dev |
| React | 19.2.x (bundled with Next.js 16) | UI rendering | Next.js 16 ships React 19.2; CopilotKit 1.x requires React 18+, React 19 is compatible |
| TypeScript | 5.x (included via create-next-app) | Type safety | Required for Zod schema inference on LLM output; CopilotKit types are TypeScript-first |
| @copilotkit/react-core | 1.56.x | CopilotKit provider + hooks (`useCopilotAction`) | Only package needed when not using the pre-built chat sidebar; provides `CopilotKit` context provider and all generative UI hooks |
| @copilotkit/runtime | 1.57.x | Server-side CopilotKit runtime | Required for `CopilotRuntime`, `AnthropicAdapter`, and `copilotRuntimeNextJSAppRouterEndpoint`; lives in the Route Handler at `app/api/copilotkit/route.ts` |
| @anthropic-ai/sdk | 0.95.x | Anthropic Claude API client | Passed directly into `AnthropicAdapter`; CopilotKit's official integration pattern uses the native Anthropic SDK, not the Vercel AI SDK wrapper |
| @octokit/rest | 22.0.x | GitHub REST API client | Typed wrapper with built-in `mediaType.format: "diff"` support; lighter than the full `octokit` bundle |
| Zod | 4.4.x | JSON schema validation + TypeScript inference | Validates LLM structured output; generates JSON Schema from TypeScript types alongside Anthropic's native structured outputs beta |
### Supporting Libraries
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| @copilotkit/react-ui | 1.56.x | Pre-built chat sidebar, popup, textarea | **Skip for v1** — renders custom classification cards, not a chat interface |
| Tailwind CSS | 4.x (included via create-next-app) | Utility-first styling | v4 uses `@import "tailwindcss"` in globals.css + `@tailwindcss/postcss` plugin |
| shadcn/ui | latest via CLI | Accessible UI primitives (Card, Badge, Checkbox) | Copy-in components — `npx shadcn@latest add card badge checkbox` |
| server-only | npm built-in pattern | Prevent API keys leaking to client bundle | Import in any server module using `GITHUB_TOKEN` or `ANTHROPIC_API_KEY` |
## Installation
# 1. Scaffold project (TypeScript, Tailwind, App Router, Turbopack — all defaults in v16)
# 2. CopilotKit (frontend provider + hooks, server runtime)
# 3. Anthropic SDK (passed into CopilotKit's AnthropicAdapter)
# 4. GitHub API client
# 5. Schema validation for LLM output
# 6. shadcn/ui (copies component source into project, not an npm dep)
## CopilotKit Setup Details
### Route Handler — `app/api/copilotkit/route.ts`
- `AnthropicAdapter` accepts the native `@anthropic-ai/sdk` client — not a Vercel AI SDK provider.
- The `as any` cast is a known CopilotKit pattern due to a minor type mismatch in the adapter.
- `CopilotRuntime` can be instantiated with no arguments for the direct-to-LLM pattern.
### Provider — `app/layout.tsx`
### Generative UI Hook — Client Component
## GitHub API Approach
## LLM Classification Architecture
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | Exposes key in browser bundle | `ANTHROPIC_API_KEY` server-only env var |
| `NEXT_PUBLIC_GITHUB_TOKEN` | Same exposure risk | `GITHUB_TOKEN` server-only |
| `@copilotkit/react-ui` for v1 | Chat sidebar not needed; adds bundle weight | Only `@copilotkit/react-core` + custom shadcn/ui cards |
| LangGraph JS | Overkill for single classify → render | CopilotKit direct-to-LLM (`CopilotRuntime` + `AnthropicAdapter`) |
| `ai` package (Vercel AI SDK) | Second SDK with no additive value | `@anthropic-ai/sdk` directly |
| `next-auth` | No user accounts; stateless demo | None — server-side token in env var |
| GitHub GraphQL API | Needs GraphQL client; REST is sufficient | GitHub REST API via `@octokit/rest` |
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@copilotkit/react-core@1.56.x` | React 18+, 19.x | React 19 (Next.js 16) is compatible |
| `@copilotkit/runtime@1.57.x` | `@anthropic-ai/sdk@0.95.x` | Pin both to same minor at install |
| `@anthropic-ai/sdk@0.95.x` | Node.js 18+ | Next.js 16 requires Node 18.18+ |
| `@octokit/rest@22.x` | Node.js 18+ | Pure ESM; works with App Router server-side modules |
| `zod@4.x` | TypeScript 5.x | Zod 4 requires TypeScript 5.0+ |
| Tailwind CSS v4 | `@tailwindcss/postcss` | v4 splits PostCSS plugin; `create-next-app --yes` handles this |
## Open Questions
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
