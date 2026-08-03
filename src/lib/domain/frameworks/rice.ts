import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";

const REQUIRED: SignalKey[] = ["reach", "impact", "confidence", "effort"];

export const riceFramework: Framework = {
  key: "rice",
  name: "RICE",
  description: "Score = (Reach x Impact x Confidence) / Effort",
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
      return {
        signal: key,
        label: SIGNAL_LABELS[key],
        value: s.valueNumeric as number,
        source: s.source,
        confidence: s.confidence,
      };
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

    const reach = signals.reach!.valueNumeric as number;
    const impact = signals.impact!.valueNumeric as number;
    const confidencePct = signals.confidence!.valueNumeric as number;
    const effort = signals.effort!.valueNumeric as number;
    const confidenceFraction = confidencePct / 100;

    const baseScore = effort > 0 ? (reach * impact * confidenceFraction) / effort : 0;

    return {
      isComplete: true,
      missingSignals: [],
      baseScore,
      inputsUsed,
      math: `(${reach} reach x ${impact} impact x ${confidencePct}% confidence) / ${effort} effort = ${baseScore.toFixed(2)}`,
    };
  },
};
