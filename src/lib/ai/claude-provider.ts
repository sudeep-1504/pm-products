import Anthropic from "@anthropic-ai/sdk";
import { SIGNAL_KEYS } from "../domain/signals";
import { AIProvider, ExtractionRequest, TaskExtractionResult } from "./types";
import {
  TOOL_NAME,
  buildExtractionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  parseExtractionPayload,
  RawExtractionResult,
} from "./shared-extraction";

export class ClaudeProvider implements AIProvider {
  id = "anthropic";
  isMock = false;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    const signalsToInfer = request.requiredSignals.filter((s) => SIGNAL_KEYS.includes(s));
    const schema = buildExtractionSchema(signalsToInfer);

    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: 8000,
      system: buildSystemPrompt(request.productContext),
      messages: [{ role: "user", content: buildUserPrompt(request, signalsToInfer) }],
      tools: [{ name: TOOL_NAME, description: "Submit the extracted signal values and category for every task in this batch.", input_schema: schema }],
      tool_choice: { type: "tool", name: TOOL_NAME },
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (!toolUse) {
      throw new Error("Claude did not return a structured extraction result.");
    }

    const parsed = toolUse.input as { results: RawExtractionResult[] };
    return parseExtractionPayload(parsed, signalsToInfer);
  }
}
