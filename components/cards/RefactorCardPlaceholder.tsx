// components/cards/RefactorCardPlaceholder.tsx
//
// Phase 3 / Plan 03-02 — placeholder for prType='refactor'. Phase 4 will
// populate this card from the RefactorSignal payload (CARD-02).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

export function RefactorCardPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">Refactor review</CardTitle>
          <Badge>refactor</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-base">
        Detected a refactor. Review-card content will populate in Phase 4.
      </CardContent>
    </Card>
  );
}
