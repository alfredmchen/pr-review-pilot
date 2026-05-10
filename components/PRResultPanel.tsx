"use client";

// components/PRResultPanel.tsx
//
// Phase 3 / Plan 03-02 — THE dispatcher. Switches on response.status first,
// then on response.prType for the 'ok' arm. Both switches are exhaustive
// (TypeScript `never` check on default) AND have a runtime fallback
// (UnclassifiedCard) so unexpected values cannot render nothing.
//
// This component is intentionally NOT registered with `useCopilotAction` in
// Phase 3 — that's a Phase 4 concern. Phase 3 renders cards directly via the
// CARD_MAP. Phase 4 will refactor to CopilotKit generative UI but the visual
// surfaces stay the same.
//
// Skeleton state (kind:'loading') is rendered here, not in PRUrlForm, so the
// loading surface is co-located with the result surfaces it replaces. The
// FETCH-03 100ms target is met by PRUrlForm flipping `state` to 'loading'
// synchronously inside `startTransition` before awaiting the fetch.

import type { ReactElement } from "react";
import type { AnalyzeResponse, PRType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateRepoCard } from "@/components/cards/PrivateRepoCard";
import { NotFoundCard } from "@/components/cards/NotFoundCard";
import { PRSizeWarningCard } from "@/components/cards/PRSizeWarningCard";
import { SecurityCardPlaceholder } from "@/components/cards/SecurityCardPlaceholder";
import { RefactorCardPlaceholder } from "@/components/cards/RefactorCardPlaceholder";
import { ApiChangeCardPlaceholder } from "@/components/cards/ApiChangeCardPlaceholder";
import { BugFixCardPlaceholder } from "@/components/cards/BugFixCardPlaceholder";
import { UnclassifiedCard } from "@/components/cards/UnclassifiedCard";

type PanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; response: AnalyzeResponse }
  | { kind: "error"; message: string };

const CARD_MAP: Record<PRType, () => ReactElement> = {
  security: SecurityCardPlaceholder,
  refactor: RefactorCardPlaceholder,
  "api-change": ApiChangeCardPlaceholder,
  "bug-fix": BugFixCardPlaceholder,
};

export function PRResultPanel({ state }: { state: PanelState }) {
  if (state.kind === "idle") return null;

  if (state.kind === "loading") {
    // FETCH-03 skeleton — exact shape from UI-SPEC §"Skeleton shape".
    // aria-live="polite" + sr-only text for screen-reader announcement.
    return (
      <Card aria-live="polite" className="p-6">
        <span className="sr-only">Analyzing pull request…</span>
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </Card>
    );
  }

  if (state.kind === "error") {
    return (
      <Card className="p-6 border-destructive">
        <p className="text-sm text-destructive">{state.message}</p>
      </Card>
    );
  }

  // state.kind === "result"
  const r = state.response;
  switch (r.status) {
    case "ok": {
      // Belt + suspenders: Zod already enforced the prType enum on the route
      // success path, but `?? UnclassifiedCard` defends against any future
      // schema drift or LLM-driven enum widening that bypasses validation.
      const Component = CARD_MAP[r.prType] ?? UnclassifiedCard;
      return <Component />;
    }
    case "size-exceeded":
      return <PRSizeWarningCard fileCount={r.fileCount} lineCount={r.lineCount} />;
    case "private-repo":
      return <PrivateRepoCard />;
    case "not-found":
      return <NotFoundCard />;
    case "invalid-url":
      // PRUrlForm pre-validates and renders inline error before fetching, so
      // this arm is defensive — only triggers if the server returns the arm
      // in a body (currently it returns HTTP 400 with a different shape).
      return <UnclassifiedCard />;
    default: {
      // Exhaustiveness check — TypeScript will surface a new arm here at
      // compile time if AnalyzeResponse grows. Runtime fallback keeps the UI
      // alive even if a future arm slips past the type narrowing.
      const _exhaustive: never = r;
      void _exhaustive;
      return <UnclassifiedCard />;
    }
  }
}

export type { PanelState };
