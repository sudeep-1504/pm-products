import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONDITION_FIELDS, CONDITION_OPERATORS, RULE_TYPES } from "@/lib/domain/org-rules";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: RouteContext<"/api/org-rules/[id]">) {
  const { id } = await ctx.params;
  const body = await request.json();

  const existing = await prisma.orgRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rule not found." }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
  if (body.condition !== undefined) {
    if (!CONDITION_FIELDS.includes(body.condition.field) || !CONDITION_OPERATORS.includes(body.condition.operator) || !body.condition.value) {
      return NextResponse.json({ error: "Invalid condition." }, { status: 400 });
    }
    data.condition = JSON.stringify(body.condition);
  }
  if (body.ruleType !== undefined) {
    if (!RULE_TYPES.includes(body.ruleType)) {
      return NextResponse.json({ error: "Invalid rule type." }, { status: 400 });
    }
    data.ruleType = body.ruleType;
  }
  if (body.effect !== undefined) {
    if (typeof body.effect.mode !== "string") {
      return NextResponse.json({ error: "Invalid effect." }, { status: 400 });
    }
    data.effect = JSON.stringify(body.effect);
  }

  const updated = await prisma.orgRule.update({ where: { id }, data });
  return NextResponse.json({
    rule: {
      id: updated.id,
      name: updated.name,
      condition: JSON.parse(updated.condition),
      ruleType: updated.ruleType,
      effect: JSON.parse(updated.effect),
      enabled: updated.enabled,
    },
  });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/org-rules/[id]">) {
  const { id } = await ctx.params;
  const existing = await prisma.orgRule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Rule not found." }, { status: 404 });

  await prisma.orgRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
