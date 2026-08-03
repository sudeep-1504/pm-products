import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(request: Request, ctx: RouteContext<"/api/score-runs/[id]/export">) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "csv";

  const scoreRun = await prisma.scoreRun.findUnique({
    where: { id },
    include: {
      backlog: true,
      frameworkConfig: true,
      taskScores: {
        orderBy: { rank: "asc" },
        include: { task: true },
      },
    },
  });
  if (!scoreRun) return NextResponse.json({ error: "Score run not found." }, { status: 404 });

  const rows = scoreRun.taskScores.map((ts) => ({
    rank: ts.rank,
    title: ts.task.title,
    description: ts.task.description,
    framework: scoreRun.frameworkConfig.name,
    baseScore: Number(ts.baseScore.toFixed(3)),
    finalScore: Number(ts.finalScore.toFixed(3)),
    appliedRuleCount: (JSON.parse(ts.appliedRules) as unknown[]).length,
    math: ts.math,
  }));

  const fileBase = scoreRun.backlog.name.replace(/[^a-z0-9\-_]+/gi, "_").toLowerCase();

  if (format === "json") {
    return new NextResponse(JSON.stringify({ scoreRunId: id, rows }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileBase}-ranked.json"`,
      },
    });
  }

  const headers = Object.keys(rows[0] ?? { rank: "", title: "" });
  const csvLines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape((row as Record<string, unknown>)[h])).join(",")),
  ];

  return new NextResponse(csvLines.join("\n"), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${fileBase}-ranked.csv"`,
    },
  });
}
