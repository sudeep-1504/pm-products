import { NextResponse } from "next/server";
import { getScoreRunDetail } from "@/lib/domain/score-run-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/score-runs/[id]">) {
  const { id } = await ctx.params;
  const data = await getScoreRunDetail(id);
  if (!data) return NextResponse.json({ error: "Score run not found." }, { status: 404 });
  return NextResponse.json(data);
}
