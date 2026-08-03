import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";

const REQUIRED: SignalKey[] = ["value", "effort"];

export const valueEffortFramework: Framework = {
  key: "value_effort",
  name: "Value vs Effort",
  description: "Score = Value / Effort",
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

    const value = signals.value!.valueNumeric as number;
    const effort = signals.effort!.valueNumeric as number;
    const baseScore = effort > 0 ? value / effort : 0;

    return {
      isComplete: true,
      missingSignals: [],
      baseScore,
      inputsUsed,
      math: `${value} value / ${effort} effort = ${baseScore.toFixed(2)}`,
    };
  },
};
