import { z } from "zod";

// =====================================================================
// PRType — locked enum of the four classifications (per ROADMAP Phase 4
// success criteria + REQUIREMENTS CARD-01..CARD-04). Used for exhaustive
// switch dispatch in Phase 3+ UI.
// =====================================================================
export const PR_TYPES = [
  "security",
  "refactor",
  "api-change",
  "bug-fix",
] as const;

export type PRType = (typeof PR_TYPES)[number];
export const PRTypeSchema = z.enum(PR_TYPES);

// =====================================================================
// Signal shape placeholders — populated by Phase 3 LLM structured output.
// Phase 2 only needs them to EXIST and be importable (success criterion #1).
// Per 02-CONTEXT.md "Claude's Discretion": shapes are deferred; using
// permissive Record placeholders that Phase 3 will narrow without breaking
// imports. Each is keyed to its CARD-NN requirement for traceability.
// =====================================================================

/** CARD-01 — fields populated by Phase 3 LLM call. */
export type SecuritySignal = {
  type: "security";
} & Record<string, unknown>;

/** CARD-02 — fields populated by Phase 3 LLM call. */
export type RefactorSignal = {
  type: "refactor";
} & Record<string, unknown>;

/** CARD-03 — fields populated by Phase 3 LLM call. */
export type ApiChangeSignal = {
  type: "api-change";
} & Record<string, unknown>;

/** CARD-04 — fields populated by Phase 3 LLM call. */
export type BugFixSignal = {
  type: "bug-fix";
} & Record<string, unknown>;

export type PRSignals =
  | SecuritySignal
  | RefactorSignal
  | ApiChangeSignal
  | BugFixSignal;

// =====================================================================
// PR metadata + file shape (Octokit pulls.get / pulls.listFiles subset).
// Only the fields Phase 2 + Phase 3 actually use are encoded.
// =====================================================================

export const PRMetadataSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pull_number: z.number().int().positive(),
  title: z.string(),
  author: z.string(), // user.login
  changed_files: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});
export type PRMetadata = z.infer<typeof PRMetadataSchema>;

export const PRFileSchema = z.object({
  filename: z.string(),
  status: z.string(), // "added" | "modified" | "removed" | "renamed" | ...
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  patch: z.string().optional(), // GitHub omits patch for binary / huge files
});
export type PRFile = z.infer<typeof PRFileSchema>;

// =====================================================================
// PRAnalysis — the type the (Phase 3+) UI dispatcher consumes.
// Phase 2 populates `metadata` + `files`; `signals` and `prType` are
// nullable until Phase 3 wires the LLM call. This shape is importable
// today and extends cleanly without breaking Phase 2 callers.
// =====================================================================
export type PRAnalysis = {
  metadata: PRMetadata;
  files: PRFile[];
  prType?: PRType;
  signals?: PRSignals;
};

// =====================================================================
// AnalyzeResponse — the discriminated union returned by /api/analyze-pr.
// Phase 2 enumerates exactly two members (D-05). Phase 3 will extend.
// =====================================================================

export const AnalyzeOkSchema = z.object({
  status: z.literal("ok"),
  metadata: PRMetadataSchema,
  files: z.array(PRFileSchema),
});
export type AnalyzeOk = z.infer<typeof AnalyzeOkSchema>;

export const AnalyzeSizeExceededSchema = z.object({
  status: z.literal("size-exceeded"),
  fileCount: z.number().int().nonnegative(),
  lineCount: z.number().int().nonnegative(),
});
export type AnalyzeSizeExceeded = z.infer<typeof AnalyzeSizeExceededSchema>;

export const AnalyzeResponseSchema = z.discriminatedUnion("status", [
  AnalyzeOkSchema,
  AnalyzeSizeExceededSchema,
]);
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

// =====================================================================
// Request body validation (D-01: strict regex; D-02: 400 on failure).
// Owner/repo: GitHub allows `[A-Za-z0-9._-]+`; PR number: `\d+`.
// =====================================================================
export const PR_URL_REGEX =
  /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\/?$/;

export const AnalyzeRequestSchema = z.object({
  url: z
    .string()
    .regex(
      PR_URL_REGEX,
      "URL must match https://github.com/{owner}/{repo}/pull/{N}",
    ),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// =====================================================================
// Size gate constants (D-10).
// =====================================================================
export const SIZE_GATE_MAX_FILES = 300;
export const SIZE_GATE_MAX_LINES = 20000;
