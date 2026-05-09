# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-09)

**Core value:** The right review interface for this specific PR, so reviewers focus on the real risks instead of generating noise
**Current focus:** Phase 1 — Scaffolding + Security Foundation

## Current Position

Phase: 1 of 4 (Scaffolding + Security Foundation)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-05-09 — Roadmap created; Phase 1 ready for planning

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: LLM classifies diff in one structured call — simpler than heuristics + LLM fallback
- Init: Server-only API keys — `GITHUB_TOKEN` and `ANTHROPIC_API_KEY` with no `NEXT_PUBLIC_` prefix; non-negotiable from commit one
- Init: `providers.tsx` client boundary must be established in Phase 1 — irreversible if deferred

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 3 spike needed:** Whether `AnthropicAdapter` passes through `betas: ["structured-outputs-2025-11-13"]` is unconfirmed — classification call may need to bypass CopilotKit runtime entirely. Architecture accommodates the split.
- **Phase 4 spike needed:** Whether `useCopilotAction` with `render` property is current API or deprecated in favor of AG-UI / `useAgent` in CopilotKit 1.56.x needs doc verification before Phase 4 begins.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Classification | Rationale displayed in UI (`classification_reason`) | v2 candidate — include field in schema regardless | Init |
| Classification | Fallback card for unrecognized prType | Risk flag — recommend 5-line default branch in CARD_MAP | Init |
| UI | Confidence score + secondary PR type for ambiguous PRs | v2 | Init |

## Session Continuity

Last session: 2026-05-09
Stopped at: Roadmap and STATE.md created; REQUIREMENTS.md traceability updated
Resume file: None
