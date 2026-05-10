# Phase 4: Four Review Cards + CopilotKit Hook - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Mode:** Auto-generated (discuss skipped via workflow.skip_discuss for time-box)

<domain>
## Phase Boundary

Replace the four placeholder card components from Phase 3 with fully-populated, type-specific review cards that consume the per-prType signal payloads from the classifier. Register all four card types via `useCopilotAction` so CopilotKit's generative UI layer can render them. The success condition is a demo showing 3 distinct PR URLs producing 3 visually distinct UIs.

In scope:
- `SecurityCard` — risk flags, affected auth paths, OWASP-aligned interactive checklist (checkboxes with local state), severity rating (HIGH/MEDIUM/LOW), hardcoded secrets indicator (CARD-01)
- `RefactorCard` — files moved/renamed, dependency impact, test coverage delta, behavior preservation note, PR scope assessment (CARD-02)
- `ApiChangeCard` — before/after endpoint surface, breaking change flags, versioning assessment, downstream consumers note, HTTP method/status changes (CARD-03)
- `BugFixCard` — root cause summary, blast radius/affected area, fix adequacy signal, regression risk flag, missing test coverage warning (CARD-04)
- `useCopilotAction` registration in a client component, mapping all four `prType` values to their card components via the existing `PRResultPanel` dispatcher
- Demo readiness: at least 3 distinct PR URLs render 3 visually distinct UIs

Out of scope:
- Multi-file breakdown within cards (deferred to v2 per REQUIREMENTS.md)
- Confidence score + secondary prType for ambiguous PRs (v2)
- Copy-to-clipboard for findings (v2)
- Raw diff viewer (v2)
- Classification rationale display in the UI (v1.1 candidate — `classification_reason` field already exists in the schema from Phase 3, but Phase 4 v1 does not render it)

</domain>

<decisions>
## Implementation Decisions

### Card Visual Pattern (locked across all 4)

Each card uses shadcn `<Card>` with this structure:
- `<CardHeader>` — title row: prType label badge + (for security) severity badge + (for api-change) breaking-change badge
- `<CardContent>` — vertical stack of sections, each section a `<div>` with a small heading + body
- Compact density: `space-y-3` between sections, `text-sm` for body content, `font-medium` for section headings
- Icons from `lucide-react` (already installed by shadcn) sparingly — one per major signal type max
- No card animations/transitions in v1 (perf risk on slower demos)

### Severity Rating Visual (CARD-01 only)
- HIGH → red destructive `<Badge variant="destructive">`
- MEDIUM → yellow `<Badge>` with custom yellow class (or shadcn variant if available)
- LOW → blue/neutral `<Badge variant="secondary">`

### Interactive Checklist (CARD-01 OWASP checkbox)
- Use shadcn `<Checkbox>` (NOT yet installed — needs `npx shadcn@latest add checkbox`)
- Local state via `useState` keyed by checklist item label — no persistence (stateless demo per PROJECT.md constraints)
- Checked state strikes through the label and dims it (Tailwind `line-through opacity-60`)
- Reset on URL change (component remount)

### Breaking Change Flag (CARD-03)
- If `breakingChanges` array is non-empty → red `<Badge variant="destructive">` "Breaking" in header
- Each breaking change rendered as red bullet list item with concise reason
- Non-breaking changes get a green/neutral checkmark indicator

### Files Moved/Renamed (CARD-02)
- Rendered as a 2-column compact table or vertical stack: `from → to` with arrow (→) icon
- Cap at 8 visible items; if more, show "+N more" footer line (no expand-collapse in v1)

### Before/After API Surface (CARD-03)
- Two columns side-by-side at `md:` breakpoint, stacked at `sm:`
- Code-style font (`font-mono`) for endpoint paths
- Use shadcn `<Badge>` for HTTP methods (GET/POST/PUT/DELETE), color-coded: GET=neutral, POST=blue, PUT=yellow, DELETE=red

### CopilotKit `useCopilotAction` integration
- Register a single action `renderPRReviewCard` that takes `{prType, signals}` and renders the corresponding card via `PRResultPanel`'s existing prType switch.
- The hook is registered in a client component (`'use client'` directive) that wraps the result-panel mount in `app/page.tsx`. The `<CopilotKit>` provider is already established in `app/providers.tsx` from Phase 1.
- Action `available: 'enabled'` so the existing direct render path still works (the `useCopilotAction` registration is for parity with CopilotKit's generative UI layer, not a replacement for direct rendering).
- Per CLAUDE.md `useCopilotAction` with `render` property is the documented pattern in CopilotKit 1.56-1.57; STATE.md flagged this as a Phase 4 spike concern. If the API has shifted to AG-UI / `useAgent`, planner/executor falls back to direct render and documents the deviation in SUMMARY.md.

### Signal Population Strategy
The signal data comes from Phase 3's `classifyPR()` output. Phase 4 trusts the schema and renders what the LLM provides:
- If a signal field is empty/missing, render an em-dash "—" placeholder rather than hiding the section entirely (consistency across PRs).
- The classifier prompt in `lib/anthropic.ts` may need light tuning to ensure each signal field is populated — Plan should add a "tune prompt" task if signals come back consistently empty during demo testing.

### Demo Configuration Note
- The `.env.local` requires real `ANTHROPIC_API_KEY` and (optionally) `GITHUB_TOKEN` for the classification path to fire end-to-end. Phase 3 SUMMARY flagged this as a Phase 4 prerequisite. The plan should NOT include code changes to bypass — it's an env-config task documented in SUMMARY.md, not a code task.

### Claude's Discretion
- Exact icon choices from `lucide-react`
- Whether to extract a shared `<CardSection>` sub-component or inline the section markup
- Demo PR URL fixtures — pick 3-4 real public PRs that demonstrate distinct prTypes (one obvious security, one refactor, one API change). Document the picks in SUMMARY.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked decisions + scope
- `.planning/REQUIREMENTS.md` §CARD-01..CARD-04 — the four requirements this phase satisfies (each lists 5 specific fields per card).
- `.planning/ROADMAP.md` Phase 4 — 5 success criteria the verifier will check.
- `.planning/PROJECT.md` §"Out of Scope" — no multi-file breakdown, no copy-to-clipboard, no raw diff viewer in v1.

### Phase 3 carryover (must read — Phase 4 builds on these)
- `.planning/phases/03-llm-classification-core-ui/03-CONTEXT.md` — dispatcher pattern, status union members.
- `.planning/phases/03-llm-classification-core-ui/03-UI-SPEC.md` — color rules, spacing scale, typography, shadcn registry choices. Phase 4 INHERITS this — no new visual decisions about base palette/spacing.
- `.planning/phases/03-llm-classification-core-ui/03-02-SUMMARY.md` — what shipped (placeholder cards to replace, dispatcher to keep), Phase 4 prerequisites (ANTHROPIC_API_KEY, useCopilotAction spike).
- `lib/types.ts` — the four signal type interfaces (`SecuritySignals`, `RefactorSignals`, `ApiChangeSignals`, `BugFixSignals`) — these are the props each card receives.
- `components/PRResultPanel.tsx` — the dispatcher. Each `prType` switch case currently renders a `*CardPlaceholder`; Phase 4 swaps these for the real cards.
- `components/cards/{Security,Refactor,ApiChange,BugFix}CardPlaceholder.tsx` — the placeholder files to replace (or rename + populate).
- `components/PRUrlForm.tsx` — the input form. Phase 4 may register `useCopilotAction` near this component or in a new client wrapper.

### Tech stack constraints
- `CLAUDE.md` §"Recommended Stack" — `useCopilotAction` from `@copilotkit/react-core` (already installed); `lucide-react` (installed by shadcn).
- `CLAUDE.md` §"What NOT to Use" — no `@copilotkit/react-ui` chat sidebar; no auto-post-back to GitHub.
- shadcn checkbox primitive needs to be added via `npx shadcn@latest add checkbox`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- shadcn `<Card>`, `<Badge>`, `<Alert>` already installed (Phase 3)
- `PRResultPanel` exhaustive switch logic — keep, just swap placeholder imports
- Phase 3's color rules and spacing are the baseline; do not introduce new design tokens

### Established Patterns
- Server-only env access enforced (Phase 1 lockdown still applies — Phase 4 adds NO new env-secret reads beyond `ANTHROPIC_API_KEY` already used by Phase 3)
- Pinned versions; no `^` for runtime deps
- App Router conventions

### Integration Points
- New file: shadcn checkbox primitive at `components/ui/checkbox.tsx`
- Modified: 4 placeholder cards become real cards (`components/cards/Security.tsx`, etc. — keep filenames or rename, planner decides)
- Modified: `components/PRResultPanel.tsx` — import the real cards (or rename existing placeholders)
- New client wrapper: `components/CopilotPRResultPanel.tsx` (or similar) — mounts `useCopilotAction` registration around the dispatcher
- `app/page.tsx` — swap the dispatcher mount for the CopilotKit-wrapped version

</code_context>

<specifics>
## Specific Ideas

- Demo URL trio (planner/executor refines):
  - Security PR: a public auth-touching PR (search GitHub for recent merges in popular OSS auth libs)
  - Refactor PR: a public file-rename heavy PR
  - API change PR: a public REST API surface change
  - Bonus: a public bug fix for the 4th card

- Visual distinction across cards: header badge color + content layout shape are the primary differentiators. A reviewer should be able to identify the prType in <1s of glancing at a card.

</specifics>

<deferred>
## Deferred Ideas

- `classification_reason` display in UI — v1.1 candidate (field exists, just not rendered)
- Card animations/transitions — perf risk
- Multi-file breakdown drilldown
- Confidence score + secondary prType
- Copy findings to clipboard

</deferred>

---

*Phase: 04-four-review-cards-copilotkit-hook*
*Context auto-generated: 2026-05-09 (skip_discuss path)*
