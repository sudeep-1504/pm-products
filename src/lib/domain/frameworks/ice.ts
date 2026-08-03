import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";

const REQUIRED: SignalKey[] = ["impact", "confidence", "effort"];

// Ease isn't a stored signal — it's derived from effort, since the fixed signal
// vocabulary intentionally has no separate "ease" field (frameworks project the
// same signal layer, they don't add fields to it). Effort can run well past 10
// (person-weeks or high Fibonacci points), so ease is a clamped inverse: capped
// at effort=10 before inverting, which keeps it a monotonic 1-10 scale rather
// than going negative for large efforts.
function easeFromEffort(effort: number): number {
  return Math.max(1, Math.min(10, 11 - Math.min(effort, 10)));
}

export const iceFramework: Framework = {
  key: "ice",
  name: "ICE",
  description: "Score = Impact x Confidence x Ease (ease = inverse of effort, 1-10)",
  requiredSignals: REQUIRED,

  compute(signals: SignalMap): FrameworkResult {
    const missingSignals = REQUIRED.filter((key) => {
      const s = signals[key];
      return !s || s.source === "gap" || s.valueNumeric === null;
    });

    const inputsUsed: FrameworkInputUsed[] = REQUIRED.filter(
      (key) => signals[key] && signals[key]!.valueNumeric !== null
    ).map((key) => {
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

    const impact = signals.impact!.valueNumeric as number;
    const confidencePct = signals.confidence!.valueNumeric as number;
    const effort = signals.effort!.valueNumeric as number;
    const ease = easeFromEffort(effort);
    const confidenceFraction = confidencePct / 100;

    const baseScore = impact * confidenceFraction * ease;

    return {
      isComplete: true,
      missingSignals: [],
      baseScore,
      inputsUsed,
      math: `${impact} impact x ${confidencePct}% confidence x ${ease.toFixed(1)} ease (from ${effort} effort) = ${baseScore.toFixed(2)}`,
    };
  },
};
