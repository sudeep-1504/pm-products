import { SignalKey, SignalMap } from "../signals";
import { FrameworkInputUsed } from "./types";
import { SIGNAL_LABELS } from "../signals";

export const COST_OF_DELAY_SIGNALS: SignalKey[] = ["value", "urgency", "risk"];

// Shared by WSJF and CD3 — the PRD defines Cost of Delay identically for both
// ("value + urgency + risk") and only the label on the denominator differs
// (Job Size vs Duration), so this is intentionally shared, not duplicated.
export function costOfDelayInputs(signals: SignalMap): FrameworkInputUsed[] {
  return COST_OF_DELAY_SIGNALS.filter((key) => signals[key] && signals[key]!.valueNumeric !== null).map((key) => {
    const s = signals[key]!;
    return { signal: key, label: SIGNAL_LABELS[key], value: s.valueNumeric as number, source: s.source, confidence: s.confidence };
  });
}

export function costOfDelayValue(signals: SignalMap): number {
  return (
    (signals.value!.valueNumeric as number) +
    (signals.urgency!.valueNumeric as number) +
    (signals.risk!.valueNumeric as number)
  );
}
