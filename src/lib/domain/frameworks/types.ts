import { SignalKey, SignalMap, SignalValue } from "../signals";

export interface FrameworkInputUsed {
  signal: SignalKey;
  label: string;
  value: number | string;
  source: SignalValue["source"];
  confidence: number | null;
}

export interface FrameworkResult {
  /** True when every required signal resolved to a real (non-gap) value. */
  isComplete: boolean;
  /** Required signals that are still gaps — blocks scoring until resolved. */
  missingSignals: SignalKey[];
  /** Base framework score. NaN when isComplete is false. */
  baseScore: number;
  /** The resolved inputs the framework actually read, for explainability. */
  inputsUsed: FrameworkInputUsed[];
  /** Human-readable formula with the real numbers substituted in. */
  math: string;
}

export interface Framework {
  key: string;
  name: string;
  description: string;
  /** Static default. Frameworks whose inputs depend on stored config (Weighted
   * Scoring) override this via getRequiredSignals instead. */
  requiredSignals: SignalKey[];
  /** Only present when required signals depend on this framework's stored
   * parameters rather than being fixed. Callers should prefer this over
   * `requiredSignals` when present — see resolveRequiredSignals(). */
  getRequiredSignals?: (parameters: unknown) => SignalKey[];
  compute(signals: SignalMap, parameters?: unknown): FrameworkResult;
}

export function resolveRequiredSignals(framework: Framework, parameters: unknown): SignalKey[] {
  return framework.getRequiredSignals ? framework.getRequiredSignals(parameters) : framework.requiredSignals;
}
