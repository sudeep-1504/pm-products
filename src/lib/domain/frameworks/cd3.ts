import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";
import { COST_OF_DELAY_SIGNALS, costOfDelayInputs, costOfDelayValue } from "./cost-of-delay";

const REQUIRED: SignalKey[] = [...COST_OF_DELAY_SIGNALS, "effort"];

export const cd3Framework: Framework = {
  key: "cd3",
  name: "CD3 (Cost of Delay Divided by Duration)",
  description: "Score = Cost of Delay (Value + Urgency + Risk) / Duration (Effort, in weeks)",
  requiredSignals: REQUIRED,

  compute(signals: SignalMap): FrameworkResult {
    const missingSignals = REQUIRED.filter((key) => {
      const s = signals[key];
      return !s || s.source === "gap" || s.valueNumeric === null;
    });

    const inputsUsed: FrameworkInputUsed[] = costOfDelayInputs(signals);
    if (signals.effort && signals.effort.valueNumeric !== null) {
      inputsUsed.push({
        signal: "effort",
        label: SIGNAL_LABELS.effort,
        value: signals.effort.valueNumeric as number,
        source: signals.effort.source,
        confidence: signals.effort.confidence,
      });
    }

    if (missingSignals.length > 0) {
      return {
        isComplete: false,
        missingSignals,
        baseScore: NaN,
        inputsUsed,
        math: "Incomplete: waiting on " + missingSignals.join(", "),
      };
    }

    const cod = costOfDelayValue(signals);
    const duration = signals.effort!.valueNumeric as number;
    const baseScore = duration > 0 ? cod / duration : 0;

    return {
      isComplete: true,
      missingSignals: [],
      baseScore,
      inputsUsed,
      math: `(${signals.value!.valueNumeric} value + ${signals.urgency!.valueNumeric} urgency + ${signals.risk!.valueNumeric} risk) / ${duration} weeks duration = ${baseScore.toFixed(2)}`,
    };
  },
};
