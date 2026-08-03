import { Ollama } from "ollama";
import { SIGNAL_KEYS } from "../domain/signals";
import { AIProvider, ExtractionRequest, TaskExtractionResult } from "./types";
import {
  buildExtractionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  parseExtractionPayload,
  RawExtractionResult,
} from "./shared-extraction";

export class OllamaProvider implements AIProvider {
  id = "ollama";
  isMock = false;
  private client: Ollama;

  constructor(host: string) {
    this.client = new Ollama({ host });
  }

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    const signalsToInfer = request.requiredSignals.filter((s) => SIGNAL_KEYS.includes(s));
    // Ollama's `format` accepts a raw JSON schema object directly — the same
    // shape used for every other provider, no adaptation needed.
    const schema = buildExtractionSchema(signalsToInfer);

    const response = await this.client.chat({
      model: request.model,
      messages: [
        { role: "system", content: buildSystemPrompt(request.productContext) },
        { role: "user", content: buildUserPrompt(request, signalsToInfer) },
      ],
      format: schema,
      stream: false,
    });

    const content = response.message?.content;
    if (!content) {
      throw new Error("Ollama did not return a structured extraction result.");
    }

    const parsed = JSON.parse(content) as { results: RawExtractionResult[] };
    return parseExtractionPayload(parsed, signalsToInfer);
  }
}
