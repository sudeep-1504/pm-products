// The signal layer: a fixed vocabulary that sits between the raw task and every
// prioritisation framework. Frameworks are pure functions that read a subset of
// this vocabulary — swap the framework and the tasks (and their signals) don't
// change, only the projection does.

export const SIGNAL_KEYS = [
  "reach",
  "value",
  "impact",
  "effort",
  "confidence",
  "urgency",
  "risk",
  "category",
] as const;

export type SignalKey = (typeof SIGNAL_KEYS)[number];

export const SIGNAL_LABELS: Record<SignalKey, string> = {
  reach: "Reach",
  value: "Value",
  impact: "Impact",
  effort: "Effort",
  confidence: "Confidence",
  urgency: "Urgency",
  risk: "Risk",
  category: "Category",
};

// Numeric signals carry valueNumeric; category is the one free-label signal and
// carries valueText instead.
export const NUMERIC_SIGNALS: SignalKey[] = [
  "reach",
  "value",
  "impact",
  "effort",
  "confidence",
  "urgency",
  "risk",
];

export const SOURCES = ["csv", "ai", "human", "gap"] as const;
export type SignalSource = (typeof SOURCES)[number];

// Human edit > CSV column > AI inference. "gap" is not really a source, it's the
// absence of one, but it's modeled as a source state so every signal always has
// exactly one row.
export const SOURCE_PRECEDENCE: Record<SignalSource, number> = {
  human: 3,
  csv: 2,
  ai: 1,
  gap: 0,
};

export interface SignalValue {
  signal: SignalKey;
  valueNumeric: number | null;
  valueText: string | null;
  source: SignalSource;
  confidence: number | null; // 0-100, meaningful only when source === "ai"
  rationale: string;
}

export type SignalMap = Partial<Record<SignalKey, SignalValue>>;

export function isGap(signal: SignalValue | undefined): boolean {
  return !signal || signal.source === "gap";
}

// A value is "low confidence" (flagged, but non-blocking) when the model placed
// it but its confidence sits below the configured threshold. CSV and human
// values are never low-confidence — they're not inferred.
export function isLowConfidence(
  signal: SignalValue | undefined,
  confidenceThreshold: number
): boolean {
  if (!signal || signal.source !== "ai") return false;
  return (signal.confidence ?? 0) < confidenceThreshold;
}

// Merge two candidate values for the same signal, keeping the higher-precedence
// source. Used when CSV-provided values and AI-inferred values both exist.
export function resolveSignal(
  a: SignalValue | undefined,
  b: SignalValue | undefined
): SignalValue | undefined {
  if (!a) return b;
  if (!b) return a;
  return SOURCE_PRECEDENCE[a.source] >= SOURCE_PRECEDENCE[b.source] ? a : b;
}

export const EFFORT_UNITS = ["person_weeks", "fibonacci"] as const;
export type EffortUnit = (typeof EFFORT_UNITS)[number];

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
