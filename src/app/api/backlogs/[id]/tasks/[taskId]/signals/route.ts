import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SIGNAL_KEYS, SignalKey } from "@/lib/domain/signals";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/backlogs/[id]/tasks/[taskId]/signals">
) {
  const { taskId } = await ctx.params;
  const body = await request.json();

  const signal = body.signal as SignalKey;
  if (!SIGNAL_KEYS.includes(signal)) {
    return NextResponse.json({ error: "Unknown signal." }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const valueNumeric: number | null =
    signal === "category" ? null : typeof body.valueNumeric === "number" ? body.valueNumeric : null;
  const valueText: string | null =
    signal === "category" ? (typeof body.valueText === "string" ? body.valueText : null) : null;

  const updated = await prisma.taskSignal.upsert({
    where: { taskId_signal: { taskId, signal } },
    create: {
      id: randomUUID(),
      taskId,
      signal,
      valueNumeric,
      valueText,
      source: "human",
      confidence: null,
      rationale: "Human override.",
    },
    update: {
      valueNumeric,
      valueText,
      source: "human",
      confidence: null,
      rationale: "Human override.",
    },
  });

  await prisma.auditEvent.create({
    data: {
      taskId,
      eventType: "signal_edited",
      payload: JSON.stringify({ signal, valueNumeric, valueText }),
    },
  });

  return NextResponse.json({ signal: updated });
}
