import OpenAI from "openai";
import { SIGNAL_KEYS } from "../domain/signals";
import { AIProvider, ExtractionRequest, TaskExtractionResult } from "./types";
import {
  buildExtractionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  parseExtractionPayload,
  RawExtractionResult,
} from "./shared-extraction";

export class OpenAIProvider implements AIProvider {
  id = "openai";
  isMock = false;
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    const signalsToInfer = request.requiredSignals.filter((s) => SIGNAL_KEYS.includes(s));
    const schema = buildExtractionSchema(signalsToInfer);

    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: [
        { role: "system", content: buildSystemPrompt(request.productContext) },
        { role: "user", content: buildUserPrompt(request, signalsToInfer) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "submit_extraction", schema, strict: true },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI did not return a structured extraction result.");
    }

    const parsed = JSON.parse(content) as { results: RawExtractionResult[] };
    return parseExtractionPayload(parsed, signalsToInfer);
  }
}
