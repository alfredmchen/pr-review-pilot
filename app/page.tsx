// app/page.tsx
//
// Phase 3 / Plan 03-02 — Server Component shell.
// H1 + subtitle stay server-rendered; PRUrlForm is the client island that
// holds form state and dispatches the result panel.
//
// Typography upgrade per UI-SPEC §"Typography":
//   text-2xl font-bold (Phase 1) → text-3xl font-semibold tracking-tight
// Bold (700) is replaced by semibold (600) so the page uses exactly the
// 2 weights declared in the contract. Subtitle uses text-muted-foreground
// (CSS variable) instead of literal text-gray-600 for dark-mode parity.

import { PRUrlForm } from "@/components/PRUrlForm";

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
        <PRUrlForm />
      </div>
    </main>
  );
}
