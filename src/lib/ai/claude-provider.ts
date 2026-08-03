import Anthropic from "@anthropic-ai/sdk";
import { SIGNAL_KEYS, SignalKey } from "../domain/signals";
import {
  AIProvider,
  ExtractionRequest,
  ExtractedSignal,
  TaskExtractionResult,
} from "./types";

const TOOL_NAME = "submit_extraction";

function buildToolSchema(signalsToInfer: SignalKey[]) {
  return {
    name: TOOL_NAME,
    description:
      "Submit the extracted signal values and category for every task in this batch.",
    input_schema: {
      type: "object" as const,
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              taskId: { type: "string" },
              category: {
                type: "string",
                description:
                  "Short product-area/type label for this task (e.g. security, fraud, compliance, growth, retention, tech-debt).",
              },
              signals: {
                type: "array",
                description:
                  "One entry per signal you can genuinely infer from the task text and product context. Omit a signal entirely if there isn't enough information to infer it in good faith — do not guess.",
                items: {
                  type: "object",
                  properties: {
                    signal: { type: "string", enum: signalsToInfer },
                    valueNumeric: {
                      type: ["number", "null"],
                      description:
                        "Numeric value on the signal's scale (see instructions). Null only for the category signal.",
                    },
                    valueText: { type: ["string", "null"] },
                    confidence: {
                      type: "number",
                      description: "0-100, how certain you are in this specific value.",
                    },
                    rationale: {
                      type: "string",
                      description:
                        "One sentence: why this value, naming the goal/OKR/priority area it maps to when relevant.",
                    },
                  },
                  required: ["signal", "valueNumeric", "valueText", "confidence", "rationale"],
                },
              },
            },
            required: ["taskId", "category", "signals"],
          },
        },
      },
      required: ["results"],
    },
  };
}

const SIGNAL_SCALES: Record<SignalKey, string> = {
  reach: "integer estimate of users/events affected per period",
  value: "1 to 10, business or user value",
  impact: "one of 0.25, 0.5, 1, 2, 3 — per-user impact weight (massive=3, high=2, medium=1, low=0.5, minimal=0.25)",
  effort: "estimated person-weeks of delivery cost (positive number)",
  confidence: "0 to 100, percent certainty in your own estimates for this task",
  urgency: "1 to 10, time criticality",
  risk: "1 to 10, risk reduction or opportunity enablement",
  category: "free-text label, not scored 1-10 (handled by the separate category field)",
};

function buildSystemPrompt(productContext: ExtractionRequest["productContext"]) {
  return `You are a product prioritisation assistant. You ground every scoring judgement in this product's real context, not generic guesses.

PRODUCT CONTEXT
Description: ${productContext.productDescription}
Goals: ${productContext.goals.join("; ") || "(none set)"}
OKRs: ${
    productContext.okrs
      .map((o) => `${o.objective} (KRs: ${o.keyResults.join(", ")})`)
      .join(" | ") || "(none set)"
  }
North star metric: ${productContext.northStarMetric || "(none set)"}
Supporting metrics: ${productContext.supportingMetrics.join(", ") || "(none set)"}
Priority areas: ${productContext.priorityAreas.join(", ") || "(none set)"}
Target segments: ${productContext.targetSegments.join(", ") || "(none set)"}
Constraints: ${productContext.constraints || "(none)"}
Additional context: ${productContext.freeText || "(none)"}

A task that advances an active OKR or the north star metric should infer a higher value signal. A task unrelated to any current goal should infer lower. Use the priority areas to classify category accurately — this feeds a rules engine downstream that treats categories like security/fraud/compliance specially, so be precise and honest, not generous.

Only report a signal when the task text genuinely supports an inference. If a one-line task gives you nothing to go on for a signal, omit it — do not fabricate a value to fill every field.`;
}

export class ClaudeProvider implements AIProvider {
  id = "anthropic";
  isMock = false;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    const signalsToInfer = request.requiredSignals.filter((s) => SIGNAL_KEYS.includes(s));
    const tool = buildToolSchema(signalsToInfer);

    const taskLines = request.tasks
      .map((t) => {
        const skip = t.alreadyProvided.length
          ? ` (already provided from CSV, do not re-infer: ${t.alreadyProvided.join(", ")})`
          : "";
        return `- taskId: ${t.id}${skip}\n  title: ${t.title}\n  description: ${t.description || "(none)"}`;
      })
      .join("\n");

    const scaleLines = signalsToInfer.map((s) => `- ${s}: ${SIGNAL_SCALES[s]}`).join("\n");

    const userPrompt = `Extract signals for the following ${request.tasks.length} backlog tasks.

Signal scales:
${scaleLines}

Tasks:
${taskLines}

Call ${TOOL_NAME} with one result per task.`;

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: 8000,
      system: buildSystemPrompt(request.productContext),
      messages: [{ role: "user", content: userPrompt }],
      tools: [tool],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("Claude did not return a structured extraction result.");
    }

    const parsed = toolUse.input as { results: RawResult[] };
    return parsed.results.map((r) => normalizeResult(r, signalsToInfer));
  }
}

interface RawResult {
  taskId: string;
  category: string;
  signals: {
    signal: string;
    valueNumeric: number | null;
    valueText: string | null;
    confidence: number;
    rationale: string;
  }[];
}

function normalizeResult(raw: RawResult, allowedSignals: SignalKey[]): TaskExtractionResult {
  const signals: ExtractedSignal[] = raw.signals
    .filter((s): s is RawResult["signals"][number] & { signal: SignalKey } =>
      allowedSignals.includes(s.signal as SignalKey)
    )
    .map((s) => ({
      signal: s.signal,
      valueNumeric: s.valueNumeric,
      valueText: s.valueText,
      confidence: Math.max(0, Math.min(100, s.confidence)),
      rationale: s.rationale,
    }));

  return { taskId: raw.taskId, category: raw.category, signals };
}
