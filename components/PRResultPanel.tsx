"use client";

// components/PRResultPanel.tsx
//
// Phase 4 / Plan 04-01 — dispatcher updated to render the four REAL cards
// from Phase 4. Switch shape preserved: status switch first (with
// exhaustiveness check + UnclassifiedCard fallback), then prType switch
// inside the 'ok' arm (also exhaustive + UnclassifiedCard fallback).
//
// Cross-arm narrowing: r.status === "ok" narrows r to AnalyzeOk, but
// AnalyzeOk.signals is the union PRSignals — TypeScript does NOT cross-narrow
// signals.type from r.prType because the cross-field invariant is not
// expressible in the AnalyzeOk schema. The runtime constraint
// (signals.type === prType) is enforced by lib/anthropic.ts after Zod parse;
// we cast `r.signals as XSignal` per branch on that contract.
//
// Phase 3 carryover: skeleton state, error state, status arms (size-exceeded,
// private-repo, not-found, invalid-url) are unchanged.

import type { AnalyzeResponse, PRType } from "@/lib/types";
import type {
  SecuritySignal,
  RefactorSignal,
  ApiChangeSignal,
  BugFixSignal,
} from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivateRepoCard } from "@/components/cards/PrivateRepoCard";
import { NotFoundCard } from "@/components/cards/NotFoundCard";
import { PRSizeWarningCard } from "@/components/cards/PRSizeWarningCard";
import { SecurityCard } from "@/components/cards/SecurityCard";
import { RefactorCard } from "@/components/cards/RefactorCard";
import { ApiChangeCard } from "@/components/cards/ApiChangeCard";
import { BugFixCard } from "@/components/cards/BugFixCard";
import { UnclassifiedCard } from "@/components/cards/UnclassifiedCard";

type PanelState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "result"; response: AnalyzeResponse }
  | { kind: "error"; message: string };

// Two-layer dispatch: prType selects the component; signals are passed
// through as a prop. Kept as `as const satisfies` so a future refactor can
// switch back to lookup-style dispatch if signal narrowing improves.
// Reference is also used by CopilotPRResultPanel's render callback (Task 3).
const CARD_MAP = {
  security: SecurityCard,
  refactor: RefactorCard,
  "api-change": ApiChangeCard,
  "bug-fix": BugFixCard,
} as const satisfies Record<PRType, unknown>;
void CARD_MAP;

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
      // Belt + suspenders narrowing — see file header for the cross-arm
      // contract that justifies the `as` casts.
      switch (r.prType) {
        case "security":
          return <SecurityCard signals={r.signals as SecuritySignal} />;
        case "refactor":
          return <RefactorCard signals={r.signals as RefactorSignal} />;
        case "api-change":
          return <ApiChangeCard signals={r.signals as ApiChangeSignal} />;
        case "bug-fix":
          return <BugFixCard signals={r.signals as BugFixSignal} />;
        default: {
          const _exhaustive: never = r.prType;
          void _exhaustive;
          return <UnclassifiedCard />;
        }
      }
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
