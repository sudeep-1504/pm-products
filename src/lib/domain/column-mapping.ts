import { SignalKey } from "./signals";

// Every field the tool can bind an uploaded column to. title is required;
// everything else is optional and, if unmapped, becomes an AI-inference target.
export const MAPPABLE_FIELDS = [
  "title",
  "description",
  "reach",
  "value",
  "impact",
  "effort",
  "confidence",
  "urgency",
  "risk",
  "category",
] as const;

export type MappableField = (typeof MAPPABLE_FIELDS)[number];

export function mappableFieldToSignal(field: MappableField): SignalKey | null {
  if (field === "title" || field === "description") return null;
  return field as SignalKey;
}

const SYNONYMS: Record<MappableField, string[]> = {
  title: ["title", "name", "summary", "task", "ticket", "issue", "story"],
  description: ["description", "details", "desc", "notes", "body"],
  reach: ["reach", "users affected", "user count", "audience"],
  value: ["value", "business value", "user value", "importance"],
  impact: ["impact", "impact score", "weight"],
  effort: ["effort", "size", "story points", "points", "estimate", "duration", "cost"],
  confidence: ["confidence", "certainty"],
  urgency: ["urgency", "priority", "time criticality", "deadline"],
  risk: ["risk", "risk score", "risk reduction"],
  category: ["category", "area", "type", "label", "tag", "team", "component"],
};

function normalize(header: string): string {
  return header.toLowerCase().replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Heuristic, deterministic column-mapping suggestion: fuzzy-matches uploaded
 * headers against a synonym list per target field. This is the "AI suggests
 * the mapping" step from the import flow — a live model call isn't needed to
 * match column headers, so this stays fast and free while the signal
 * extraction proper (which does need judgement) goes through Claude.
 */
export function suggestColumnMapping(headers: string[]): Record<MappableField, string | null> {
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  const result = {} as Record<MappableField, string | null>;
  const usedHeaders = new Set<string>();

  for (const field of MAPPABLE_FIELDS) {
    let best: { raw: string; score: number } | null = null;
    for (const { raw, norm } of normalizedHeaders) {
      if (usedHeaders.has(raw)) continue;
      const score = matchScore(norm, SYNONYMS[field]);
      if (score > 0 && (!best || score > best.score)) {
        best = { raw, score };
      }
    }
    result[field] = best ? best.raw : null;
    if (best) usedHeaders.add(best.raw);
  }

  return result;
}

function matchScore(headerNorm: string, synonyms: string[]): number {
  let best = 0;
  for (const syn of synonyms) {
    if (headerNorm === syn) best = Math.max(best, 100);
    else if (headerNorm.includes(syn) || syn.includes(headerNorm)) best = Math.max(best, 70);
  }
  return best;
}
