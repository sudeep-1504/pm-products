import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseSpreadsheet } from "@/lib/domain/file-parse";
import { MAPPABLE_FIELDS, MappableField, mappableFieldToSignal } from "@/lib/domain/column-mapping";

export const dynamic = "force-dynamic";

export async function GET() {
  const backlogs = await prisma.backlog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { tasks: true } },
      scoreRuns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({
    backlogs: backlogs.map((b) => ({
      id: b.id,
      name: b.name,
      taskCount: b._count.tasks,
      createdAt: b.createdAt,
      latestScoreRun: b.scoreRuns[0]
        ? { id: b.scoreRuns[0].id, status: b.scoreRuns[0].status }
        : null,
    })),
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const name = String(form.get("name") ?? "").trim();
  const columnMappingRaw = form.get("columnMapping");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Backlog name is required." }, { status: 400 });
  }
  if (typeof columnMappingRaw !== "string") {
    return NextResponse.json({ error: "Missing column mapping." }, { status: 400 });
  }

  const columnMapping = JSON.parse(columnMappingRaw) as Record<MappableField, string | null>;
  if (!columnMapping.title) {
    return NextResponse.json({ error: "A title column must be mapped." }, { status: 400 });
  }

  let headers: string[];
  let rows: Record<string, string>[];
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    ({ headers, rows } = parseSpreadsheet(buffer, file.name));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse file." },
      { status: 400 }
    );
  }

  const fileType = file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";

  const backlog = await prisma.$transaction(async (tx) => {
    const created = await tx.backlog.create({
      data: {
        name,
        sourceFileName: file.name,
        sourceFileType: fileType,
        rawHeaders: JSON.stringify(headers),
        columnMapping: JSON.stringify(columnMapping),
      },
    });

    const titleCol = columnMapping.title as string;
    const descCol = columnMapping.description;

    const taskRows = rows.map((row, i) => ({
      id: randomUUID(),
      backlogId: created.id,
      rowIndex: i,
      rawFields: JSON.stringify(row),
      title: String(row[titleCol] ?? "").trim() || `Row ${i + 1}`,
      description: descCol ? String(row[descCol] ?? "") : "",
    }));

    const signalRows: {
      id: string;
      taskId: string;
      signal: string;
      valueNumeric: number | null;
      valueText: string | null;
      source: string;
      confidence: number | null;
    }[] = [];

    rows.forEach((row, i) => {
      const taskId = taskRows[i].id;
      for (const field of MAPPABLE_FIELDS) {
        const signal = mappableFieldToSignal(field);
        if (!signal) continue;
        const col = columnMapping[field];
        if (!col) continue;
        const raw = row[col];
        if (raw === undefined || raw === null || String(raw).trim() === "") continue;

        if (signal === "category") {
          signalRows.push({
            id: randomUUID(),
            taskId,
            signal,
            valueNumeric: null,
            valueText: String(raw).trim(),
            source: "csv",
            confidence: null,
          });
        } else {
          const num = Number(raw);
          if (Number.isFinite(num)) {
            signalRows.push({
              id: randomUUID(),
              taskId,
              signal,
              valueNumeric: num,
              valueText: null,
              source: "csv",
              confidence: null,
            });
          }
        }
      }
    });

    await tx.task.createMany({ data: taskRows });
    if (signalRows.length > 0) {
      await tx.taskSignal.createMany({ data: signalRows });
    }

    // Phase 1 ships RICE only; ensure a framework config exists and is active.
    const existingFramework = await tx.frameworkConfig.findFirst({ where: { key: "rice" } });
    if (!existingFramework) {
      await tx.frameworkConfig.create({
        data: { key: "rice", name: "RICE", isActive: true, parameters: "{}" },
      });
    }

    return created;
  });

  return NextResponse.json({ backlogId: backlog.id });
}
