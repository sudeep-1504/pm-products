import { AIProvider, ProviderId } from "./types";
import { ClaudeProvider } from "./claude-provider";
import { OpenAIProvider } from "./openai-provider";
import { GoogleProvider } from "./google-provider";
import { OllamaProvider } from "./ollama-provider";
import { MockProvider } from "./mock-provider";

export * from "./types";

// Provider API keys are secrets, never product configuration: they live only in
// server-side env vars and are never entered, stored, or displayed in the UI.
// The UI (Settings) only ever picks which provider + model to use. Ollama has
// no key (it's self-hosted) but still reads its host from a server env var
// rather than the UI, for the same reason DATABASE_URL isn't a UI setting:
// it's server-side wiring, not a per-run product choice.
export function getAIProvider(providerId: string): AIProvider {
  switch (providerId as ProviderId) {
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      return apiKey ? new ClaudeProvider(apiKey) : new MockProvider();
    }
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;
      return apiKey ? new OpenAIProvider(apiKey) : new MockProvider();
    }
    case "google": {
      const apiKey = process.env.GOOGLE_API_KEY;
      return apiKey ? new GoogleProvider(apiKey) : new MockProvider();
    }
    case "ollama": {
      const host = process.env.OLLAMA_BASE_URL;
      return host ? new OllamaProvider(host) : new MockProvider();
    }
    default:
      return new MockProvider();
  }
}
