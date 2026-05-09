# Stack Research

**Domain:** AI-powered PR review tool — Next.js + CopilotKit + GitHub API + Claude LLM
**Researched:** 2026-05-09
**Confidence:** HIGH (core technologies verified via npm registry and official docs as of research date)

---

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

---

## Installation

```bash
# 1. Scaffold project (TypeScript, Tailwind, App Router, Turbopack — all defaults in v16)
npx create-next-app@latest pr-review-copilot --yes
cd pr-review-copilot

# 2. CopilotKit (frontend provider + hooks, server runtime)
npm install @copilotkit/react-core @copilotkit/runtime

# 3. Anthropic SDK (passed into CopilotKit's AnthropicAdapter)
npm install @anthropic-ai/sdk

# 4. GitHub API client
npm install @octokit/rest

# 5. Schema validation for LLM output
npm install zod

# 6. shadcn/ui (copies component source into project, not an npm dep)
npx shadcn@latest init
npx shadcn@latest add card badge checkbox
```

---

## CopilotKit Setup Details

### Route Handler — `app/api/copilotkit/route.ts`

```typescript
import {
  CopilotRuntime,
  AnthropicAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const serviceAdapter = new AnthropicAdapter({ anthropic: anthropic as any });
const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
```

Notes:
- `AnthropicAdapter` accepts the native `@anthropic-ai/sdk` client — not a Vercel AI SDK provider.
- The `as any` cast is a known CopilotKit pattern due to a minor type mismatch in the adapter.
- `CopilotRuntime` can be instantiated with no arguments for the direct-to-LLM pattern.

### Provider — `app/layout.tsx`

```typescript
import { CopilotKit } from "@copilotkit/react-core";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
```

### Generative UI Hook — Client Component

```typescript
"use client";
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "renderPRReview",
  description: "Render the appropriate PR review card based on classification",
  parameters: [
    { name: "type", type: "string", enum: ["security", "refactor", "api-change", "bug-fix"] },
    { name: "signals", type: "object" },
  ],
  render: ({ args }) => {
    if (args.type === "security") return <SecurityReviewCard signals={args.signals} />;
    // ... other types
  },
});
```

---

## GitHub API Approach

Use `@octokit/rest` server-side. Two separate calls:

```typescript
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Fetch raw diff text
const { data: diff } = await octokit.rest.pulls.get({
  owner,
  repo,
  pull_number: prNumber,
  mediaType: { format: "diff" },
});

// Fetch PR metadata (title, files changed, author)
const { data: prMeta } = await octokit.rest.pulls.get({ owner, repo, pull_number: prNumber });
```

Auth: `GITHUB_TOKEN` in `.env.local`. Classic PAT with `public_repo` scope covers public repos. Without a token, GitHub rate-limits unauthenticated requests to 60/hour.

---

## LLM Classification Architecture

The classification call runs **outside** CopilotKit in a dedicated route handler:

1. `POST /api/analyze-pr` — fetches diff via Octokit, calls Anthropic SDK with `betas: ["structured-outputs-2025-11-13"]` and a Zod-derived schema, returns `{ type, signals }`.
2. Client receives the classification result and triggers `useCopilotAction`-registered render.
3. CopilotKit's `/api/copilotkit` endpoint is for any follow-on conversational actions — not for the initial classification.

**Recommended model:** `claude-sonnet-4-5` — supports structured outputs, fast enough for diff analysis, strong code comprehension.

---

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

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `@copilotkit/react-core@1.56.x` | React 18+, 19.x | React 19 (Next.js 16) is compatible |
| `@copilotkit/runtime@1.57.x` | `@anthropic-ai/sdk@0.95.x` | Pin both to same minor at install |
| `@anthropic-ai/sdk@0.95.x` | Node.js 18+ | Next.js 16 requires Node 18.18+ |
| `@octokit/rest@22.x` | Node.js 18+ | Pure ESM; works with App Router server-side modules |
| `zod@4.x` | TypeScript 5.x | Zod 4 requires TypeScript 5.0+ |
| Tailwind CSS v4 | `@tailwindcss/postcss` | v4 splits PostCSS plugin; `create-next-app --yes` handles this |

---

## Open Questions

1. Whether `AnthropicAdapter` in CopilotKit 1.57.x supports the structured outputs beta header — if not, the classification call must bypass the CopilotKit runtime entirely (the architecture split above handles this).
2. Whether CopilotKit 1.56.x has resolved the `as any` cast requirement for the Anthropic client type.
3. Diff size limits: no guardrail confirmed for Claude Sonnet 4.5's effective context window for large PR diffs — needs a spike on truncation strategy.

---

*Stack research for: PR Review Copilot (Next.js + CopilotKit + GitHub API + Claude)*
*Researched: 2026-05-09*
