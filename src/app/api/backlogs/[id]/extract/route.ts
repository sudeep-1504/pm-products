import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFramework, resolveRequiredSignals } from "@/lib/domain/frameworks";
import { getOrCreateFrameworkConfig } from "@/lib/domain/framework-config-service";
import { buildSignalMap } from "@/lib/domain/task-view";
import { isGap, SignalKey } from "@/lib/domain/signals";
import { getAIProvider, ExtractionTaskInput, ProductContextForExtraction } from "@/lib/ai";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: RouteContext<"/api/backlogs/[id]/extract">) {
  const { id } = await ctx.params;

  const backlog = await prisma.backlog.findUnique({
    where: { id },
    include: { tasks: { include: { signals: true }, orderBy: { rowIndex: "asc" } } },
  });
  if (!backlog) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });

  const frameworkConfig = await getOrCreateFrameworkConfig(backlog.frameworkKey);
  const framework = getFramework(backlog.frameworkKey);
  const parameters = JSON.parse(frameworkConfig.parameters);
  const requiredSignals: SignalKey[] = Array.from(
    new Set([...resolveRequiredSignals(framework, parameters), "category" as SignalKey])
  );

  const config = await prisma.appConfig.findFirst();
  const batchSize = config?.extractionBatchSize ?? 10;
  const maxRetries = config?.extractionMaxRetries ?? 2;
  const model = config?.llmModel ?? "claude-sonnet-5";
  const providerId = config?.llmProvider ?? "anthropic";

  const productContextRow = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  const productContext: ProductContextForExtraction = productContextRow
    ? {
        productDescription: productContextRow.productDescription,
        goals: JSON.parse(productContextRow.goals),
        okrs: JSON.parse(productContextRow.okrs),
        northStarMetric: productContextRow.northStarMetric,
        supportingMetrics: JSON.parse(productContextRow.supportingMetrics),
        priorityAreas: JSON.parse(productContextRow.priorityAreas),
        targetSegments: JSON.parse(productContextRow.targetSegments),
        constraints: productContextRow.constraints,
        freeText: productContextRow.freeText,
      }
    : {
        productDescription: "",
        goals: [],
        okrs: [],
        northStarMetric: "",
        supportingMetrics: [],
        priorityAreas: [],
        targetSegments: [],
        constraints: "",
        freeText: "",
      };

  const provider = getAIProvider(providerId);

  const tasksNeedingWork = backlog.tasks
    .map((task) => {
      const signalMap = buildSignalMap(task.signals);
      const gaps = requiredSignals.filter((key) => isGap(signalMap[key]));
      const alreadyProvided = requiredSignals.filter((key) => !isGap(signalMap[key]));
      return { task, gaps, alreadyProvided };
    })
    .filter((t) => t.gaps.length > 0);

  let signalsWritten = 0;
  const failedTaskIds: string[] = [];

  for (let i = 0; i < tasksNeedingWork.length; i += batchSize) {
    const batch = tasksNeedingWork.slice(i, i + batchSize);
    const input: ExtractionTaskInput[] = batch.map((b) => ({
      id: b.task.id,
      title: b.task.title,
      description: b.task.description,
      alreadyProvided: b.alreadyProvided,
    }));

    let attempt = 0;
    let results = null;
    let lastError: unknown = null;
    while (attempt <= maxRetries && !results) {
      try {
        results = await provider.extractBatch({
          model,
          tasks: input,
          requiredSignals,
          productContext,
        });
      } catch (err) {
        lastError = err;
        attempt++;
      }
    }

    if (!results) {
      failedTaskIds.push(...batch.map((b) => b.task.id));
      console.error("Extraction batch failed after retries:", lastError);
      continue;
    }

    for (const result of results) {
      const taskMeta = batch.find((b) => b.task.id === result.taskId);
      if (!taskMeta) continue;

      const rowsToWrite = result.signals.filter((s) => taskMeta.gaps.includes(s.signal));

      // Category is always worth recording if the model classified it and it's a gap.
      if (taskMeta.gaps.includes("category") && result.category) {
        const alreadyHasCategory = rowsToWrite.some((s) => s.signal === "category");
        if (!alreadyHasCategory) {
          rowsToWrite.push({
            signal: "category",
            valueNumeric: null,
            valueText: result.category,
            confidence: 80,
            rationale: "Category classification from product-context-grounded extraction.",
          });
        }
      }

      for (const s of rowsToWrite) {
        await prisma.taskSignal.upsert({
          where: { taskId_signal: { taskId: result.taskId, signal: s.signal } },
          create: {
            id: randomUUID(),
            taskId: result.taskId,
            signal: s.signal,
            valueNumeric: s.valueNumeric,
            valueText: s.valueText,
            source: "ai",
            confidence: s.confidence,
            rationale: s.rationale,
          },
          update: {
            valueNumeric: s.valueNumeric,
            valueText: s.valueText,
            source: "ai",
            confidence: s.confidence,
            rationale: s.rationale,
          },
        });
        signalsWritten++;
      }
    }
  }

  await prisma.auditEvent.create({
    data: {
      eventType: "extraction",
      payload: JSON.stringify({
        backlogId: id,
        model,
        isMock: provider.isMock,
        tasksProcessed: tasksNeedingWork.length,
        signalsWritten,
        failedTaskIds,
      }),
    },
  });

  return NextResponse.json({
    tasksProcessed: tasksNeedingWork.length,
    signalsWritten,
    isMock: provider.isMock,
    model,
    failedTaskIds,
  });
}
