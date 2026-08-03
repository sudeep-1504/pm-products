import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBacklogReviewData } from "@/lib/domain/backlog-service";
import { FRAMEWORKS } from "@/lib/domain/frameworks";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/backlogs/[id]">) {
  const { id } = await ctx.params;
  const data = await getBacklogReviewData(id);
  if (!data) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });
  return NextResponse.json(data);
}

// Switches the framework used for this backlog's next score run. Existing
// signals are reused as-is (flow 11.2 from the PRD) — only the projection
// changes, so no re-extraction happens here. If the new framework needs
// signals the old one didn't, those show up as gaps on the review screen
// until resolved (by human edit or a fresh extraction pass).
export async function PATCH(request: Request, ctx: RouteContext<"/api/backlogs/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();
  const frameworkKey = String(body.frameworkKey ?? "");

  if (!FRAMEWORKS[frameworkKey]) {
    return NextResponse.json({ error: `Unknown framework: ${frameworkKey}` }, { status: 400 });
  }

  const backlog = await prisma.backlog.findUnique({ where: { id } });
  if (!backlog) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });

  await prisma.frameworkConfig.upsert({
    where: { key: frameworkKey },
    create: { key: frameworkKey, name: FRAMEWORKS[frameworkKey].name, parameters: "{}" },
    update: {},
  });

  await prisma.backlog.update({ where: { id }, data: { frameworkKey } });

  return NextResponse.json({ ok: true });
}
