import { SignalKey } from "../domain/signals";
import { AIProvider, ExtractionRequest, ExtractedSignal, TaskExtractionResult } from "./types";

const PRIORITY_KEYWORDS = ["security", "fraud", "compliance", "outage", "breach", "gdpr"];

/**
 * Deterministic stand-in used when no ANTHROPIC_API_KEY is configured, so the
 * full pipeline (extraction -> review -> scoring -> export) can be exercised
 * without a live model call. Every value it produces is clearly labeled as a
 * mock in its rationale so it's never mistaken for a real inference.
 */
export class MockProvider implements AIProvider {
  id = "mock";
  isMock = true;

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    return request.tasks.map((task) => {
      const text = `${task.title} ${task.description}`.toLowerCase();
      const isPriority = PRIORITY_KEYWORDS.some((kw) => text.includes(kw));
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      // Thin descriptions produce lower confidence — mirrors the real risk the
      // PRD flags (thin descriptions give the model little to infer from).
      const richness = Math.min(1, wordCount / 25);

      const category = isPriority
        ? PRIORITY_KEYWORDS.find((kw) => text.includes(kw)) ?? "general"
        : "general";

      const signals: ExtractedSignal[] = [];
      const seed = hashString(task.id);

      const candidates: Record<SignalKey, () => { valueNumeric: number | null; valueText: string | null }> = {
        reach: () => ({ valueNumeric: Math.round(50 + (seed % 950)), valueText: null }),
        value: () => ({ valueNumeric: isPriority ? 9 : 1 + (seed % 8), valueText: null }),
        impact: () => ({
          valueNumeric: [0.25, 0.5, 1, 2, 3][seed % 5],
          valueText: null,
        }),
        effort: () => ({ valueNumeric: 1 + (seed % 8), valueText: null }),
        confidence: () => ({ valueNumeric: Math.round(40 + richness * 55), valueText: null }),
        urgency: () => ({ valueNumeric: isPriority ? 9 : 1 + (seed % 6), valueText: null }),
        risk: () => ({ valueNumeric: isPriority ? 9 : 1 + (seed % 5), valueText: null }),
        category: () => ({ valueNumeric: null, valueText: category }),
      };

      for (const signal of request.requiredSignals) {
        if (task.alreadyProvided.includes(signal)) continue;
        // Simulate the "genuine gap" case: very thin text sometimes yields nothing.
        if (wordCount < 4 && seed % 4 === 0 && signal !== "category") continue;

        const { valueNumeric, valueText } = candidates[signal]();
        signals.push({
          signal,
          valueNumeric,
          valueText,
          confidence: Math.round(40 + richness * 55),
          rationale: `[mock provider] heuristic placeholder value, no live model call was made.`,
        });
      }

      return { taskId: task.id, category, signals };
    });
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
