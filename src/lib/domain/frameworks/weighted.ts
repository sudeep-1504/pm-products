import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";

export interface WeightedCriterion {
  signal: SignalKey;
  weight: number; // signed — a negative weight penalizes (e.g. effort)
}

export interface WeightedScoringParameters {
  criteria: WeightedCriterion[];
}

export const DEFAULT_WEIGHTED_PARAMETERS: WeightedScoringParameters = {
  criteria: [
    { signal: "value", weight: 1 },
    { signal: "impact", weight: 1 },
    { signal: "confidence", weight: 0.5 },
    { signal: "effort", weight: -1 },
  ],
};

// Criteria are restricted to the fixed signal vocabulary (no arbitrary raw CSV
// column as a criterion input yet — a documented v1 scope cut, see README).
//
// Normalization here uses fixed assumed ranges per signal rather than
// batch-relative min/max, because `compute()` is a pure per-task function with
// no visibility into the rest of the run's tasks (same constraint as every
// other framework here). reach and effort are unbounded in principle, so they
// get a log-scale normalization against a generous assumed ceiling instead of
// a hard linear range.
const LINEAR_RANGES: Partial<Record<SignalKey, [number, number]>> = {
  value: [1, 10],
  impact: [0.25, 3],
  confidence: [0, 100],
  urgency: [1, 10],
  risk: [1, 10],
};
const LOG_CEILINGS: Partial<Record<SignalKey, number>> = {
  reach: 10000,
  effort: 40,
};

function normalize(signal: SignalKey, value: number): number {
  const linear = LINEAR_RANGES[signal];
  if (linear) {
    const [min, max] = linear;
    return max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0.5;
  }
  const ceiling = LOG_CEILINGS[signal];
  if (ceiling) {
    return Math.max(0, Math.min(1, Math.log10(value + 1) / Math.log10(ceiling + 1)));
  }
  return 0;
}

export function makeWeightedFramework(): Framework {
  return {
    key: "weighted",
    name: "Weighted Scoring",
    description: "Score = sum(weight x normalised criterion value), criteria and weights configured per run.",
    requiredSignals: DEFAULT_WEIGHTED_PARAMETERS.criteria.map((c) => c.signal),

    getRequiredSignals(parameters: unknown): SignalKey[] {
      const params = (parameters as WeightedScoringParameters) ?? DEFAULT_WEIGHTED_PARAMETERS;
      return Array.from(new Set(params.criteria.map((c) => c.signal)));
    },

    compute(signals: SignalMap, parameters?: unknown): FrameworkResult {
      const params = (parameters as WeightedScoringParameters) ?? DEFAULT_WEIGHTED_PARAMETERS;
      const required = Array.from(new Set(params.criteria.map((c) => c.signal)));

      const missingSignals = required.filter((key) => {
        const s = signals[key];
        return !s || s.source === "gap" || s.valueNumeric === null;
      });

      const inputsUsed: FrameworkInputUsed[] = required
        .filter((key) => signals[key] && signals[key]!.valueNumeric !== null)
        .map((key) => {
          const s = signals[key]!;
          return { signal: key, label: SIGNAL_LABELS[key], value: s.valueNumeric as number, source: s.source, confidence: s.confidence };
        });

      if (missingSignals.length > 0) {
        return {
          isComplete: false,
          missingSignals,
          baseScore: NaN,
          inputsUsed,
          math: "Incomplete: waiting on " + missingSignals.join(", "),
        };
      }

      let baseScore = 0;
      const terms: string[] = [];
      for (const criterion of params.criteria) {
        const raw = signals[criterion.signal]!.valueNumeric as number;
        const normalized = normalize(criterion.signal, raw);
        baseScore += criterion.weight * normalized;
        terms.push(`${criterion.weight} x norm(${criterion.signal}=${raw})=${normalized.toFixed(2)}`);
      }

      return {
        isComplete: true,
        missingSignals: [],
        baseScore,
        inputsUsed,
        math: terms.join(" + ") + ` = ${baseScore.toFixed(3)}`,
      };
    },
  };
}
