// app/api/analyze-pr/route.ts
//
// POST /api/analyze-pr — Phase 2 vertical-slice endpoint.
// Accepts {url: string}; validates against PR_URL_REGEX (D-01); fetches PR
// metadata via Octokit (D-09); applies size gate (D-10); paginates /files
// when within budget (D-11); returns discriminated union keyed on `status`
// (D-04, D-05). HTTP 400 only for invalid request (D-06); HTTP 5xx only
// for unexpected transport errors (D-07). Phase 3 (FETCH-04) will catch
// 401/404 from octokit.pulls.get and map to status: 'private-repo'.
//
// Server-only guard (Phase 1 lockdown): `import "@/lib/server-only"` MUST
// be the first import — process.env.GITHUB_TOKEN is read below.

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
    // D-13: Phase 2 lets these errors propagate. Phase 3 will catch 401/404
    // and map to status:'private-repo' / 'not-found'. For now → 5xx (D-07).
    const status = (err as { status?: number })?.status;
    return Response.json(
      {
        error: "GitHub API request failed.",
        upstreamStatus: status ?? null,
      },
      { status: status === 404 || status === 401 ? 502 : 500 },
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

  // TODO Plan 03-02 Task 1: populate prType+signals+classification_reason
  // from classifyPR(metadata, files). Phase 3 Plan 1 extended the 'ok' arm
  // with these required fields; the call site is wired in Plan 2.
  // @ts-expect-error Phase 3 Plan 2 wires this — see TODO above
  const ok: AnalyzeResponse = { status: "ok", metadata, files };
  // Runtime validation (cheap insurance against drift between types & API).
  const validated = AnalyzeResponseSchema.parse(ok);
  return Response.json(validated, { status: 200 });
}
