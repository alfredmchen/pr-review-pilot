// components/cards/SecurityCardPlaceholder.tsx
//
// Phase 3 / Plan 03-02 — placeholder for prType='security'. Phase 4 will
// populate this card from the SecuritySignal payload (CARD-01 — risk flags,
// OWASP checklist, severity, etc.). The "Phase 4" mention in body copy is
// intentional per UI-SPEC voice rules so reviewers can tell this is a
// placeholder, not a bug.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export function SecurityCardPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <CardTitle className="text-xl font-semibold">Security review</CardTitle>
          <Badge>security</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-base">
        Detected a security-sensitive change. Review-card content will populate in Phase 4.
      </CardContent>
    </Card>
  );
}
