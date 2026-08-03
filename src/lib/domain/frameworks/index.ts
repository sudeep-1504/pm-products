import { Framework, resolveRequiredSignals } from "./types";
import { riceFramework } from "./rice";
import { iceFramework } from "./ice";
import { wsjfFramework } from "./wsjf";
import { cd3Framework } from "./cd3";
import { valueEffortFramework } from "./value-effort";
import { moscowFramework } from "./moscow";
import { makeWeightedFramework } from "./weighted";

export { resolveRequiredSignals };
export type { Framework };
export { DEFAULT_WEIGHTED_PARAMETERS } from "./weighted";
export type { WeightedCriterion, WeightedScoringParameters } from "./weighted";

// Every framework is a pure function reading a subset of the shared signal
// layer — swap the framework and the tasks (and their signals) don't change,
// only the projection does.
export const FRAMEWORKS: Record<string, Framework> = {
  rice: riceFramework,
  ice: iceFramework,
  wsjf: wsjfFramework,
  cd3: cd3Framework,
  value_effort: valueEffortFramework,
  moscow: moscowFramework,
  weighted: makeWeightedFramework(),
};

export const FRAMEWORK_LIST = Object.values(FRAMEWORKS).map((f) => ({
  key: f.key,
  name: f.name,
  description: f.description,
}));

export function getFramework(key: string): Framework {
  const framework = FRAMEWORKS[key];
  if (!framework) throw new Error(`Unknown framework: ${key}`);
  return framework;
}
