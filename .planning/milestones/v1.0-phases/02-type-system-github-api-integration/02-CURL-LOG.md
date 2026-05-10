# Phase 02 Plan 01 — Curl Verification Log

**Run timestamp:** 2026-05-09T23:42Z (UTC)
**Server:** Next.js 16.2.6 dev server on `http://localhost:3000` (already running with HMR)
**Authentication:** anonymous (`.env.local` declares `GITHUB_TOKEN=` empty; Octokit fell back to anon, 60/hr public rate limit). Each scenario was a single API call (Scenario B's size gate prevented pagination), well under the limit.

## Scenario A — Small PR (status: ok)

**URL:** `https://github.com/octocat/Hello-World/pull/1`

**Request:**
```
POST /api/analyze-pr
Content-Type: application/json
{"url":"https://github.com/octocat/Hello-World/pull/1"}
```

**Response (HTTP 200):**
```json
{
  "status": "ok",
  "metadata": {
    "owner": "octocat",
    "repo": "Hello-World",
    "pull_number": 1,
    "title": "Edited README via GitHub",
    "author": "unoju",
    "changed_files": 1,
    "additions": 6,
    "deletions": 1
  },
  "files": [
    {
      "filename": "README",
      "status": "modified",
      "additions": 6,
      "deletions": 1,
      "patch": "@@ -1 +1,6 @@\n-Hello World!\n\\ No newline at end of file\n+Hello World!\n+$ mkdir ~/Hello-World..."
    }
  ]
}
```

**Assertions PASSED:**
- `status === "ok"`
- `metadata.title` populated ("Edited README via GitHub")
- `metadata.author` populated ("unoju")
- `metadata.changed_files` is a number (1)
- `files` is an array with length 1 (≥1 required)

## Scenario B — Oversized PR (status: size-exceeded)

**URL:** `https://github.com/nodejs/node/pull/62898` (deps: upgrade npm to 11.13.0 — chosen because it is a known massive npm-vendor bump that exceeds both gates: 452 changed files, 41,006 line diff)

**Pre-check via direct GitHub API:** `cf=452, additions=38033, deletions=2973` → both gates tripped (changed_files > 300 AND lines > 20000).

**Request:**
```
POST /api/analyze-pr
Content-Type: application/json
{"url":"https://github.com/nodejs/node/pull/62898"}
```

**Response (HTTP 200 — NOT 500):**
```json
{"status":"size-exceeded","fileCount":452,"lineCount":41006}
```

**Assertions PASSED:**
- HTTP code is 200 (not 500 — proves size-exceeded is not a transport error)
- `status === "size-exceeded"`
- `fileCount` is numeric (452)
- `lineCount` is numeric (41006)
- Gate tripped: `fileCount > 300` AND `lineCount > 20000`
- Server made exactly ONE GitHub API call (`pulls.get`); no pagination triggered (D-10 verified at runtime)

## Scenario C — Invalid URL (HTTP 400)

**URL:** `https://github.com/foo/bar` (no `/pull/N` suffix; fails `PR_URL_REGEX`)

**Request:**
```
POST /api/analyze-pr
Content-Type: application/json
{"url":"https://github.com/foo/bar"}
```

**Response (HTTP 400):**
```json
{
  "error": "Invalid request.",
  "details": ["URL must match https://github.com/{owner}/{repo}/pull/{N}"]
}
```

**Assertions PASSED:**
- HTTP code is 400 (not 200, not 500)
- Body has `error` field populated
- D-02 contract verified: regex failure returns descriptive 400, no normalization, no suffix tolerance

## Build Verification

`npx tsc --noEmit` → exit 0
`npm run build` → exit 0; `/api/analyze-pr` registered as dynamic route (`ƒ`)

## Reproducibility

These three URLs are stable public PRs and should be re-runnable by Phase 3's verifier indefinitely. If `nodejs/node#62898` ever has its merge undone or the diff shrinks below the gate (very unlikely for a merged npm-vendor bump), substitute another `deps: upgrade npm to ...` PR from `https://github.com/nodejs/node/pulls?q=is%3Apr+is%3Amerged+npm` — Node.js periodically merges these and they are reliably oversized.
