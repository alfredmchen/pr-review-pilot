# PR Review Copilot

## What This Is

A web tool where you paste a GitHub PR URL and get a completely different review interface depending on what's actually in the diff. Security-sensitive change → security checklist card. Big refactor → architecture impact card. API change → before/after surface card. Small bug fix → simple approve/comment card. The interface adapts to the PR — not the other way around.

## Core Value

The right review interface for this specific PR, so reviewers focus on the real risks instead of generating noise.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can paste a GitHub PR URL and fetch its diff + metadata
- [ ] LLM classifies the PR type and extracts key signals in one structured call
- [ ] Security PR type renders: risk flags, affected auth paths, checklist
- [ ] Refactor PR type renders: files moved, dependency impact, test coverage delta
- [ ] API change PR type renders: before/after endpoint surface, breaking change flags
- [ ] Bug fix PR type renders: root cause card, affected area, approve/comment controls
- [ ] CopilotKit renders the correct component set based on classification result

### Out of Scope

- Writing comments back to GitHub — reviewers use this tool to guide their thinking, not to auto-post
- PR author prep mode (both-sided use is acknowledged but MVP is reviewer-first)
- More than 4 PR type classifications — complexity grows fast, 4 types covers the demo

## Context

- GitHub API is free, reliable, and doesn't require special permissions for public repos
- CopilotKit is the AI UI layer — its native environment is Next.js, which is the chosen stack
- The demo format is: 3 different PR URLs → 3 completely different rendered UIs
- Primary pain point: current PR review UI is one-size-fits-all → too much noise, reviewers miss real risks
- Both reviewers and PR authors can use this, but the flow is reviewer-centric (paste URL → get guidance)

## Constraints

- **Tech Stack**: Next.js + CopilotKit + GitHub API + Claude (LLM) — decided upfront
- **Scope**: MVP is 4 PR types, 4 component sets — no scope creep past this for v1
- **Demo**: Must show 3 distinct PR types rendering 3 distinct UIs — that's the success condition

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| LLM classifies the diff (one call) | Simpler than heuristics + LLM fallback; one structured output covers classify + extract | — Pending |
| Next.js as frontend | CopilotKit's native environment — easiest integration path | — Pending |
| No GitHub write-back in v1 | Keeps scope tight; read-only via GitHub API is sufficient for the demo | — Pending |
| 4 PR types, not more | Covers the four archetypes devs encounter most; demo-sized | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-09 after initialization*
