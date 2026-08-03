import { NextResponse } from "next/server";
import { getBacklogReviewData } from "@/lib/domain/backlog-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/backlogs/[id]">) {
  const { id } = await ctx.params;
  const data = await getBacklogReviewData(id);
  if (!data) return NextResponse.json({ error: "Backlog not found." }, { status: 404 });
  return NextResponse.json(data);
}
