import { prisma } from "@/lib/prisma";

export async function getScoreRunDetail(id: string) {
  const scoreRun = await prisma.scoreRun.findUnique({
    where: { id },
    include: {
      backlog: true,
      frameworkConfig: true,
      productContext: true,
      taskScores: {
        orderBy: { rank: "asc" },
        include: { task: { include: { signals: true } } },
      },
    },
  });
  if (!scoreRun) return null;

  return {
    scoreRun: {
      id: scoreRun.id,
      status: scoreRun.status,
      createdAt: scoreRun.createdAt,
      committedAt: scoreRun.committedAt,
      llmModel: scoreRun.llmModel,
      framework: { key: scoreRun.frameworkConfig.key, name: scoreRun.frameworkConfig.name },
      productContextVersion: scoreRun.productContext?.version ?? null,
    },
    backlog: { id: scoreRun.backlog.id, name: scoreRun.backlog.name },
    rankedTasks: scoreRun.taskScores.map((ts) => ({
      rank: ts.rank,
      taskId: ts.taskId,
      title: ts.task.title,
      description: ts.task.description,
      baseScore: ts.baseScore,
      finalScore: ts.finalScore,
      math: ts.math,
      appliedRules: JSON.parse(ts.appliedRules) as unknown[],
      inputsUsed: JSON.parse(ts.frameworkInputsSnapshot) as unknown[],
      allSignals: ts.task.signals.map((s) => ({
        signal: s.signal,
        valueNumeric: s.valueNumeric,
        valueText: s.valueText,
        source: s.source,
        confidence: s.confidence,
        rationale: s.rationale,
      })),
    })),
  };
}

export type ScoreRunDetail = NonNullable<Awaited<ReturnType<typeof getScoreRunDetail>>>;

export async function getLatestScoreRunForBacklog(backlogId: string) {
  return prisma.scoreRun.findFirst({ where: { backlogId }, orderBy: { createdAt: "desc" } });
}
