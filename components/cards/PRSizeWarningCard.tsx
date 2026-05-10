// components/cards/PRSizeWarningCard.tsx
//
// Phase 3 / Plan 03-02 — FETCH-05 size warning card. Renders when
// /api/analyze-pr returns {status:'size-exceeded'}. Interpolates fileCount
// + lineCount from props (the schema's discriminated union supplies them).

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function PRSizeWarningCard({
  fileCount,
  lineCount,
}: {
  fileCount: number;
  lineCount: number;
}) {
  return (
    <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-900 dark:text-yellow-200">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>PR is too large to analyze</AlertTitle>
      <AlertDescription>
        This PR has {fileCount} files and {lineCount} lines changed. We classify PRs up to 300 files and 20,000 lines. Try reviewing it in smaller chunks.
      </AlertDescription>
    </Alert>
  );
}
