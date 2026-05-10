"use client";

// components/PRUrlForm.tsx
//
// Phase 3 / Plan 03-02 — the URL submission form. Owns:
//   - the input field + submit button (UI-SPEC §"Layout")
//   - client-side regex pre-validation (FETCH-01 UX surface; PR_URL_REGEX
//     is the single source — server uses the same constant from lib/types.ts)
//   - the panel state machine (idle → loading → result | error)
//   - the FETCH-03 100ms loading skeleton: setPanel({kind:'loading'}) is
//     the FIRST statement inside startTransition's callback and runs
//     synchronously before the fetch promise begins, so React commits the
//     loading render in single-digit ms (well under the 100ms ceiling).
//
// Why NOT a Server Action: client-side useTransition + fetch lets us own the
// loading-state moment precisely. Server Actions force a round-trip before
// any UI flips. Same end result; the timing budget is tighter on the client.

import { useState, useTransition, useId } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PR_URL_REGEX, type AnalyzeResponse } from "@/lib/types";
import { PRResultPanel, type PanelState } from "@/components/PRResultPanel";

export function PRUrlForm() {
  const [url, setUrl] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setInlineError("Paste a PR URL first.");
      return;
    }
    if (!PR_URL_REGEX.test(trimmed)) {
      setInlineError(
        "Enter a valid GitHub PR URL like https://github.com/owner/repo/pull/123",
      );
      return;
    }
    setInlineError(null);

    // FETCH-03: skeleton MUST be visible within 100ms. setPanel({kind:'loading'})
    // is synchronous; React commits the loading render before the fetch resolves.
    startTransition(async () => {
      setPanel({ kind: "loading" });
      try {
        const res = await fetch("/api/analyze-pr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmed }),
        });
        const json: AnalyzeResponse | { error: string } = await res.json();
        if ("error" in json) {
          setPanel({ kind: "error", message: json.error });
          return;
        }
        setPanel({ kind: "result", response: json });
      } catch (err) {
        setPanel({
          kind: "error",
          message: err instanceof Error ? err.message : "Network error.",
        });
      }
    });
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={inputId} className="sr-only">
          GitHub pull request URL
        </label>
        <Input
          id={inputId}
          type="url"
          placeholder="https://github.com/owner/repo/pull/123"
          aria-label="GitHub pull request URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={isPending}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} aria-busy={isPending}>
          {isPending ? "Analyzing…" : "Analyze PR"}
        </Button>
      </form>
      {inlineError ? (
        <p className="text-sm font-semibold text-destructive">{inlineError}</p>
      ) : null}
      <PRResultPanel state={panel} />
    </div>
  );
}
