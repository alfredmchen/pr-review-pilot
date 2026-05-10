// components/cards/ApiChangeCardPlaceholder.tsx
//
// Phase 3 / Plan 03-02 — placeholder for prType='api-change'. Phase 4 will
// populate this card from the ApiChangeSignal payload (CARD-03).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft } from "lucide-react";

export function ApiChangeCardPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">API change review</CardTitle>
          <Badge>api-change</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-base">
        Detected an API surface change. Review-card content will populate in Phase 4.
      </CardContent>
    </Card>
  );
}
