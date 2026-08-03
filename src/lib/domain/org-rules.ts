// The organisation rules engine: a post-scoring pass that framework math can't
// express on its own ("fraud always wins", "this niche fix must not sink").
// Runs after the base framework score, in strict precedence order:
// override > floor/cap > boost/penalty > base score.

export const CONDITION_FIELDS = ["category", "keyword"] as const;
export type ConditionField = (typeof CONDITION_FIELDS)[number];

export const CONDITION_OPERATORS = ["equals", "contains"] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
}

export const RULE_TYPES = ["override", "floor_cap", "boost_penalty"] as const;
export type RuleType = (typeof RULE_TYPES)[number];

export interface OverrideEffect {
  mode: "override";
}
export interface FloorCapEffect {
  mode: "floor" | "cap";
  percentile: number; // 0-100
}
export interface BoostPenaltyEffect {
  mode: "multiply";
  factor: number; // e.g. 0.5 for a 50% penalty, 1.5 for a 50% boost
}
export type RuleEffect = OverrideEffect | FloorCapEffect | BoostPenaltyEffect;

export interface OrgRuleDef {
  id: string;
  name: string;
  condition: RuleCondition;
  ruleType: RuleType;
  effect: RuleEffect;
  enabled: boolean;
}

export interface TaskForRuleMatch {
  taskId: string;
  title: string;
  description: string;
  category: string | null;
  baseScore: number;
}

export interface AppliedRuleRecord {
  ruleId: string;
  name: string;
  ruleType: RuleType;
  effect: RuleEffect;
}

export interface RuleApplicationResult {
  finalScore: number;
  appliedRules: AppliedRuleRecord[];
}

export function matchesCondition(task: TaskForRuleMatch, condition: RuleCondition): boolean {
  const needle = condition.value.trim().toLowerCase();
  if (!needle) return false;

  if (condition.field === "category") {
    const haystack = (task.category ?? "").trim().toLowerCase();
    return condition.operator === "equals" ? haystack === needle : haystack.includes(needle);
  }

  // keyword: searches title + description + category together. "equals" isn't
  // meaningful against a free-text blob, so it's treated the same as "contains".
  const haystack = `${task.title} ${task.description} ${task.category ?? ""}`.toLowerCase();
  return haystack.includes(needle);
}

function percentileValue(sortedAsc: number[], percentile: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.floor((percentile / 100) * sortedAsc.length)));
  return sortedAsc[idx];
}

function toRecord(rule: OrgRuleDef): AppliedRuleRecord {
  return { ruleId: rule.id, name: rule.name, ruleType: rule.ruleType, effect: rule.effect };
}

export function effectSummary(effect: RuleEffect): string {
  switch (effect.mode) {
    case "override":
      return "Pin to top";
    case "floor":
      return `Floor at P${effect.percentile}`;
    case "cap":
      return `Cap at P${effect.percentile}`;
    case "multiply":
      return `x${effect.factor}`;
  }
}

/**
 * Applies the org rules pass to a scored batch. Returns a map keyed by taskId.
 * Precedence: if any override rule matches a task, it wins outright and no
 * floor/cap or boost/penalty rule is evaluated for that task. Otherwise, all
 * matching floor/cap rules apply (in the order given), then — only if none
 * matched — all matching boost/penalty rules apply as compounding multipliers.
 */
export function applyOrgRules(
  tasks: TaskForRuleMatch[],
  rules: OrgRuleDef[]
): Map<string, RuleApplicationResult> {
  const enabledRules = rules.filter((r) => r.enabled);
  const sortedScores = tasks.map((t) => t.baseScore).sort((a, b) => a - b);
  const maxScore = sortedScores[sortedScores.length - 1] ?? 0;

  const results = new Map<string, RuleApplicationResult>();

  for (const task of tasks) {
    const matched = enabledRules.filter((r) => matchesCondition(task, r.condition));
    const overrides = matched.filter((r) => r.ruleType === "override");
    const floorCaps = matched.filter((r) => r.ruleType === "floor_cap");
    const boosts = matched.filter((r) => r.ruleType === "boost_penalty");

    let finalScore = task.baseScore;
    const applied: AppliedRuleRecord[] = [];

    if (overrides.length > 0) {
      // Ceiling: guaranteed above every non-overridden task, while overridden
      // tasks still order among themselves by their original base score.
      finalScore = maxScore * 1000 + task.baseScore;
      applied.push(...overrides.map(toRecord));
    } else if (floorCaps.length > 0) {
      let score = task.baseScore;
      for (const rule of floorCaps) {
        const effect = rule.effect as FloorCapEffect;
        const target = percentileValue(sortedScores, effect.percentile);
        score = effect.mode === "floor" ? Math.max(score, target) : Math.min(score, target);
        applied.push(toRecord(rule));
      }
      finalScore = score;
    } else if (boosts.length > 0) {
      let score = task.baseScore;
      for (const rule of boosts) {
        const effect = rule.effect as BoostPenaltyEffect;
        score *= effect.factor;
        applied.push(toRecord(rule));
      }
      finalScore = score;
    }

    results.set(task.taskId, { finalScore, appliedRules: applied });
  }

  return results;
}
