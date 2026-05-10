"use client";

// components/CopilotPRResultPanel.tsx
//
// Phase 4 / Plan 04-01 — client wrapper that registers `useCopilotAction`
// for generative-UI parity. The Phase 3 direct-render path (PRUrlForm →
// PRResultPanel → Card) is unchanged; this component additionally exposes
// a `renderPRReviewCard` action so CopilotKit's generative UI layer can
// emit any of the four cards by name. `available: 'enabled'` means the
// hook is live but does NOT replace the direct render.
//
// Spike resolution: STATE.md flagged that `useCopilotAction` might be
// deprecated in 1.56-1.57.x in favor of `useFrontendTool`/AG-UI. Verified
// against node_modules/@copilotkit/react-core/dist/copilotkit-BN4I_y1n.d.mts:
// - `useCopilotAction` is exported (re-exported from index.d.mts:341).
// - The d.ts comment marks it "legacy hook maintained for backwards
//   compatibility" but it still works.
// - `FrontendAction` includes `render?: (props: ActionRenderProps<T>) =>
//   string | React.ReactElement` — exactly the v1.56-1.57 API documented
//   in CONTEXT. No fallback to `useFrontendTool` needed.
//
// Why this file exists: useCopilotAction must be called inside a
// descendant of <CopilotKit> (set up in app/providers.tsx). app/page.tsx
// is a Server Component, so we need a client island. Wrapping PRUrlForm
// here keeps the client surface minimal.

import { useCopilotAction } from "@copilotkit/react-core";
import { PRUrlForm } from "@/components/PRUrlForm";
import { SecurityCard } from "@/components/cards/SecurityCard";
import { RefactorCard } from "@/components/cards/RefactorCard";
import { ApiChangeCard } from "@/components/cards/ApiChangeCard";
import { BugFixCard } from "@/components/cards/BugFixCard";
import { UnclassifiedCard } from "@/components/cards/UnclassifiedCard";
import type {
  SecuritySignal,
  RefactorSignal,
  ApiChangeSignal,
  BugFixSignal,
} from "@/lib/types";

export function CopilotPRResultPanel() {
  // Register a generative-UI action so CopilotKit can render any of the
  // four cards by name + signals payload. The action is enabled but
  // never invoked by the current UI path; PRUrlForm + PRResultPanel
  // render directly. This is parity registration per Phase 4 CONTEXT
  // decision — wired so a future agent flow could trigger card render
  // without rewriting the wrapper.
  useCopilotAction({
    name: "renderPRReviewCard",
    description:
      "Render the type-specific PR review card for a classified pull request. Use this after classifying a PR to show risk flags, OWASP checklist, before/after API surface, root cause, etc., depending on prType.",
    available: "enabled",
    parameters: [
      {
        name: "prType",
        type: "string",
        enum: ["security", "refactor", "api-change", "bug-fix"],
        description: "The classified PR type.",
        required: true,
      },
      {
        name: "signals",
        type: "object",
        description:
          "The signal payload matching the prType (SecuritySignal, RefactorSignal, ApiChangeSignal, or BugFixSignal). signals.type MUST equal prType.",
        required: true,
      },
    ],
    render: ({ args }) => {
      // CopilotKit args are LLM-driven and loosely typed — runtime guards
      // below; cards themselves render em-dash placeholders for missing
      // fields so a malformed payload renders gracefully.
      const a = args as
        | { prType?: string; signals?: unknown }
        | undefined;
      const prType = a?.prType;
      const signals = a?.signals;
      if (!prType || signals == null) return <UnclassifiedCard />;
      switch (prType) {
        case "security":
          return <SecurityCard signals={signals as SecuritySignal} />;
        case "refactor":
          return <RefactorCard signals={signals as RefactorSignal} />;
        case "api-change":
          return <ApiChangeCard signals={signals as ApiChangeSignal} />;
        case "bug-fix":
          return <BugFixCard signals={signals as BugFixSignal} />;
        default:
          return <UnclassifiedCard />;
      }
    },
  });

  return <PRUrlForm />;
}
