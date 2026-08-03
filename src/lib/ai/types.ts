import { SignalKey } from "../domain/signals";

export const CLAUDE_MODELS = [
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (balanced, recommended)" },
  { id: "claude-opus-5", label: "Claude Opus 5 (highest quality, slower/costlier)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (fastest, cheapest)" },
] as const;

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
