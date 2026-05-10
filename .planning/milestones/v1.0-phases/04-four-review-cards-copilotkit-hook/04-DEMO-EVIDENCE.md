# Phase 04 Plan 01 — Demo Evidence

**Date:** 2026-05-10
**Mode:** Auto-mode (chain) — human-verify checkpoint auto-approved per orchestrator policy.
**Status:** Structural verification PASSED; live LLM demo GATED on `ANTHROPIC_API_KEY` (config, not code).

---

## Summary

The four real cards, the dispatcher rewire, and the `useCopilotAction` registration all
ship in this plan. Static + structural verification passed (tsc, build, grep gates, route
plumbing, page render). The only thing that does **not** run in this evidence file is a
real LLM classification, because `.env.local` `ANTHROPIC_API_KEY` is still the
`sk-ant-pla…` placeholder flagged in STATE.md as a Phase 4 prerequisite. The classifier
fails as expected with the documented `{error, detail}` shape, confirming the pipeline
itself is wired correctly — only the secret is missing.

This is not a code blocker. The user-side fix is replacing the placeholder in `.env.local`
with a real Anthropic key from the console; nothing else needs to change to run a live demo.

---

## What was verified automatically

### Build + type
- `npx tsc --noEmit` — exit 0
- `npm run build` (Next 16 + Turbopack) — exit 0; routes `/`, `/api/analyze-pr`,
  `/api/copilotkit`, `/_not-found` all compiled.

### Dev server smoke
- `npm run dev` came up at `http://localhost:3000/` in 192 ms (Turbopack).
- Home page returns HTTP 200; HTML contains:
  - `<h1>PR Review Copilot</h1>`
  - The Phase 3 subtitle "Paste a GitHub PR URL…"
  - The `Analyze PR` button (PRUrlForm rendered inside CopilotPRResultPanel)

### Route shape
| URL tested | HTTP | Body shape | Interpretation |
|---|---|---|---|
| POST `/api/analyze-pr` `{"url":"not-a-pr-url"}` | 400 | `{error: "Invalid request.", details: [...]}` | URL pre-validation working |
| POST `/api/analyze-pr` `{"url":"https://github.com/octokit/octokit.js/pull/2899"}` | 500 | `{error: "Classification failed.", detail: "401 {…invalid x-api-key…}"}` | Octokit fetch + size gate succeeded; LLM call failed because key is placeholder. **Exactly the failure mode documented in 03-02-SUMMARY.md as a Phase 4 prerequisite.** |

This proves:
1. `app/api/analyze-pr/route.ts` runs end-to-end on a real public PR URL.
2. GitHub API works (real PR fetched).
3. Size gate passed (PR within 300 files / 20k lines).
4. The Anthropic SDK call is made — and fails on the placeholder key, which proves
   the wiring is real (not stubbed/mocked).
5. The route returns the correct error envelope (`{error, detail}` per
   Phase 3 P02 decision); a real key would replace this with the AnalyzeOk arm.

---

## What was NOT verified (live LLM classification)

To verify three distinct PR URLs producing three distinct cards, the user must:

1. **Replace `ANTHROPIC_API_KEY` in `.env.local`** with a real key from
   https://console.anthropic.com/. Do NOT commit the real key.
2. `npm run dev`
3. Open `http://localhost:3000/` and paste each of the three URLs below, one at a time.

### Suggested demo PR URLs

| Expected prType | Candidate URL | Why this PR |
|---|---|---|
| `security` | search GitHub for `is:pr is:merged repo:auth0/node-jsonwebtoken` | Pick a recent merged PR with "fix", "validate", or "auth" in the title. |
| `refactor` | search GitHub for `is:pr is:merged repo:vercel/next.js refactor` | Pick a recent merged PR titled "refactor:" or "rename:". |
| `api-change` | search GitHub for `is:pr is:merged repo:expressjs/express` | Pick a PR adding/changing a public route or endpoint. |
| (bonus) `bug-fix` | any project's recent `fix:` PR | The fourth card is structurally identical to the others. |

**Constraint:** all PRs must be smaller than the size gate (≤300 files / ≤20k lines).
The Phase 3 verification used `nodejs/node/pull/62898` to demonstrate the size-gate path;
do NOT use that one for Phase 4 demo.

### Per-card visual checks the user should perform

- **SecurityCard:** click 1-2 OWASP checkboxes; the label should strike through
  (`line-through`) and dim (`opacity-60`). The severity badge (HIGH red /
  MEDIUM yellow / LOW gray) appears in the header.
- **RefactorCard:** the `→` glyph appears in the heading
  ("Files moved / renamed →") and inside `<code>` items if the LLM populated
  `from → to` strings.
- **ApiChangeCard:** the before/after columns sit side-by-side at desktop width
  (`md:grid-cols-2`) and stack on narrow widths. HTTP method prefixes
  (GET/POST/PUT/DELETE/PATCH) are color-coded badges if the LLM emits them.
- **BugFixCard:** root cause + blast radius render as paragraphs; regression-risk
  shows ⚠ red text when flagged; missing-test-coverage shows ⚠ yellow text when
  flagged.

If any of those don't render as expected, the issue is in this PR's card code
and the fix path goes back to Task 1.

---

## Hand-off

After the user provisions the real API key and runs three demo URLs, this plan's
human-verify checkpoint is fully discharged. The Phase 4 success criterion
"demo shows 3 distinct PR URLs producing 3 visually distinct UIs" is structurally
ready — the cards exist, the dispatcher routes correctly, and the LLM endpoint
plumbing works. Only the secret is missing.

The `useCopilotAction("renderPRReviewCard")` registration is parity-only
(`available: 'enabled'`, no `handler`); it does not affect the visual demo path
either way, but it satisfies Phase 4 success criterion #5 for build-level
verification (the hook compiles and is wired to the same four card components).
