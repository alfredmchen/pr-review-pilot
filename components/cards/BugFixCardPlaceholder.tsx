// components/cards/BugFixCardPlaceholder.tsx
//
// Phase 3 / Plan 03-02 — placeholder for prType='bug-fix'. Phase 4 will
// populate this card from the BugFixSignal payload (CARD-04).

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";

export function BugFixCardPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">Bug fix review</CardTitle>
          <Badge>bug-fix</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-base">
        Detected a bug fix. Review-card content will populate in Phase 4.
      </CardContent>
    </Card>
  );
}
