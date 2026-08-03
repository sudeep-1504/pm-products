import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFramework, resolveRequiredSignals } from "@/lib/domain/frameworks";
import { getOrCreateFrameworkConfig } from "@/lib/domain/framework-config-service";
import { buildSignalMap, computeCompleteness } from "@/lib/domain/task-view";
import { applyOrgRules, OrgRuleDef, RuleCondition, RuleEffect, RuleType } from "@/lib/domain/org-rules";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/backlogs/[id]/score">) {
  const { id } = await ctx.params;

  const backlog = await prisma.backlog.findUnique({
    where: { id },
    include: { tasks: { include: { signals: true }, orderBy: { rowIndex: "asc" } } },
  });
  if (!backlog) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });

  const frameworkConfig = await getOrCreateFrameworkConfig(backlog.frameworkKey);
  const framework = getFramework(backlog.frameworkKey);
  const parameters = JSON.parse(frameworkConfig.parameters);
  const requiredSignals = resolveRequiredSignals(framework, parameters);

  const config = await prisma.appConfig.findFirst();
  const confidenceThreshold = config?.confidenceThreshold ?? 70;

  const productContext = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  const computed = backlog.tasks.map((task) => {
    const signalMap = buildSignalMap(task.signals);
    const completeness = computeCompleteness(signalMap, requiredSignals, confidenceThreshold);
    const result = framework.compute(signalMap, parameters);
    const category = signalMap.category?.valueText ?? null;
    return { task, completeness, result, category };
  });

  const incomplete = computed.filter((c) => !c.completeness.isComplete);
  if (incomplete.length > 0) {
    return NextResponse.json(
      {
        error: "Backlog is not complete. Resolve every gap before scoring.",
        incompleteTaskIds: incomplete.map((c) => c.task.id),
      },
      { status: 400 }
    );
  }

  const orgRuleRows = await prisma.orgRule.findMany({ where: { enabled: true } });
  const orgRules: OrgRuleDef[] = orgRuleRows.map((r) => ({
    id: r.id,
    name: r.name,
    condition: JSON.parse(r.condition) as RuleCondition,
    ruleType: r.ruleType as RuleType,
    effect: JSON.parse(r.effect) as RuleEffect,
    enabled: r.enabled,
  }));

  const ruleResults = applyOrgRules(
    computed.map((c) => ({
      taskId: c.task.id,
      baseScore: c.result.baseScore,
      category: c.category,
      title: c.task.title,
      description: c.task.description,
    })),
    orgRules
  );

  const ranked = [...computed].sort(
    (a, b) => (ruleResults.get(b.task.id)?.finalScore ?? b.result.baseScore) -
      (ruleResults.get(a.task.id)?.finalScore ?? a.result.baseScore)
  );

  const scoreRun = await prisma.$transaction(async (tx) => {
    const run = await tx.scoreRun.create({
      data: {
        backlogId: id,
        frameworkConfigId: frameworkConfig.id,
        productContextId: productContext?.id ?? null,
        llmModel: config?.llmModel ?? "claude-sonnet-5",
        status: "draft",
      },
    });

    const taskScoreRows = ranked.map((c, index) => {
      const ruleResult = ruleResults.get(c.task.id);
      return {
        id: randomUUID(),
        scoreRunId: run.id,
        taskId: c.task.id,
        frameworkInputsSnapshot: JSON.stringify(c.result.inputsUsed),
        math: c.result.math,
        baseScore: c.result.baseScore,
        appliedRules: JSON.stringify(ruleResult?.appliedRules ?? []),
        finalScore: ruleResult?.finalScore ?? c.result.baseScore,
        rank: index + 1,
      };
    });

    await tx.taskScore.createMany({ data: taskScoreRows });

    const auditRows = ranked
      .flatMap((c) => {
        const ruleResult = ruleResults.get(c.task.id);
        return (ruleResult?.appliedRules ?? []).map((applied) => ({
          id: randomUUID(),
          scoreRunId: run.id,
          taskId: c.task.id,
          eventType: "rule_applied",
          payload: JSON.stringify({ ruleId: applied.ruleId, name: applied.name, ruleType: applied.ruleType, effect: applied.effect }),
        }));
      });

    if (auditRows.length > 0) {
      await tx.auditEvent.createMany({ data: auditRows });
    }

    return run;
  });

  return NextResponse.json({ scoreRunId: scoreRun.id });
}
