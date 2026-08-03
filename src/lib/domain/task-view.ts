import { SignalKey, SignalMap, SignalSource, SignalValue, isGap, isLowConfidence } from "./signals";

export interface TaskSignalRow {
  signal: string;
  valueNumeric: number | null;
  valueText: string | null;
  source: string;
  confidence: number | null;
  rationale: string;
}

export function buildSignalMap(rows: TaskSignalRow[]): SignalMap {
  const map: SignalMap = {};
  for (const row of rows) {
    map[row.signal as SignalKey] = {
      signal: row.signal as SignalKey,
      valueNumeric: row.valueNumeric,
      valueText: row.valueText,
      source: row.source as SignalSource,
      confidence: row.confidence,
      rationale: row.rationale,
    };
  }
  return map;
}

export interface TaskCompleteness {
  gaps: SignalKey[];
  lowConfidence: SignalKey[];
  isComplete: boolean;
}

export function computeCompleteness(
  signalMap: SignalMap,
  requiredSignals: SignalKey[],
  confidenceThreshold: number
): TaskCompleteness {
  const gaps: SignalKey[] = [];
  const lowConfidence: SignalKey[] = [];

  for (const key of requiredSignals) {
    const value: SignalValue | undefined = signalMap[key];
    if (isGap(value)) {
      gaps.push(key);
    } else if (isLowConfidence(value, confidenceThreshold)) {
      lowConfidence.push(key);
    }
  }

  return { gaps, lowConfidence, isComplete: gaps.length === 0 };
}
