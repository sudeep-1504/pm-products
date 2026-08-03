import { prisma } from "@/lib/prisma";
import { buildSignalMap, computeCompleteness } from "./task-view";
import { getFramework, resolveRequiredSignals } from "./frameworks";
import { getOrCreateFrameworkConfig } from "./framework-config-service";

export async function getBacklogReviewData(id: string) {
  const backlog = await prisma.backlog.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { rowIndex: "asc" }, include: { signals: true } },
      scoreRuns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!backlog) return null;

  const frameworkConfig = await getOrCreateFrameworkConfig(backlog.frameworkKey);
  const framework = getFramework(backlog.frameworkKey);
  const parameters = JSON.parse(frameworkConfig.parameters);
  const requiredSignals = resolveRequiredSignals(framework, parameters);

  const config = await prisma.appConfig.findFirst();
  const confidenceThreshold = config?.confidenceThreshold ?? 70;
  const displaySignals = Array.from(new Set([...requiredSignals, "category" as const]));

  const tasks = backlog.tasks.map((task) => {
    const signalMap = buildSignalMap(task.signals);
    const completeness = computeCompleteness(signalMap, requiredSignals, confidenceThreshold);
    return {
      id: task.id,
      rowIndex: task.rowIndex,
      title: task.title,
      description: task.description,
      signals: displaySignals.map((key) => signalMap[key] ?? null),
      completeness,
    };
  });

  const totalGaps = tasks.reduce((sum, t) => sum + t.completeness.gaps.length, 0);

  return {
    backlog: {
      id: backlog.id,
      name: backlog.name,
      sourceFileName: backlog.sourceFileName,
      createdAt: backlog.createdAt,
      frameworkKey: backlog.frameworkKey,
    },
    framework: { key: framework.key, name: framework.name, requiredSignals },
    displaySignals,
    confidenceThreshold,
    tasks,
    totalGaps,
    canScore: totalGaps === 0,
    latestScoreRun: backlog.scoreRuns[0] ?? null,
  };
}

export type BacklogReviewData = NonNullable<Awaited<ReturnType<typeof getBacklogReviewData>>>;
