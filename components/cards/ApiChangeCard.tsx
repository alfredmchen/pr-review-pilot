// components/cards/ApiChangeCard.tsx
//
// Phase 4 / Plan 04-01 — CARD-03.
// Real API change review card. Consumes ApiChangeSignal verbatim. Server
// component. Endpoints render before/after side-by-side at md+ breakpoint
// and stack at sm. HTTP method prefix detection is best-effort (CONTEXT
// "Claude's discretion") — we color the leading verb if the string starts
// with one of the known methods.

import type { ApiChangeSignal } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";
import type { ReactNode } from "react";

const HTTP_METHOD_RE = /^(GET|POST|PUT|DELETE|PATCH)\b/;

function methodVariant(
  method: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (method) {
    case "GET":
      return "secondary";
    case "DELETE":
      return "destructive";
    case "PUT":
      return "outline";
    case "POST":
    case "PATCH":
    default:
      return "default";
  }
}

function renderEndpoint(s: string, key: number): ReactNode {
  const match = s.match(HTTP_METHOD_RE);
  if (!match) {
    return (
      <li key={key}>
        <code className="font-mono text-xs">{s}</code>
      </li>
    );
  }
  const method = match[1];
  const rest = s.slice(method.length).trimStart();
  return (
    <li key={key} className="flex items-center gap-2">
      <Badge variant={methodVariant(method)}>{method}</Badge>
      <code className="font-mono text-xs">{rest}</code>
    </li>
  );
}

export function ApiChangeCard({ signals }: { signals: ApiChangeSignal }) {
  const isBreaking = signals.breakingChangeFlags.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <ArrowRightLeft className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">
            API change review
          </CardTitle>
          <Badge>api-change</Badge>
          {isBreaking ? (
            <Badge variant="destructive">Breaking</Badge>
          ) : (
            <Badge variant="secondary">Non-breaking</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <h3 className="font-medium">Endpoint surface — before / after</h3>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                Before
              </h4>
              {signals.endpointsBefore.length > 0 ? (
                <ul className="space-y-1">
                  {signals.endpointsBefore.map((ep, i) =>
                    renderEndpoint(ep, i),
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                After
              </h4>
              {signals.endpointsAfter.length > 0 ? (
                <ul className="space-y-1">
                  {signals.endpointsAfter.map((ep, i) =>
                    renderEndpoint(ep, i),
                  )}
                </ul>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium">Breaking changes</h3>
          {isBreaking ? (
            <ul className="list-disc list-inside text-destructive mt-1">
              {signals.breakingChangeFlags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-muted-foreground">None</p>
          )}
        </div>

        <div>
          <h3 className="font-medium">Versioning assessment</h3>
          <p className="mt-1">
            {signals.versioningAssessment?.trim()
              ? signals.versioningAssessment
              : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">Downstream consumers</h3>
          <p className="mt-1">
            {signals.downstreamConsumersNote?.trim()
              ? signals.downstreamConsumersNote
              : "—"}
          </p>
        </div>

        <div>
          <h3 className="font-medium">HTTP method / status changes</h3>
          {signals.httpMethodOrStatusChanges.length > 0 ? (
            <ul className="list-disc list-inside mt-1">
              {signals.httpMethodOrStatusChanges.map((c, i) => (
                <li key={i}>
                  <code className="font-mono text-xs">{c}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-muted-foreground">—</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
