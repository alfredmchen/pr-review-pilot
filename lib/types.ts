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
// Per-card signal schemas (Phase 3 — concrete shapes locked in).
// Each schema's fields are derived from REQUIREMENTS.md CARD-01..CARD-04
// so the LLM structured output schema is final by the time Phase 3
// classifyPR() runs. Phase 4 populates UI from these fields verbatim.
//
// NOTE: signals.type and the parent ClassificationResult.prType MUST agree.
// The Zod schema enforces shape; lib/anthropic.ts adds a runtime cross-arm
// check that throws if signals.type !== prType.
// =====================================================================

/** CARD-01 — Security PR signals (risk flags, OWASP checklist, severity). */
export const SecuritySignalSchema = z.object({
  type: z.literal("security"),
  riskFlags: z.array(z.string()), // e.g. ["auth bypass risk", "unvalidated input"]
  affectedAuthPaths: z.array(z.string()), // file paths touching auth/permissions
  owaspChecklist: z.array(
    z.object({ id: z.string(), label: z.string() }),
  ), // checklist items — checked state lives in UI, not in payload
  severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
  hardcodedSecretsIndicator: z.boolean(),
});
export type SecuritySignal = z.infer<typeof SecuritySignalSchema>;

/** CARD-02 — Refactor PR signals (files moved, dependency impact, scope). */
export const RefactorSignalSchema = z.object({
  type: z.literal("refactor"),
  filesMovedOrRenamed: z.array(z.string()),
  dependencyImpact: z.string(), // free-text summary
  testCoverageDelta: z.string(), // e.g. "+3 tests / -1 test"
  behaviorPreservationNote: z.string(),
  scopeAssessment: z.enum(["focused", "mixed", "sprawling"]),
});
export type RefactorSignal = z.infer<typeof RefactorSignalSchema>;

/** CARD-03 — API change PR signals (before/after surface, breaking flags). */
export const ApiChangeSignalSchema = z.object({
  type: z.literal("api-change"),
  endpointsBefore: z.array(z.string()),
  endpointsAfter: z.array(z.string()),
  breakingChangeFlags: z.array(z.string()),
  versioningAssessment: z.string(),
  downstreamConsumersNote: z.string(),
  httpMethodOrStatusChanges: z.array(z.string()),
});
export type ApiChangeSignal = z.infer<typeof ApiChangeSignalSchema>;

/** CARD-04 — Bug fix PR signals (root cause, blast radius, regression risk). */
export const BugFixSignalSchema = z.object({
  type: z.literal("bug-fix"),
  rootCauseSummary: z.string(),
  blastRadius: z.string(),
  fixAdequacy: z.enum(["adequate", "partial", "questionable"]),
  regressionRiskFlag: z.boolean(),
  missingTestCoverage: z.boolean(),
});
export type BugFixSignal = z.infer<typeof BugFixSignalSchema>;

export const PRSignalsSchema = z.discriminatedUnion("type", [
  SecuritySignalSchema,
  RefactorSignalSchema,
  ApiChangeSignalSchema,
  BugFixSignalSchema,
]);
export type PRSignals = z.infer<typeof PRSignalsSchema>;

// =====================================================================
// ClassificationResult — the LLM's structured output contract.
// `classification_reason` is included even though Phase 3 UI does not
// display it (per 03-CONTEXT.md "Deferred Ideas" + REQUIREMENTS.md v1.1
// candidate); persisting it now avoids a schema migration later.
//
// Cross-arm constraint: signals.type MUST equal prType. This is NOT
// expressible in a Zod discriminatedUnion at the parent level, so
// lib/anthropic.ts performs the runtime check after parse and throws
// on mismatch. Treat any consumer of ClassificationResult that does
// not go through classifyPR() as needing its own consistency check.
// =====================================================================
export const ClassificationResultSchema = z.object({
  prType: PRTypeSchema,
  signals: PRSignalsSchema,
  classification_reason: z.string(), // v1.1 candidate — populated, not displayed in Phase 3
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

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
// PRAnalysis — the type the (Phase 3+) UI dispatcher consumes. Phase 3
// always provides prType, signals, and classification_reason on success;
// they are now REQUIRED (Phase 2 made them optional only because the
// pipeline could not yet produce them).
// =====================================================================
export type PRAnalysis = {
  metadata: PRMetadata;
  files: PRFile[];
  prType: PRType;
  signals: PRSignals;
  classification_reason: string;
};

// =====================================================================
// AnalyzeResponse — the discriminated union returned by /api/analyze-pr.
// Phase 3 extends Phase 2's two-arm union with three new status arms
// (private-repo, not-found, invalid-url) AND adds prType + signals +
// classification_reason to the existing 'ok' arm. Phase 2 stable arms
// (size-exceeded) are unchanged.
// =====================================================================

export const AnalyzeOkSchema = z.object({
  status: z.literal("ok"),
  metadata: PRMetadataSchema,
  files: z.array(PRFileSchema),
  prType: PRTypeSchema,
  signals: PRSignalsSchema,
  classification_reason: z.string(), // mirrors ClassificationResult; persisted into the response
});
export type AnalyzeOk = z.infer<typeof AnalyzeOkSchema>;

export const AnalyzeSizeExceededSchema = z.object({
  status: z.literal("size-exceeded"),
  fileCount: z.number().int().nonnegative(),
  lineCount: z.number().int().nonnegative(),
});
export type AnalyzeSizeExceeded = z.infer<typeof AnalyzeSizeExceededSchema>;

/** Phase 3 FETCH-04 — Octokit raises 401 on private repos the token cannot read. */
export const AnalyzePrivateRepoSchema = z.object({
  status: z.literal("private-repo"),
});
export type AnalyzePrivateRepo = z.infer<typeof AnalyzePrivateRepoSchema>;

/** Phase 3 — 404 from pulls.get; URL is well-formed but the PR does not exist. */
export const AnalyzeNotFoundSchema = z.object({
  status: z.literal("not-found"),
});
export type AnalyzeNotFound = z.infer<typeof AnalyzeNotFoundSchema>;

/** Phase 3 — request URL did not match PR_URL_REGEX (server-side echo of a
 *  failure that is also pre-validated client-side). Carries a human-readable
 *  message so the UI can display it under the input. */
export const AnalyzeInvalidUrlSchema = z.object({
  status: z.literal("invalid-url"),
  message: z.string(),
});
export type AnalyzeInvalidUrl = z.infer<typeof AnalyzeInvalidUrlSchema>;

export const AnalyzeResponseSchema = z.discriminatedUnion("status", [
  AnalyzeOkSchema,
  AnalyzeSizeExceededSchema,
  AnalyzePrivateRepoSchema,
  AnalyzeNotFoundSchema,
  AnalyzeInvalidUrlSchema,
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
