import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FRAMEWORKS } from "@/lib/domain/frameworks";
import { getOrCreateFrameworkConfig } from "@/lib/domain/framework-config-service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: RouteContext<"/api/framework-config/[key]">) {
  const { key } = await ctx.params;
  if (!FRAMEWORKS[key]) return NextResponse.json({ error: "Unknown framework." }, { status: 404 });

  const config = await getOrCreateFrameworkConfig(key);
  return NextResponse.json({ config: { key: config.key, name: config.name, parameters: JSON.parse(config.parameters) } });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/framework-config/[key]">) {
  const { key } = await ctx.params;
  if (!FRAMEWORKS[key]) return NextResponse.json({ error: "Unknown framework." }, { status: 404 });

  const body = await request.json();
  await getOrCreateFrameworkConfig(key);

  const updated = await prisma.frameworkConfig.update({
    where: { key },
    data: { parameters: JSON.stringify(body.parameters ?? {}) },
  });

  return NextResponse.json({ config: { key: updated.key, name: updated.name, parameters: JSON.parse(updated.parameters) } });
}
