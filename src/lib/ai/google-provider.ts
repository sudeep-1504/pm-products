import { GoogleGenAI, Type as GeminiType } from "@google/genai";
import { SIGNAL_KEYS } from "../domain/signals";
import { AIProvider, ExtractionRequest, TaskExtractionResult } from "./types";
import {
  buildExtractionSchema,
  buildSystemPrompt,
  buildUserPrompt,
  parseExtractionPayload,
  RawExtractionResult,
} from "./shared-extraction";

// Our shared schema is plain JSON Schema (lowercase types, `type: [x, "null"]`
// for nullable fields). Gemini's Schema type wants uppercase Type enum values
// and a separate `nullable` boolean instead of a type union — this adapts one
// to the other so the extraction schema stays defined once, in one place.
type JsonSchemaNode = {
  type?: string | string[];
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  enum?: string[];
  description?: string;
  required?: string[];
};

function toGeminiSchema(node: JsonSchemaNode): Record<string, unknown> {
  const types = Array.isArray(node.type) ? node.type : node.type ? [node.type] : [];
  const nullable = types.includes("null");
  const baseType = types.find((t) => t !== "null") ?? "object";

  const typeMap: Record<string, GeminiType> = {
    string: GeminiType.STRING,
    number: GeminiType.NUMBER,
    integer: GeminiType.INTEGER,
    boolean: GeminiType.BOOLEAN,
    object: GeminiType.OBJECT,
    array: GeminiType.ARRAY,
  };

  const schema: Record<string, unknown> = {
    type: typeMap[baseType] ?? GeminiType.STRING,
  };
  if (nullable) schema.nullable = true;
  if (node.description) schema.description = node.description;
  if (node.enum) schema.enum = node.enum;
  if (node.required) schema.required = node.required;
  if (node.items) schema.items = toGeminiSchema(node.items);
  if (node.properties) {
    schema.properties = Object.fromEntries(
      Object.entries(node.properties).map(([key, value]) => [key, toGeminiSchema(value)])
    );
  }
  return schema;
}

export class GoogleProvider implements AIProvider {
  id = "google";
  isMock = false;
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async extractBatch(request: ExtractionRequest): Promise<TaskExtractionResult[]> {
    const signalsToInfer = request.requiredSignals.filter((s) => SIGNAL_KEYS.includes(s));
    const schema = buildExtractionSchema(signalsToInfer);

    const response = await this.client.models.generateContent({
      model: request.model,
      contents: buildUserPrompt(request, signalsToInfer),
      config: {
        systemInstruction: buildSystemPrompt(request.productContext),
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(schema),
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini did not return a structured extraction result.");
    }

    const parsed = JSON.parse(text) as { results: RawExtractionResult[] };
    return parseExtractionPayload(parsed, signalsToInfer);
  }
}
