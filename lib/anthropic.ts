import "@/lib/server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  ClassificationResultSchema,
  type ClassificationResult,
  type PRMetadata,
  type PRFile,
} from "@/lib/types";

// =====================================================================
// Anthropic client (Phase 3 — Plan 03-01).
//
// Single classify+extract call: input = PR metadata + diff (truncated to
// the size cap below); output = ClassificationResult (Zod-validated).
// All callers MUST be server-side — the `import "@/lib/server-only"` on
// line 1 makes the Next.js build fail if this module is bundled into a
// Client Component tree, preventing accidental ANTHROPIC_API_KEY leakage.
//
// Module-scoped client mirrors the Octokit pattern in app/api/analyze-pr/
// route.ts: auth is captured at first import, the client is reused across
// requests. We do NOT throw at construction when ANTHROPIC_API_KEY is
// undefined — the SDK fails on the first request instead, which keeps the
// cold path unaffected by missing-key dev environments (e.g. running
// `next build` without secrets).
// =====================================================================
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = "claude-haiku-4-5-20251001";
// ~60-80k tokens of patch content; Phase 2's 300-file/20k-line size gate
// already excludes the worst cases before we get here.
const MAX_TOTAL_PATCH_CHARS = 240_000;
const MAX_LINES_PER_FILE = 200;

/**
 * Build a token-budget-aware patch dump for the classifier prompt.
 *
 * - Always includes every filename + status (never silently drops a file)
 * - Truncates per-file patch content to MAX_LINES_PER_FILE
 * - Stops adding patch bodies once total chars >= MAX_TOTAL_PATCH_CHARS
 *   (filenames + status continue to be emitted past the cap)
 */
function buildDiffSummary(files: PRFile[]): string {
  let totalChars = 0;
  const sections: string[] = [];

  for (const f of files) {
    const header = `\n--- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions}) ---\n`;
    sections.push(header);
    totalChars += header.length;

    if (!f.patch) {
      sections.push("[no patch — binary or omitted by GitHub]\n");
      continue;
    }

    if (totalChars >= MAX_TOTAL_PATCH_CHARS) {
      sections.push("[patch omitted — total size cap reached]\n");
      continue;
    }

    const lines = f.patch.split("\n");
    const truncated = lines.slice(0, MAX_LINES_PER_FILE).join("\n");
    sections.push(
      truncated +
        (lines.length > MAX_LINES_PER_FILE ? "\n[…truncated]\n" : "\n"),
    );
    totalChars += truncated.length;
  }

  return sections.join("");
}

const SYSTEM_PROMPT = `You are a code review classifier. Given GitHub pull request metadata and its diff, classify it into exactly one of four types and extract structured signals for review.

The four types:
- security: changes to auth, permissions, secrets, crypto, input validation, or other security-sensitive surfaces
- refactor: structural changes (renames, moves, extractions) that should preserve behavior
- api-change: changes to public API surface (HTTP routes, exported functions, schemas) that consumers depend on
- bug-fix: targeted change addressing an incorrect behavior

You MUST return JSON matching the provided schema exactly. The signals.type field MUST equal the prType field. Always include a classification_reason explaining the choice in one sentence.`;

/**
 * Classify a PR and extract structured signals via a single Anthropic call.
 *
 * Implementation note (per PLAN 03-01 Task 2): we use prompt-coerced JSON +
 * Zod runtime validation rather than Anthropic's structured-outputs beta
 * (`betas: ["structured-outputs-2025-11-13"]`). STATE.md flagged the beta
 * stability as a Phase 3 spike concern; the conservative path enforces the
 * contract via Zod regardless and avoids gambling on a beta flag for a
 * deadline run. Phase 4 may revisit if the beta becomes GA.
 *
 * @throws Error on non-JSON model output, schema validation failure, or
 *   signals.type/prType cross-arm mismatch. The /api/analyze-pr route
 *   handler converts thrown errors to HTTP 5xx (Phase 2 D-07).
 */
export async function classifyPR(
  metadata: PRMetadata,
  files: PRFile[],
): Promise<ClassificationResult> {
  const diffSummary = buildDiffSummary(files);

  const userMessage = `PR Title: ${metadata.title}
Author: ${metadata.author}
Files changed: ${metadata.changed_files}
Additions: ${metadata.additions}, Deletions: ${metadata.deletions}

Diff:
${diffSummary}

Return a JSON object matching this TypeScript type exactly:
{
  prType: "security" | "refactor" | "api-change" | "bug-fix",
  signals: SecuritySignal | RefactorSignal | ApiChangeSignal | BugFixSignal,  // signals.type === prType
  classification_reason: string  // one sentence
}

Where each Signal has these fields (pick the one matching your prType choice):
- SecuritySignal: { type: "security", riskFlags: string[], affectedAuthPaths: string[], owaspChecklist: { id: string, label: string }[], severity: "HIGH"|"MEDIUM"|"LOW", hardcodedSecretsIndicator: boolean }
- RefactorSignal: { type: "refactor", filesMovedOrRenamed: string[], dependencyImpact: string, testCoverageDelta: string, behaviorPreservationNote: string, scopeAssessment: "focused"|"mixed"|"sprawling" }
- ApiChangeSignal: { type: "api-change", endpointsBefore: string[], endpointsAfter: string[], breakingChangeFlags: string[], versioningAssessment: string, downstreamConsumersNote: string, httpMethodOrStatusChanges: string[] }
- BugFixSignal: { type: "bug-fix", rootCauseSummary: string, blastRadius: string, fixAdequacy: "adequate"|"partial"|"questionable", regressionRiskFlag: boolean, missingTestCoverage: boolean }

Respond ONLY with JSON, no surrounding text.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  // Concatenate all text blocks; ignore tool_use / thinking / other block types.
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  // Strip markdown fences if the model wrapped the JSON in ```json ... ```.
  const jsonText = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(
      `classifyPR: model returned non-JSON. First 200 chars: ${rawText.slice(0, 200)}`,
    );
  }

  const result = ClassificationResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `classifyPR: schema validation failed. Issues: ${JSON.stringify(result.error.issues.slice(0, 3))}`,
    );
  }

  // Cross-arm consistency check: signals.type MUST equal prType. The Zod
  // discriminatedUnion at the parent (ClassificationResultSchema) enforces
  // signals shape but NOT the cross-field equality, so we check it here.
  if (result.data.signals.type !== result.data.prType) {
    throw new Error(
      `classifyPR: signals.type=${result.data.signals.type} does not match prType=${result.data.prType}`,
    );
  }

  return result.data;
}
