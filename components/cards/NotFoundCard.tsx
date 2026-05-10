// components/cards/NotFoundCard.tsx
//
// Phase 3 / Plan 03-02 — Not-found status card. Renders when /api/analyze-pr
// returns {status:'not-found'} (404 from octokit.pulls.get on a well-formed
// URL pointing at a non-existent PR).

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SearchX } from "lucide-react";

export function NotFoundCard() {
  return (
    <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200">
      <SearchX className="h-4 w-4" />
      <AlertTitle>Pull request not found</AlertTitle>
      <AlertDescription>
        We couldn&apos;t find this PR. Check that the URL is correct and the repository is public.
      </AlertDescription>
    </Alert>
  );
}
