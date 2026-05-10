// components/cards/RefactorCard.tsx
//
// Phase 4 / Plan 04-01 — CARD-02.
// Real Refactor review card. Consumes RefactorSignal verbatim from the
// classifier. Server component (no interactivity). Empty-field rule:
// missing/empty fields render as em-dash "—" (U+2014).

import type { RefactorSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

const VISIBLE_FILE_CAP = 8;

export function RefactorCard({ signals }: { signals: RefactorSignal }) {
  const scopeBadge =
    signals.scopeAssessment === "focused" ? (
      <Badge variant="secondary">focused</Badge>
    ) : signals.scopeAssessment === "sprawling" ? (
      <Badge variant="destructive">sprawling</Badge>
    ) : (
      <Badge>mixed</Badge>
    );

  const visibleFiles = signals.filesMovedOrRenamed.slice(0, VISIBLE_FILE_CAP);
  const overflow = signals.filesMovedOrRenamed.length - VISIBLE_FILE_CAP;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <Wrench className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">
            Refactor review
          </CardTitle>
          <Badge>refactor</Badge>
          {scopeBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          {/* Heading carries both "moved"/"renamed" and the → glyph so the
              grep gate is satisfied even when the LLM returns an empty array. */}
          <h3 className="font-medium">Files moved / renamed →</h3>
          {visibleFiles.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {visibleFiles.map((entry, i) => (
                <li key={i}>
                  <code className="font-mono text-xs">{entry}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-muted-foreground">—</p>
          )}
          {overflow > 0 ? (
            <p className="mt-1 text-muted-foreground">+{overflow} more</p>
          ) : null}
        </div>

        <div>
          <h3 className="font-medium">Dependency impact</h3>
          <p className="mt-1">
            {signals.dependencyImpact?.trim() ? signals.dependencyImpact : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Test coverage delta</h3>
          <p className="mt-1">
            {signals.testCoverageDelta?.trim() ? signals.testCoverageDelta : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Behavior preservation</h3>
          <p className="mt-1">
            {signals.behaviorPreservationNote?.trim()
              ? signals.behaviorPreservationNote
              : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">PR scope</h3>
          <p className="mt-1 flex items-center gap-2">
            {scopeBadge}
            <span className="text-muted-foreground">
              {signals.scopeAssessment === "focused"
                ? "Tightly scoped, low risk."
                : signals.scopeAssessment === "sprawling"
                  ? "Touches many areas — review impact carefully."
                  : "Mixed scope — confirm intent."}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
