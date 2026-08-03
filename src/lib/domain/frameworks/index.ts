import { Framework } from "./types";
import { riceFramework } from "./rice";

// Phase 1 ships RICE only. The Framework interface is what makes ICE, WSJF,
// Value vs Effort, CD3, MoSCoW and Weighted Scoring pure additions later — each
// is just another pure function reading a subset of the same signal layer.
export const FRAMEWORKS: Record<string, Framework> = {
  rice: riceFramework,
};

export function getFramework(key: string): Framework {
  const framework = FRAMEWORKS[key];
  if (!framework) throw new Error(`Unknown framework: ${key}`);
  return framework;
}
