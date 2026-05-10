// components/cards/UnclassifiedCard.tsx
//
// Phase 3 / Plan 03-02 — default branch / fallback. REQUIREMENTS.md §Notes
// flagged the risk of an unexpected prType rendering nothing; this card
// closes that gap and is referenced by both:
//   1. the PRResultPanel CARD_MAP `?? UnclassifiedCard` defensive fallback
//   2. the exhaustive switch's default arm (alongside _exhaustive: never)

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function UnclassifiedCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-semibold">Unable to classify this PR</CardTitle>
          <Badge variant="secondary">unclassified</Badge>
        </div>
      </CardHeader>
      <CardContent className="text-base">
        The classifier returned an unexpected result. Please review this PR manually.
      </CardContent>
    </Card>
  );
}
