// app/api/analyze-pr/route.ts
//
// POST /api/analyze-pr — Phase 3 vertical-slice endpoint.
// Accepts {url: string}; validates against PR_URL_REGEX (D-01); fetches PR
// metadata via Octokit (D-09); applies size gate (D-10); paginates /files
// when within budget (D-11); classifies via Anthropic structured output
// (CLASS-01, Phase 3); returns discriminated union keyed on `status`
// (D-04, D-05). HTTP 400 only for invalid request (D-06); HTTP 5xx only
// for unexpected transport / classifier errors (D-07).
//
// Phase 3 additions over Phase 2:
//  - 401/403 from `pulls.get` → status: 'private-repo' (FETCH-04, HTTP 200)
//  - 404 from `pulls.get`     → status: 'not-found'    (HTTP 200)
//  - Successful pipeline → calls classifyPR() and merges
//    {prType, signals, classification_reason} into the 'ok' arm (CLASS-01).
//
// Server-only guard (Phase 1 lockdown): `import "@/lib/server-only"` MUST
// be the first import — process.env.GITHUB_TOKEN + ANTHROPIC_API_KEY are
// read transitively below.

import "@/lib/server-only";
import { Octokit } from "@octokit/rest";
import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  PR_URL_REGEX,
  SIZE_GATE_MAX_FILES,
  SIZE_GATE_MAX_LINES,
  type AnalyzeResponse,
  type PRFile,
  type PRMetadata,
} from "@/lib/types";
import { classifyPR } from "@/lib/anthropic";

// D-12: Octokit constructed unconditionally with auth; module-scoped so
// it is reused across requests. process.env.GITHUB_TOKEN MAY be undefined
// in dev — Octokit will fall back to anonymous (60/hr) which is fine for
// local curl testing of small public PRs.
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function POST(req: Request): Promise<Response> {
  // ---- Stage 0: parse + validate the request body ------------------------
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    // D-06: malformed JSON is a request validation failure, not app state.
    return Response.json(
      { error: 'Request body must be valid JSON with shape {"url": string}.' },
      { status: 400 },
    );
  }

  const parsed = AnalyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    // D-02: regex failure → HTTP 400, descriptive body, no normalization.
    return Response.json(
      {
        error: "Invalid request.",
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  // Extract owner / repo / pull_number from the URL using the SAME regex
  // the schema validated against (D-01). Capture groups are guaranteed
  // because the regex matched in safeParse.
  const match = parsed.data.url.match(PR_URL_REGEX)!;
  const owner = match[1];
  const repo = match[2];
  const pull_number = Number.parseInt(match[3], 10);

  // ---- Stage 1: fetch PR metadata (single API call, D-09) ----------------
  let pullData: Awaited<ReturnType<typeof octokit.pulls.get>>["data"];
  try {
    const result = await octokit.pulls.get({ owner, repo, pull_number });
    pullData = result.data;
  } catch (err) {
    const status = (err as { status?: number })?.status;

    if (status === 401 || status === 403) {
      // FETCH-04 — private repo, or token lacks access.
      // D-04: this is an expected outcome, not a server error → HTTP 200.
      // 403 is included alongside 401: GitHub returns 403 when the call is
      // authenticated but lacks read scope on the repo (private-repo intent).
      const body: AnalyzeResponse = { status: "private-repo" };
      return Response.json(AnalyzeResponseSchema.parse(body), { status: 200 });
    }

    if (status === 404) {
      // PR not found — well-formed URL, no such PR.
      const body: AnalyzeResponse = { status: "not-found" };
      return Response.json(AnalyzeResponseSchema.parse(body), { status: 200 });
    }

    // D-07: any other GitHub error stays a true server error.
    return Response.json(
      {
        error: "GitHub API request failed.",
        upstreamStatus: status ?? null,
      },
      { status: 500 },
    );
  }

  const metadata: PRMetadata = {
    owner,
    repo,
    pull_number,
    title: pullData.title,
    author: pullData.user?.login ?? "unknown",
    changed_files: pullData.changed_files,
    additions: pullData.additions,
    deletions: pullData.deletions,
  };

  // ---- Stage 1.5: size gate (D-10) ---------------------------------------
  const totalLines = metadata.additions + metadata.deletions;
  if (
    metadata.changed_files > SIZE_GATE_MAX_FILES ||
    totalLines > SIZE_GATE_MAX_LINES
  ) {
    const sizeExceeded: AnalyzeResponse = {
      status: "size-exceeded",
      fileCount: metadata.changed_files,
      lineCount: totalLines,
    };
    // Validate before sending so the runtime contract cannot drift from types.
    const validated = AnalyzeResponseSchema.parse(sizeExceeded);
    return Response.json(validated, { status: 200 });
  }

  // ---- Stage 2: paginate /pulls/{id}/files (D-11) ------------------------
  // octokit.paginate(...) walks per_page=100 pages until exhausted. The size
  // gate caps this at 3 pages / 300 entries — no incremental yield needed.
  let rawFiles: Array<Record<string, unknown>>;
  try {
    rawFiles = await octokit.paginate(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number,
      per_page: 100,
    });
  } catch (err) {
    const status = (err as { status?: number })?.status;
    return Response.json(
      {
        error: "GitHub API pagination failed.",
        upstreamStatus: status ?? null,
      },
      { status: 500 },
    );
  }

  const files: PRFile[] = rawFiles.map((f) => ({
    filename: String(f.filename),
    status: String(f.status),
    additions: Number(f.additions ?? 0),
    deletions: Number(f.deletions ?? 0),
    patch: typeof f.patch === "string" ? f.patch : undefined,
  }));

  // ---- Stage 3: classify via Anthropic (Phase 3, CLASS-01) ----------------
  let classification: Awaited<ReturnType<typeof classifyPR>>;
  try {
    classification = await classifyPR(metadata, files);
  } catch (err) {
    // Classifier failure is a server error (D-07): the request was valid,
    // GitHub responded, but the LLM step failed (rate limit, schema drift,
    // missing API key, etc.). Phase 3 does not have a 'classifier-failed'
    // status arm — keep the surface narrow, fail loud.
    return Response.json(
      {
        error: "Classification failed.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  const ok: AnalyzeResponse = {
    status: "ok",
    metadata,
    files,
    prType: classification.prType,
    signals: classification.signals,
    classification_reason: classification.classification_reason,
  };
  // Runtime validation (cheap insurance against drift between types & API).
  const validated = AnalyzeResponseSchema.parse(ok);
  return Response.json(validated, { status: 200 });
}
