// app/page.tsx
//
// Phase 4 / Plan 04-01 — Server Component shell. Mounts the Copilot client
// island (CopilotPRResultPanel), which registers `useCopilotAction` and
// renders the URL input form internally. The page itself stays
// server-rendered so only the form's interactive surface ships JS.
//
// Phase 3 carryover: H1 + subtitle stay server-rendered; the wrapper
// component is now the client island that owns the form + result panel.
//
// Typography (UI-SPEC §"Typography"):
//   text-3xl font-semibold tracking-tight; subtitle uses
//   text-muted-foreground (CSS variable) for dark-mode parity.

import { CopilotPRResultPanel } from "@/components/CopilotPRResultPanel";

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight">
          PR Review Copilot
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          Paste a GitHub PR URL to get a review interface tailored to what&apos;s actually in the diff.
        </p>
        <CopilotPRResultPanel />
      </div>
    </main>
  );
}
