---
plan: 03-01
phase: 03-llm-classification-core-ui
status: complete
completed: 2026-05-09T17:50:00Z
duration_minutes: ~50
tasks_total: 3
tasks_complete: 3
requirements_covered: [CLASS-01-partial]
files_modified: [lib/types.ts, lib/anthropic.ts, package.json, package-lock.json, components.json, lib/utils.ts, app/globals.css, .npmrc, components/ui/button.tsx, components/ui/card.tsx, components/ui/skeleton.tsx, components/ui/alert.tsx, components/ui/input.tsx, components/ui/badge.tsx]
---

# Plan 03-01 Summary — Foundation: Types, Anthropic SDK, shadcn

## What Shipped

Three atomic tasks delivering the server-side foundation for Phase 3's classification pipeline:

1. **Type contract extension** (`e04da55`) — `lib/types.ts` extended with three new `AnalyzeResponse` union members (`'private-repo' | 'not-found' | 'invalid-url'`), the `'ok'` member gained `prType` + `signals` + `classification_reason`, and the four signal types (`SecuritySignals`, `RefactorSignals`, `ApiChangeSignals`, `BugFixSignals`) were given concrete fields per REQUIREMENTS CARD-01..CARD-04. Phase 2's `'ok' | 'size-exceeded'` membership was preserved — extension, not replacement.

2. **Anthropic SDK + classifyPR()** (`30585c9`) — `@anthropic-ai/sdk@0.95.1` installed exact-pinned. `lib/anthropic.ts` created with `import "@/lib/server-only"` first (mandatory guard for `ANTHROPIC_API_KEY` access), an Anthropic client factory, and a `classifyPR(input)` function that returns Zod-validated `{prType, signals, classification_reason}` using prompt-coerced JSON + Zod validation (chose this over the structured-outputs-2025-11-13 beta per STATE.md spike concern; conservative path for the deadline run, with an upgrade exit noted).

3. **shadcn init + 6 primitives** (`af7fd6c`) — initialized shadcn registry (`components.json` with neutral baseColor, CSS variables, `@/components` aliases) and installed: `button`, `card`, `skeleton`, `alert`, `input`, `badge`. `lib/utils.ts` provides the `cn` helper. `.npmrc` adds `legacy-peer-deps=true` so `@anthropic-ai/sdk@0.95.x` can coexist with `@copilotkit/runtime@1.57.1`'s peerOptional `^0.57.0` declaration (CopilotKit's AnthropicAdapter is unused — Phase 1 used BuiltInAgent, Phase 3 uses the SDK directly).

## Verification

- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (Turbopack, 5.2s compile + clean static generation)
- Routes intact: `/`, `/api/analyze-pr`, `/api/copilotkit`
- @anthropic-ai/sdk exact-pinned (no `^` or `~`)

## Notable Deviations

- **Stream timeout mid-Task-3** — the original executor agent stream timed out partway through `npx shadcn add` (~43 min). Recovery: orchestrator inspected git state, found commits for Tasks 1 + 2 already landed, ran `npx shadcn add card skeleton alert input badge --yes` to finish the missing 5 primitives, verified `tsc` + `build` clean, then committed manually. No code was lost; the timeout happened between primitives, not during one.
- **Structured-outputs beta deferred** — STATE.md flagged uncertainty about whether `betas: ["structured-outputs-2025-11-13"]` works through the SDK at the time of writing. Plan 03-01 chose prompt-coerced JSON + Zod validation as the conservative path. Upgrade path is well-defined: swap the prompt template for the SDK's `messages.beta.create` call once the beta is confirmed stable.
- **`@ts-expect-error` handoff** — Plan 03-01 added a `@ts-expect-error` on `app/api/analyze-pr/route.ts`'s `'ok'` response construction since the route does not yet populate `prType`/`signals`/`classification_reason`. Plan 03-02 will remove the suppression by wiring the `classifyPR()` call site.

## Hand-Off to Plan 03-02

Plan 03-02 owns:
- Route extension: 401/403/404 → `'private-repo'` / `'not-found'`; integrate `classifyPR()` call site (removes the `@ts-expect-error`)
- UI components: `PRResultPanel` (status switch → prType switch dispatcher), 8 placeholder cards (4 prType + 4 status: PrivateRepo, NotFound, PRSizeWarning, Unclassified)
- Form: `PRUrlForm` with `useTransition` for the 100ms FETCH-03 skeleton requirement
- Page wiring: `app/page.tsx` mounts the form + dispatcher

The contracts (types, classifier, primitives) are locked. Plan 03-02 should be UI-shape work only.
