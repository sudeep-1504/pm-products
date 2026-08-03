import { AIProvider } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { MockProvider } from "./mock-provider";

export * from "./types";

// Provider API keys are secrets, never product configuration: they live only in
// server-side env vars and are never entered, stored, or displayed in the UI.
// The UI (Settings) only ever picks which model to use.
export function getAIProvider(): AIProvider {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new MockProvider();
  return new ClaudeProvider(apiKey);
}
