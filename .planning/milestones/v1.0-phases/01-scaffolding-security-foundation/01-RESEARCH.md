# Phase 1: Scaffolding + Security Foundation - Research

**Researched:** 2026-05-09
**Domain:** Next.js 16 App Router scaffolding, CopilotKit runtime wiring, server-only env var enforcement
**Confidence:** HIGH

---

## Summary

Phase 1 establishes the skeleton that all subsequent phases build on. The goal is narrow: a running Next.js 16 app with three security-critical postures locked in from commit one. These postures cannot be retrofitted without risk of regressions across all files, which is why they belong in Phase 1 and no later.

The three locked postures are: (1) API keys exist only in server-only env vars with no `NEXT_PUBLIC_` prefix, enforced both by Next.js convention and by `import 'server-only'` in any module that reads them; (2) `providers.tsx` carries `"use client"` and wraps `<CopilotKit>` — the App Router's Server Component default would silently break CopilotKit's React context; (3) the CopilotKit runtime endpoint is live at `/api/copilotkit` using the `BuiltInAgent` + `CopilotRuntime` pattern (the current documented API in 1.57.x).

One important finding compared to the pre-existing CLAUDE.md stack research: CopilotKit 1.57.x docs now show `BuiltInAgent` from `@copilotkit/runtime/v2` as the canonical pattern for Anthropic integration, not `AnthropicAdapter` + `@anthropic-ai/sdk`. Both patterns coexist in the package, but new documentation exclusively shows `BuiltInAgent`. For Phase 1, either works for the route health check, but the planner should prefer `BuiltInAgent` to match current docs.

**Primary recommendation:** Scaffold with `create-next-app@latest --yes`, install CopilotKit packages, create `providers.tsx` with `"use client"`, wire `BuiltInAgent` route handler at `/api/copilotkit`, add `.env.local` template — in that order.

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Enforced |
|-----------|--------|----------|
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` is forbidden | CLAUDE.md § What NOT to Use | Hard — baked into bundle at build time |
| `NEXT_PUBLIC_GITHUB_TOKEN` is forbidden | CLAUDE.md § What NOT to Use | Hard — same exposure risk |
| `@copilotkit/react-ui` should not be installed for v1 | CLAUDE.md § What NOT to Use | Soft — bundle weight; skip unless needed |
| `ai` (Vercel AI SDK) should not be installed | CLAUDE.md § What NOT to Use | Soft — redundant with BuiltInAgent |
| `next-auth` should not be installed | CLAUDE.md § What NOT to Use | Soft — stateless demo |
| Tech stack is fixed: Next.js + CopilotKit + GitHub API + Claude | CLAUDE.md § Constraints | Architectural — do not substitute |
| All GSD workflow file changes must go through a GSD command | CLAUDE.md § GSD Workflow Enforcement | Process — not applicable to Phase 1 code output |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| CopilotKit provider context | Frontend (Client) | — | React context is client-only; `<CopilotKit>` must render in a `"use client"` component |
| CopilotKit runtime endpoint | API / Backend | — | `CopilotRuntime` + `BuiltInAgent` live in a Next.js Route Handler; never client-side |
| Env var access (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`) | API / Backend | — | Unprefixed vars are server-only by Next.js convention; never accessible in the browser bundle |
| App shell HTML / page rendering | Frontend Server (SSR) | — | `app/layout.tsx` is a Server Component; `app/page.tsx` is a Server Component by default |
| Client boundary establishment | Frontend (Client) | Frontend Server | `providers.tsx` with `"use client"` is the isolation point; layout imports it as a component |

---

## Standard Stack

### Core (Phase 1 relevant)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.6 | Full-stack React framework | CopilotKit's native environment; App Router + Route Handlers [VERIFIED: npm registry] |
| react | 19.2.x (bundled) | UI rendering | Bundled with Next.js 16; CopilotKit 1.x compatible with React 19 [CITED: CLAUDE.md] |
| typescript | 5.x (bundled) | Type safety | Bundled via `create-next-app`; required for downstream Zod + CopilotKit types [CITED: CLAUDE.md] |
| @copilotkit/react-core | 1.57.1 | CopilotKit client provider + hooks | Provides `<CopilotKit>` context wrapper; `useCopilotAction` for Phase 4 [VERIFIED: npm registry] |
| @copilotkit/runtime | 1.57.1 | Server-side runtime, `BuiltInAgent`, `CopilotRuntime` | Route Handler endpoint; `BuiltInAgent` is the current documented pattern [VERIFIED: npm registry] |
| tailwindcss | 4.3.0 | Utility-first styling | Bundled via `create-next-app`; v4 uses `@import "tailwindcss"` in globals.css [VERIFIED: npm registry] |
| server-only | 0.0.1 | Build-time guard against client import of server modules | `import 'server-only'` throws a build error if the module ends up in client bundle [VERIFIED: npm registry + Context7/vercel/next.js] |

### Not Installed in Phase 1 (deferred to later phases)

| Library | Deferred To | Reason |
|---------|-------------|--------|
| @anthropic-ai/sdk | Phase 3 | Direct Anthropic calls for structured classification — not needed for CopilotKit endpoint in Phase 1 |
| @octokit/rest | Phase 2 | GitHub API integration |
| zod | Phase 2 | Schema validation for LLM output |
| shadcn/ui | Phase 3-4 | UI primitives for review cards |

### Version Verification

```bash
# Verified via npm registry on 2026-05-09:
next:                  16.2.6
@copilotkit/react-core: 1.57.1
@copilotkit/runtime:   1.57.1
tailwindcss:           4.3.0
server-only:           0.0.1
```

### Installation

```bash
# 1. Scaffold (TypeScript, Tailwind, App Router, Turbopack — all --yes defaults)
npx create-next-app@latest pr-review-copilot --yes
cd pr-review-copilot

# 2. CopilotKit packages
npm install @copilotkit/react-core @copilotkit/runtime

# 3. Server-only guard
npm install server-only
```

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  |
  | renders
  v
app/layout.tsx (Server Component)
  |
  | imports
  v
app/providers.tsx  ← "use client" directive
  |  wraps children with <CopilotKit runtimeUrl="/api/copilotkit">
  |
  v
app/page.tsx (Server Component by default — home page)

                     ↕  HTTP POST /api/copilotkit
app/api/copilotkit/route.ts (Route Handler — server only)
  |
  | CopilotRuntime + BuiltInAgent
  | reads ANTHROPIC_API_KEY from process.env (server-only, no NEXT_PUBLIC_)
  v
Anthropic API (external)
```

### Recommended Project Structure

```
pr-review-copilot/
├── app/
│   ├── api/
│   │   └── copilotkit/
│   │       └── route.ts        # CopilotKit runtime endpoint
│   ├── layout.tsx              # Root layout — Server Component
│   ├── page.tsx                # Home page — Server Component
│   ├── providers.tsx           # "use client" — CopilotKit context boundary
│   └── globals.css             # Tailwind v4 import
├── .env.local                  # GITHUB_TOKEN, ANTHROPIC_API_KEY (gitignored)
├── .env.local.example          # Template committed to repo (no real values)
└── next.config.ts              # Next.js config
```

### Pattern 1: providers.tsx Client Boundary

**What:** A separate `providers.tsx` file carries `"use client"` and wraps `<CopilotKit>`. The root layout (`layout.tsx`) imports it as a child element — keeping `layout.tsx` itself a Server Component.

**When to use:** Any time a React context provider (like CopilotKit) must wrap the entire app tree but the root layout must stay a Server Component.

**Why not put `<CopilotKit>` directly in `layout.tsx`:** Next.js App Router defaults all components to Server Components. A Server Component cannot use `React.createContext` or any React hooks. Placing `<CopilotKit>` directly in `layout.tsx` without `"use client"` at the top of that file will throw: `"createContext is not a function"` or `"You're importing a component that needs useState"` at startup.

```typescript
// Source: Context7 /copilotkit/copilotkit — docs/snippets
// app/providers.tsx
"use client";

import { CopilotKit } from "@copilotkit/react-core";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {children}
    </CopilotKit>
  );
}
```

```typescript
// app/layout.tsx — remains a Server Component (no "use client" directive)
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PR Review Copilot",
  description: "Type-adaptive PR review interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Pattern 2: CopilotKit Route Handler with BuiltInAgent

**What:** A Next.js Route Handler at `app/api/copilotkit/route.ts` hosts the `CopilotRuntime`. Uses `BuiltInAgent` from `@copilotkit/runtime/v2` — the current documented pattern as of CopilotKit 1.57.x.

**Key finding:** The CLAUDE.md stack research shows `AnthropicAdapter` + `@anthropic-ai/sdk`. This is the v1 adapter pattern. Current CopilotKit 1.57.x documentation exclusively shows `BuiltInAgent` from `@copilotkit/runtime/v2` with `model: "anthropic:claude-sonnet-4-5"`. The `BuiltInAgent` reads `ANTHROPIC_API_KEY` from the environment automatically — no explicit SDK instantiation needed. [VERIFIED: Context7 /copilotkit/copilotkit — quickstart.mdx, built-in-agent/quickstart.mdx, model-selection.mdx]

```typescript
// Source: Context7 /copilotkit/copilotkit — docs/content/docs/integrations/built-in-agent/quickstart.mdx
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { NextRequest } from "next/server";

const builtInAgent = new BuiltInAgent({
  model: "anthropic:claude-sonnet-4-5",
});

const runtime = new CopilotRuntime({
  agents: { default: builtInAgent },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
```

**Note on `AnthropicAdapter`:** The v1 `AnthropicAdapter` pattern (from CLAUDE.md research) remains in the package and still works, but new documentation no longer shows it as the primary path. If `BuiltInAgent` causes issues at install time, the `AnthropicAdapter` fallback is: `import { AnthropicAdapter } from "@copilotkit/runtime"` with `const serviceAdapter = new AnthropicAdapter({ anthropic: anthropic as any })`. The planner should attempt `BuiltInAgent` first. [ASSUMED — not confirmed whether AnthropicAdapter is still exported in 1.57.1]

### Pattern 3: Server-Only Env Var Enforcement

**What:** `import 'server-only'` at the top of any module that reads `GITHUB_TOKEN` or `ANTHROPIC_API_KEY`. Causes a build-time error if that module is ever imported into a Client Component tree.

**When to use:** Any file that reads an unprefixed env var and could theoretically be imported in a client context.

```typescript
// Source: Context7 /vercel/next.js — docs/01-app/02-guides/data-security.mdx
// lib/github.ts (example — built in Phase 2, pattern established now)
import 'server-only';

// process.env.GITHUB_TOKEN — accessible only server-side
// If this file is accidentally imported in a "use client" component,
// Next.js throws a build error before the key can leak.
```

**Phase 1 scope:** The `.env.local` template (with no real values) is committed. The `server-only` package is installed. The pattern is documented in a `lib/` placeholder. Actual usage is in Phase 2 (GitHub) and Phase 3 (Anthropic direct calls).

### Pattern 4: `.env.local` Template

```bash
# .env.local.example — commit this file (no real values)
# Copy to .env.local and fill in real values (gitignored)

# GitHub Personal Access Token — classic PAT with public_repo scope
# NEVER prefix with NEXT_PUBLIC_ — this would bake the token into the JS bundle
GITHUB_TOKEN=

# Anthropic API Key
# NEVER prefix with NEXT_PUBLIC_ — this would expose the key to all visitors
ANTHROPIC_API_KEY=
```

### Anti-Patterns to Avoid

- **`"use client"` on `layout.tsx` directly:** Makes the entire layout a Client Component, disabling server-side metadata, streaming, and RSC benefits. Use `providers.tsx` instead.
- **`<CopilotKit>` directly in `layout.tsx` without `"use client"`:** Throws "createContext is not a function" at startup. CopilotKit uses React context which is client-only.
- **`NEXT_PUBLIC_ANTHROPIC_API_KEY` or `NEXT_PUBLIC_GITHUB_TOKEN`:** These are inlined into the JavaScript bundle at build time and readable by any browser DevTools inspection. Cannot be retrofitted without rebuilding.
- **Calling `new BuiltInAgent()` client-side:** `BuiltInAgent` is imported from `@copilotkit/runtime`, a server package. Next.js will throw at bundle time.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client/server boundary for context providers | Manual conditional rendering | `providers.tsx` with `"use client"` | App Router's standard client boundary pattern; reliably prevents SSR context errors |
| Server-only module enforcement | Runtime checks for `window === undefined` | `import 'server-only'` | Build-time error — catches the problem before deployment, not at runtime |
| CopilotKit runtime endpoint | Manual WebSocket / SSE handler | `copilotRuntimeNextJSAppRouterEndpoint` | Handles protocol negotiation, AG-UI streaming, error propagation |
| Anthropic API key environment wiring | Custom env var loader | `ANTHROPIC_API_KEY` in `.env.local` + Next.js built-in env loading | Next.js loads `.env.local` automatically; no additional setup required |

**Key insight:** Phase 1 is about establishing guardrails, not building features. Every item in this table represents a problem where the standard solution is a single import or file pattern — hand-rolling any of them adds complexity with no benefit.

---

## Common Pitfalls

### Pitfall 1: CopilotKit `<CopilotKit>` in Server Component

**What goes wrong:** App starts with "Error: createContext is not a function" or "You're importing a component that needs useState. It only works in a Client Component." Fails at startup, before any page renders.

**Why it happens:** Next.js App Router defaults all components to Server Components. `<CopilotKit>` from `@copilotkit/react-core` uses `React.createContext` internally, which is a client-only API. If the component tree does not include a `"use client"` ancestor above `<CopilotKit>`, the build fails or throws at render.

**How to avoid:** Create `app/providers.tsx` with `"use client"` at the top. Import `<CopilotKit>` there. Import `<Providers>` in `app/layout.tsx` (which has no `"use client"` directive). Never place `<CopilotKit>` directly inside `layout.tsx` unless `layout.tsx` itself is marked `"use client"` (which has its own drawbacks).

**Warning signs:** Any error message mentioning `createContext`, `useState`, or `useContext` appearing at server render time.

[CITED: Context7 /copilotkit/copilotkit — docs/snippets/use-client-callout.mdx, PITFALLS.md Pitfall #5]

---

### Pitfall 2: API Key Exposure via `NEXT_PUBLIC_` Prefix

**What goes wrong:** `GITHUB_TOKEN` or `ANTHROPIC_API_KEY` with the `NEXT_PUBLIC_` prefix is inlined into the JavaScript bundle at `npm run build`. Any visitor to the deployed site can read the key from browser DevTools → Sources.

**Why it happens:** The `NEXT_PUBLIC_` prefix is Next.js's mechanism for making env vars available in the browser. It is a static replacement at build time — the key literal is baked into the bundle.

**How to avoid:** Use `GITHUB_TOKEN` and `ANTHROPIC_API_KEY` (no prefix). These are only accessible in server-side code (Route Handlers, Server Components, server utilities). Accessing them in a Client Component returns `undefined` — not an error, which makes the mistake easy to miss until the key is leaked.

**Warning signs:** Any code in a `"use client"` component that reads `process.env.GITHUB_TOKEN` will silently get `undefined`. The key was never there on the client — but if it was added as `NEXT_PUBLIC_GITHUB_TOKEN`, it would be there and exposed.

[CITED: Context7 /vercel/next.js — docs/01-app/02-guides/environment-variables.mdx, production-checklist.mdx, PITFALLS.md Pitfall #8]

---

### Pitfall 3: `BuiltInAgent` vs `AnthropicAdapter` Pattern Mismatch

**What goes wrong:** Scaffolding the route handler with `AnthropicAdapter` (the pre-existing CLAUDE.md stack research pattern) may require an `as any` cast and may not match current CopilotKit 1.57.x docs, potentially causing type errors or deprecation warnings.

**Why it happens:** The CLAUDE.md stack research was produced before the BuiltInAgent pattern became the primary documented approach. Both patterns exist in the package but documentation divergence means examples may not match.

**How to avoid:** Use `BuiltInAgent` from `@copilotkit/runtime/v2` as shown in current docs. If `BuiltInAgent` is not available in the installed version, fall back to `AnthropicAdapter` from `@copilotkit/runtime` with the `as any` cast. Verify by attempting to import from `@copilotkit/runtime/v2` after `npm install`.

**Warning signs:** TypeScript error `Module '@copilotkit/runtime/v2' has no exported member 'BuiltInAgent'` — fall back to `AnthropicAdapter` pattern.

[ASSUMED — actual export availability of `BuiltInAgent` from `@copilotkit/runtime/v2` not confirmed via local install]

---

### Pitfall 4: Turbopack Incompatibility with Server-Only

**What goes wrong:** In rare cases, `import 'server-only'` in a module that Turbopack cannot resolve at compile time can cause unexpected build failures in Next.js 16's default Turbopack dev server.

**Why it happens:** Next.js 16 defaults to Turbopack for `npm run dev`. Most `server-only` imports work fine, but early-phase usage should verify the dev server starts cleanly.

**How to avoid:** After installing `server-only` and adding any `import 'server-only'` statements, verify `npm run dev` starts without errors before proceeding.

**Warning signs:** Build error in Turbopack mentioning `server-only` or module resolution failure in the dev server output.

[ASSUMED — based on training knowledge of Turbopack compatibility edge cases; no confirmed reports found]

---

## Code Examples

### Complete `providers.tsx`

```typescript
// Source: Context7 /copilotkit/copilotkit — multiple quickstart sources
// app/providers.tsx
"use client";

import { CopilotKit } from "@copilotkit/react-core";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {children}
    </CopilotKit>
  );
}
```

### Complete `app/api/copilotkit/route.ts` (BuiltInAgent — current pattern)

```typescript
// Source: Context7 /copilotkit/copilotkit — docs/content/docs/integrations/built-in-agent/quickstart.mdx
// app/api/copilotkit/route.ts
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { NextRequest } from "next/server";

const builtInAgent = new BuiltInAgent({
  model: "anthropic:claude-sonnet-4-5",
});

const runtime = new CopilotRuntime({
  agents: { default: builtInAgent },
});

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
```

### Fallback `app/api/copilotkit/route.ts` (AnthropicAdapter — v1 pattern)

```typescript
// Source: CLAUDE.md stack research / Context7 /copilotkit/copilotkit (older snippets)
// Use this only if BuiltInAgent import from @copilotkit/runtime/v2 fails
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

### Minimal `app/page.tsx` (walking skeleton home page)

```typescript
// app/page.tsx — Server Component; no "use client" needed
export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">PR Review Copilot</h1>
      <p className="mt-2 text-gray-600">Paste a GitHub PR URL to get started.</p>
    </main>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `AnthropicAdapter` + direct `@anthropic-ai/sdk` instantiation | `BuiltInAgent({ model: "anthropic:claude-sonnet-4-5" })` | CopilotKit 1.50+ | Simpler setup; no explicit SDK client instantiation; env var auto-discovery |
| Tailwind CSS v3 (`tailwind.config.js`, `@tailwind base/components/utilities`) | Tailwind CSS v4 (`@import "tailwindcss"` in globals.css, `@tailwindcss/postcss` plugin) | Tailwind 4.0 | `create-next-app@latest` handles v4 automatically; no manual config needed |
| `serviceAdapter` parameter in `copilotRuntimeNextJSAppRouterEndpoint` | No `serviceAdapter` with `BuiltInAgent` — agent is registered in `CopilotRuntime({ agents: { default: ... } })` | CopilotKit 1.50+ | One fewer constructor argument; cleaner separation |

**Deprecated/outdated:**
- `AnthropicAdapter` direct usage: Not deprecated per release notes, but new documentation exclusively shows `BuiltInAgent`. Safe to use as fallback but not as primary approach.
- `tailwind.config.js` + `content` array: Replaced by CSS-first configuration in Tailwind v4.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js 16 (requires 18.18+) | Yes | v22.14.0 | — |
| npm | Package management | Yes | 10.9.2 | — |
| `create-next-app` | Project scaffolding | Yes (npx) | 16.2.6 | — |
| `ANTHROPIC_API_KEY` | CopilotKit BuiltInAgent (Phase 1 health check) | Unknown — not verified in this session | — | Placeholder value for dev; endpoint still starts |
| `GITHUB_TOKEN` | Phase 2 GitHub integration | Unknown — not needed in Phase 1 | — | Not needed in Phase 1 |

**Missing dependencies with no fallback:** None for Phase 1. The route handler starts even without a real `ANTHROPIC_API_KEY` (it will fail when called, but the endpoint will respond to a GET/POST health check with a valid structure error rather than a 503).

**Missing dependencies with fallback:** `ANTHROPIC_API_KEY` — Phase 1 success criterion #4 (endpoint responds to GET/POST) does not require a valid key; it only requires the handler to be registered and respond.

---

## Validation Architecture

`nyquist_validation` is set to `false` in `.planning/config.json`. This section is omitted per config.

---

## Security Domain

### Applicable ASVS Categories for Phase 1

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 1 is stateless scaffolding) | — |
| V3 Session Management | No (no sessions in v1) | — |
| V4 Access Control | No | — |
| V5 Input Validation | No (no user input in Phase 1) | — |
| V6 Cryptography | No | — |
| V8 Data Protection | Yes — API key confidentiality | `server-only` package + no `NEXT_PUBLIC_` prefix |

### Known Threat Patterns for Phase 1 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exposure via client bundle | Information Disclosure | No `NEXT_PUBLIC_` prefix; `import 'server-only'` in API modules |
| API key in git history | Information Disclosure | `.env.local` in `.gitignore`; commit only `.env.local.example` with no real values |
| Secrets in `NEXT_PUBLIC_*` env var | Information Disclosure | Project constraint (CLAUDE.md): explicitly forbidden; bakes secret into JS bundle |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `BuiltInAgent` is exported from `@copilotkit/runtime/v2` in the installed 1.57.1 package | Standard Stack, Code Examples | If not exported, must fall back to `AnthropicAdapter`; planner should include fallback task |
| A2 | `AnthropicAdapter` is still exported from `@copilotkit/runtime@1.57.1` (for fallback) | Code Examples | If removed, the fallback pattern is invalid; requires different approach |
| A3 | Tailwind v4 PostCSS setup is handled automatically by `create-next-app@latest --yes` | Standard Stack | If not handled, manual `@tailwindcss/postcss` configuration needed |
| A4 | The `/api/copilotkit` endpoint responds to a simple POST without a valid `ANTHROPIC_API_KEY` (i.e., it doesn't require a valid key to start up, only to process requests) | Environment Availability | If the agent init validates the key at startup, a real key is needed for Phase 1 success criterion #4 |

---

## Open Questions

1. **`BuiltInAgent` vs `AnthropicAdapter` — which is exported in installed 1.57.1?**
   - What we know: CopilotKit docs show `BuiltInAgent` from `@copilotkit/runtime/v2` as current pattern; `AnthropicAdapter` is in earlier docs
   - What's unclear: Whether both are available in the `1.57.1` tarball without installing
   - Recommendation: The planner should include a task that first attempts `BuiltInAgent` import and falls back to `AnthropicAdapter` if the import fails. The check takes one line: `import { BuiltInAgent } from "@copilotkit/runtime/v2"` — TypeScript will error immediately if not available.

2. **Does the CopilotKit endpoint need a valid `ANTHROPIC_API_KEY` to pass Phase 1 success criterion #4?**
   - What we know: Success criterion says "endpoint responds to a GET/POST at `/api/copilotkit`" — not that it returns a valid AI response
   - What's unclear: Whether `BuiltInAgent` validates the key at module initialization time (startup failure) vs. request time (graceful 4xx)
   - Recommendation: Planner should include a `.env.local` task that populates a placeholder value (e.g., `sk-ant-placeholder`) and notes that Phase 1 verification only checks for HTTP response, not a valid LLM response.

---

## Sources

### Primary (HIGH confidence)
- Context7 `/copilotkit/copilotkit` — `BuiltInAgent` setup, `providers.tsx` pattern, `copilotRuntimeNextJSAppRouterEndpoint`, quickstart docs, model-selection.mdx
- Context7 `/vercel/next.js` — `server-only` package usage, `NEXT_PUBLIC_` security, env var handling
- npm registry — verified versions: next@16.2.6, @copilotkit/react-core@1.57.1, @copilotkit/runtime@1.57.1, tailwindcss@4.3.0, server-only@0.0.1
- `.planning/research/PITFALLS.md` — pitfalls #5 (providers.tsx), #8 (token exposure), #2 (PAT auth)
- `.planning/research/STACK.md` — stack decisions, version compatibility table
- `CLAUDE.md` — project constraints, forbidden patterns, tech stack decisions

### Secondary (MEDIUM confidence)
- GitHub CopilotKit releases page (via WebFetch) — confirmed BuiltInAgent is the featured pattern in 1.57.x; AnthropicAdapter deprecation not announced
- `.planning/research/ARCHITECTURE.md` — component boundaries, build order, data flow diagram

### Tertiary (LOW confidence — marked ASSUMED in log)
- Training knowledge — `AnthropicAdapter` still exported in 1.57.1; `BuiltInAgent` from `/v2` export path; Turbopack/server-only compatibility

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via npm registry; CopilotKit pattern verified via Context7
- Architecture: HIGH — providers.tsx pattern, env var security, route handler structure all verified via official docs
- BuiltInAgent vs AnthropicAdapter: MEDIUM — BuiltInAgent is documented pattern, but actual export availability in installed package is ASSUMED
- Pitfalls: HIGH — providers.tsx and env var pitfalls confirmed via official Next.js docs and CopilotKit issue tracker

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (stable APIs; CopilotKit minor versions move quickly — recheck if > 1.58.x is released)
