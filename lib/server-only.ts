// Import this module at the top of any file that reads server-only env vars
// (GITHUB_TOKEN, ANTHROPIC_API_KEY, etc.). The `server-only` package throws
// a build-time error if the importing module is bundled into a Client
// Component tree — preventing accidental secret leakage to the browser.
import "server-only";

// Intentionally empty — the side effect of importing `server-only` is the guard.
export {};
