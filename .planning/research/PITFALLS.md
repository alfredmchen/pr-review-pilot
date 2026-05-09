# Pitfalls Research — PR Review Copilot

**Domain:** Next.js + CopilotKit + GitHub API + Claude LLM
**Researched:** 2026-05-09
**Confidence:** HIGH — confirmed via official GitHub docs, CopilotKit GitHub issues, and Anthropic API docs

---

## Critical Pitfalls (address before shipping)

### 1. GitHub API diff truncation silently breaks classification
**Warning signs:** PRs with > 300 files; classification results on large PRs feel "off"
**What happens:** The `/pulls/{id}` diff endpoint hard-stops at 20,000 lines or 1 MB. PRs with > 300 files return a 406 error. Classification runs on an incomplete diff with no warning to the user.
**Prevention:** Use `/pulls/{id}/files` with pagination instead — supports up to 3,000 files via link headers.
**Phase:** GitHub API integration (before classification is wired)

---

### 2. GitHub rate limit exhausted by unauthenticated requests
**Warning signs:** 429 errors in demo; "API rate limit exceeded" during demo with multiple PRs
**What happens:** 60 requests/hour per IP without auth. A demo hitting 3 PR URLs can exhaust this on a shared Vercel IP.
**Prevention:** Always authenticate with a server-side PAT (raises limit to 5,000/hr). Token must never use the `NEXT_PUBLIC_` prefix — it gets baked into the JS bundle.
**Phase:** Scaffolding (day one, before anything else)

---

### 3. "Lost in the middle" effect causes wrong classification on large diffs
**Warning signs:** Security changes in large PRs misclassified as refactors; low confidence scores
**What happens:** LLM accuracy on mid-context content degrades when context window is heavily utilized. A security change on file 47 of 60 may be missed entirely.
**Prevention:** Two-pass strategy — extract file headers breadth-first, then deep-read highest-signal files. Include a `confidence` field in structured output; render a fallback card below threshold.
**Phase:** Classification (LLM prompt design)

---

### 4. Structured output schema mismatch crashes the UI renderer
**Warning signs:** React "Nothing was returned from render" errors; blank card area
**What happens:** If the LLM returns `"type": "security_review"` and the component switch expects `"type": "security"`, the dispatcher falls through with no match.
**Prevention:** Shared Zod schema imported by both the prompt builder AND the component dispatcher — the schema IS the contract. Always include a `default` fallback branch that renders a safe generic card.
**Phase:** Classification schema definition (must be done before any card component is built)

---

### 5. CopilotKit `<CopilotKit>` wrapper placed in a Server Component
**Warning signs:** "createContext is not a function" or "You're importing a component that needs useState" errors at startup
**What happens:** Next.js App Router defaults to Server Components. CopilotKit uses React context, which is client-only.
**Prevention:** Create a `providers.tsx` with `"use client"` at the top; wrap children with `<CopilotKit>` there; import `Providers` into `layout.tsx`.
**Phase:** Scaffolding / CopilotKit wiring

---

### 6. `useCopilotAction` render function returns `null` — React crash
**Warning signs:** "Nothing was returned from render" error from CopilotKit (GitHub issue #1360)
**What happens:** Conditional early `return null` inside the `render` function throws a React error — every code path must return a ReactNode.
**Prevention:** Every branch returns a ReactNode; use a loading skeleton or placeholder, never `null`.
**Phase:** Generative UI / card components

---

### 7. Stop-generation / abort causes ECONNRESET server crash
**Warning signs:** Server error logs on rapid URL re-submission; CopilotKit GitHub issues #2749, #2675
**What happens:** Rapidly submitting a second URL while the first is streaming aborts the request; the server throws an unhandled error.
**Prevention:** `AbortController` on every fetch; catch `AbortError` in the Route Handler; return 499 instead of propagating the error.
**Phase:** GitHub API integration + UI input handling

---

### 8. GitHub token exposed via `NEXT_PUBLIC_` prefix
**Warning signs:** Token visible in browser DevTools → Sources → bundle JS
**What happens:** `NEXT_PUBLIC_GITHUB_TOKEN` is inlined into the client JS bundle at build time and visible to any visitor.
**Prevention:** All GitHub calls via a Next.js Route Handler; token as `GITHUB_TOKEN` (no prefix). Never `NEXT_PUBLIC_*` for secrets.
**Phase:** Scaffolding (cannot be retrofitted)

---

### 9. Classification false-positive rate too high without few-shot examples
**Warning signs:** Security changes classified as refactors; all PRs getting "bug-fix" type
**What happens:** Zero-shot security detection precision is ~22% on academic benchmarks. Single-word labels in the prompt are not enough signal.
**Prevention:** 3–5 few-shot examples per type in the system prompt. Maintain a ground-truth corpus of 12 PRs (3 per type) as a test fixture for prompt iteration.
**Phase:** Classification (LLM prompt design)

---

### 10. Race condition when user rapidly pastes new URLs
**Warning signs:** Old PR's card renders after new URL was submitted; stale data flash
**What happens:** Two fetches in flight → out-of-order resolution → stale result renders.
**Prevention:** Ref-tracked `AbortController` that cancels the in-flight fetch before starting a new one. URL string used as request key in state updates.
**Phase:** URL input / UI interaction handling

---

## Security Mistakes (specific to this project)

| Mistake | Impact | Fix |
|---------|--------|-----|
| `NEXT_PUBLIC_ANTHROPIC_API_KEY` | Key exposed in browser bundle | Server-only env var, API calls in Route Handler |
| `NEXT_PUBLIC_GITHUB_TOKEN` | Token exposed in browser bundle | Same — server-only |
| Rendering raw diff content as HTML | XSS via malicious PR description | Always render as text, never `dangerouslySetInnerHTML` |
| Trusting classification result without validation | Unexpected `prType` value crashes dispatcher | Zod parse + fallback card pattern |

---

## UX Pitfalls

- **No loading state during analysis:** The fetch + classification round trip takes 3–8 seconds. Users assume the app is broken without a skeleton or spinner. Must be built into the initial form → card transition.
- **Private repo 401 with no explanation:** A 401 from GitHub with no message shows up as a generic error. Surface "This looks like a private repo — a GitHub token with access is required."
- **Classifying oversized PRs:** A 500-file PR is bad input (the PR itself is the problem). Detect and surface a size warning card instead of attempting classification on a truncated diff.

---

## Performance Traps

- **Passing the full raw diff string to `useCopilotReadable`:** Bloats every subsequent LLM message in the session. Pass only the classification result, not the raw diff.
- **Fetching PR diff on the client:** CORS block + token exposure. Always server-side.
- **Not streaming the analysis response:** A non-streaming 6-second wait with a blank card area feels broken. Use streaming even for structured output where possible, or show a meaningful in-progress state.

---

## "Looks Done But Isn't" Checklist

- [ ] Error state for invalid/malformed PR URLs (not just 404s)
- [ ] Error state for private repos (401) with a helpful message
- [ ] Error state for very large PRs (> 300 files / 20k lines)
- [ ] Fallback card for unrecognized `prType` values
- [ ] Abort on rapid URL re-submission (no stale renders)
- [ ] Loading state visible within 100ms of submit
- [ ] GITHUB_TOKEN and ANTHROPIC_API_KEY never in NEXT_PUBLIC_ namespace
- [ ] Few-shot examples in system prompt for all 4 PR types
- [ ] Security card checklist items are actually checkable (local state, not decorative)

---

## Pitfall-to-Phase Mapping

| Phase | Critical Pitfalls to Address |
|-------|------------------------------|
| Scaffolding | #2 (PAT auth), #5 (providers.tsx), #8 (token exposure) |
| GitHub API integration | #1 (pagination), #7 (abort), #10 (race condition) |
| Classification (schema + prompt) | #3 (context window), #4 (schema contract), #9 (few-shot) |
| Generative UI / cards | #6 (null render crash), security checklist as local state |
| Pre-demo | Run the full "looks done but isn't" checklist |

---

## Open Questions

- Whether `useCopilotReadable` with the classification result (not raw diff) is the right hook, or whether state-lifting is cleaner for this non-conversational primary flow.
- Whether `strict: true` on tool use is accessible via CopilotKit's abstraction layer or requires bypassing to direct Anthropic SDK calls.
