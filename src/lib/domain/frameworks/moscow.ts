import { SIGNAL_LABELS, SignalKey, SignalMap } from "../signals";
import { Framework, FrameworkInputUsed, FrameworkResult } from "./types";

const REQUIRED: SignalKey[] = ["value", "urgency", "risk", "effort"];

type Band = "Must" | "Should" | "Could" | "Won't";
const BAND_RANK: Record<Band, number> = { Must: 3, Should: 2, Could: 1, "Won't": 0 };

// The fixed signal vocabulary has no dedicated MoSCoW-band field — frameworks
// project the existing signal layer, they don't add new signals for themselves.
// So the band is derived from value+urgency+risk (range 3-30) against fixed
// absolute cut points, not batch-relative percentiles: compute() is a pure
// per-task function with no visibility into the rest of the batch, same as
// every other framework here, so the thresholds can't adapt to a given run's
// distribution. This is a deliberate, documented simplification of "produces
// bands" — swap in batch-relative cuts if adaptive banding is needed later.
function bandFor(priorityPressure: number): Band {
  if (priorityPressure >= 24) return "Must";
  if (priorityPressure >= 18) return "Should";
  if (priorityPressure >= 12) return "Could";
  return "Won't";
}

export const moscowFramework: Framework = {
  key: "moscow",
  name: "MoSCoW",
  description:
    "Bands (Must/Should/Could/Won't) from Value+Urgency+Risk against fixed thresholds; ordered within band by Value/Effort.",
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
    const urgency = signals.urgency!.valueNumeric as number;
    const risk = signals.risk!.valueNumeric as number;
    const effort = signals.effort!.valueNumeric as number;

    const pressure = value + urgency + risk;
    const band = bandFor(pressure);
    const secondary = effort > 0 ? value / effort : 0;
    const baseScore = BAND_RANK[band] * 1000 + secondary;

    return {
      isComplete: true,
      missingSignals: [],
      baseScore,
      inputsUsed,
      math: `Band: ${band} (value ${value} + urgency ${urgency} + risk ${risk} = ${pressure}). Within band, ordered by value/effort = ${secondary.toFixed(2)}`,
    };
  },
};
