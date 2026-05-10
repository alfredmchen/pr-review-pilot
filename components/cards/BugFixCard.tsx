// components/cards/BugFixCard.tsx
//
// Phase 4 / Plan 04-01 — CARD-04.
// Real Bug fix review card. Consumes BugFixSignal verbatim. Server component.
// Empty-field rule: missing/empty fields render as em-dash "—" (U+2014).

import type { BugFixSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";

export function BugFixCard({ signals }: { signals: BugFixSignal }) {
  const adequacyBadge =
    signals.fixAdequacy === "adequate" ? (
      <Badge variant="secondary">adequate fix</Badge>
    ) : signals.fixAdequacy === "questionable" ? (
      <Badge variant="destructive">questionable fix</Badge>
    ) : (
      <Badge>partial fix</Badge>
    );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Bug className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">
            Bug fix review
          </CardTitle>
          <Badge>bug-fix</Badge>
          {adequacyBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <h3 className="font-medium">Root cause</h3>
          <p className="mt-1">
            {signals.rootCauseSummary?.trim() ? signals.rootCauseSummary : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Blast radius</h3>
          <p className="mt-1">
            {signals.blastRadius?.trim() ? signals.blastRadius : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Regression risk</h3>
          <p className="mt-1">
            {signals.regressionRiskFlag ? (
              <span className="text-destructive">
                ⚠ Regression risk flagged
              </span>
            ) : (
              <span className="text-muted-foreground">
                No regression risk flagged
              </span>
            )}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Test coverage</h3>
          <p className="mt-1">
            {signals.missingTestCoverage ? (
              <span className="text-yellow-600 dark:text-yellow-400">
                ⚠ Missing test coverage for this fix
              </span>
            ) : (
              <span className="text-muted-foreground">
                Tests cover this change
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
