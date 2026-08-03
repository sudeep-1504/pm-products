import { SignalKey } from "../domain/signals";

export const PROVIDER_IDS = ["anthropic", "openai", "google", "ollama"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

export const CLAUDE_MODELS = [
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced, recommended)" },
  { id: "claude-opus-5", label: "Claude Opus 5 (highest quality, slower/costlier)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest, cheapest)" },
] as const;

export interface ProviderCatalogEntry {
  id: ProviderId;
  label: string;
  /** Server-side env var holding the secret. Null for providers that don't need one (Ollama). */
  apiKeyEnvVar: string | null;
  /** Fixed, known-good model list shown as a dropdown. Omitted for providers whose
   * model catalog moves too fast (or is inherently local/unbounded, like Ollama) —
   * those get a free-text model field in the UI instead, so this app never ships a
   * hardcoded model ID that's gone stale or was guessed. */
  models?: readonly { id: string; label: string }[];
  modelPlaceholder?: string;
}

export const PROVIDER_CATALOG: Record<ProviderId, ProviderCatalogEntry> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    apiKeyEnvVar: "ANTHROPIC_API_KEY",
    models: CLAUDE_MODELS,
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT)",
    apiKeyEnvVar: "OPENAI_API_KEY",
    modelPlaceholder: "e.g. gpt-5.1, gpt-5.1-mini, o4-mini",
  },
  google: {
    id: "google",
    label: "Google (Gemini)",
    apiKeyEnvVar: "GOOGLE_API_KEY",
    modelPlaceholder: "e.g. gemini-2.5-pro, gemini-2.5-flash",
  },
  ollama: {
    id: "ollama",
    label: "Ollama (self-hosted)",
    apiKeyEnvVar: null,
    modelPlaceholder: "e.g. llama3.3, qwen2.5, mistral-nemo",
  },
};

export interface ProductContextForExtraction {
  productDescription: string;
  goals: string[];
  okrs: { objective: string; keyResults: string[] }[];
  northStarMetric: string;
  supportingMetrics: string[];
  priorityAreas: string[];
  targetSegments: string[];
  constraints: string;
  freeText: string;
}

export interface ExtractionTaskInput {
  id: string;
  title: string;
  description: string;
  /** Signals already resolved from a CSV column — the model should not re-infer these. */
  alreadyProvided: SignalKey[];
}

export interface ExtractedSignal {
  signal: SignalKey;
  valueNumeric: number | null;
  valueText: string | null;
  confidence: number; // 0-100
  rationale: string;
}

export interface TaskExtractionResult {
  taskId: string;
  category: string;
  signals: ExtractedSignal[];
}

export interface ExtractionRequest {
  model: string;
  tasks: ExtractionTaskInput[];
  requiredSignals: SignalKey[];
  productContext: ProductContextForExtraction;
}

export interface AIProvider {
  id: string;
  /** True when this provider is a stand-in used because no real API key is configured. */
  isMock: boolean;
  extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]>;
}
