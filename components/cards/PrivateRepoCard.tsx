// components/cards/PrivateRepoCard.tsx
//
// Phase 3 / Plan 03-02 — FETCH-04 verbatim message card.
// Body copy is locked by 03-UI-SPEC.md §"Copywriting Contract" — DO NOT
// paraphrase. The plan's grep gate enforces byte-for-byte identity.

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock } from "lucide-react";

export function PrivateRepoCard() {
  return (
    <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200">
      <Lock className="h-4 w-4" />
      <AlertTitle>Private repository</AlertTitle>
      <AlertDescription>
        This looks like a private repo — a GitHub token with access is required
      </AlertDescription>
    </Alert>
  );
}
