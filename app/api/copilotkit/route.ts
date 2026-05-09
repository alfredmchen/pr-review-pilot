import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { NextRequest } from "next/server";

const builtInAgent = new BuiltInAgent({
  model: "anthropic:claude-sonnet-4-5",
});

const runtime = new CopilotRuntime({
  agents: { default: builtInAgent },
});

const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
  runtime,
  endpoint: "/api/copilotkit",
});

export const POST = (req: NextRequest) => handleRequest(req);
