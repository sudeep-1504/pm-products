import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFramework } from "@/lib/domain/frameworks";
import { buildSignalMap, computeCompleteness } from "@/lib/domain/task-view";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/backlogs/[id]/score">) {
  const { id } = await ctx.params;

  const backlog = await prisma.backlog.findUnique({
    where: { id },
    include: { tasks: { include: { signals: true }, orderBy: { rowIndex: "asc" } } },
  });
  if (!backlog) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });

  const frameworkConfig = await prisma.frameworkConfig.findFirst({ where: { isActive: true } });
  const framework = getFramework(frameworkConfig?.key ?? "rice");
  const config = await prisma.appConfig.findFirst();
  const confidenceThreshold = config?.confidenceThreshold ?? 70;

  const productContext = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  const computed = backlog.tasks.map((task) => {
    const signalMap = buildSignalMap(task.signals);
    const completeness = computeCompleteness(signalMap, framework.requiredSignals, confidenceThreshold);
    const result = framework.compute(signalMap);
    return { task, completeness, result };
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

  if (!frameworkConfig) {
    return NextResponse.json({ error: "No active framework configured." }, { status: 400 });
  }

  const ranked = [...computed].sort((a, b) => b.result.baseScore - a.result.baseScore);

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

    const taskScoreRows = ranked.map((c, index) => ({
      id: randomUUID(),
      scoreRunId: run.id,
      taskId: c.task.id,
      frameworkInputsSnapshot: JSON.stringify(c.result.inputsUsed),
      math: c.result.math,
      baseScore: c.result.baseScore,
      appliedRules: "[]",
      finalScore: c.result.baseScore,
      rank: index + 1,
    }));

    await tx.taskScore.createMany({ data: taskScoreRows });

    return run;
  });

  return NextResponse.json({ scoreRunId: scoreRun.id });
}
