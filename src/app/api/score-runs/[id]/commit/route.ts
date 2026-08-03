import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(_request: Request, ctx: RouteContext<"/api/score-runs/[id]/commit">) {
  const { id } = await ctx.params;

  const scoreRun = await prisma.scoreRun.findUnique({ where: { id } });
  if (!scoreRun) return NextResponse.json({ error: "Score run not found." }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    const committed = await tx.scoreRun.update({
      where: { id },
      data: { status: "committed", committedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        scoreRunId: id,
        eventType: "commit",
        payload: JSON.stringify({ committedAt: committed.committedAt }),
      },
    });
    return committed;
  });

  return NextResponse.json({ scoreRun: updated });
}
