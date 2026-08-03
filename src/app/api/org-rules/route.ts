import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONDITION_FIELDS, CONDITION_OPERATORS, RULE_TYPES } from "@/lib/domain/org-rules";

export const dynamic = "force-dynamic";

function serialize(row: {
  id: string;
  name: string;
  condition: string;
  ruleType: string;
  effect: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    condition: JSON.parse(row.condition),
    ruleType: row.ruleType,
    effect: JSON.parse(row.effect),
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET() {
  const rules = await prisma.orgRule.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ rules: rules.map(serialize) });
}

export async function POST(request: Request) {
  const body = await request.json();

  const name = String(body.name ?? "").trim();
  const condition = body.condition;
  const ruleType = String(body.ruleType ?? "");
  const effect = body.effect;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!condition || !CONDITION_FIELDS.includes(condition.field) || !CONDITION_OPERATORS.includes(condition.operator) || !condition.value) {
    return NextResponse.json({ error: "Invalid condition." }, { status: 400 });
  }
  if (!(RULE_TYPES as readonly string[]).includes(ruleType)) {
    return NextResponse.json({ error: "Invalid rule type." }, { status: 400 });
  }
  if (!effect || typeof effect.mode !== "string") {
    return NextResponse.json({ error: "Invalid effect." }, { status: 400 });
  }

  const created = await prisma.orgRule.create({
    data: {
      id: randomUUID(),
      name,
      condition: JSON.stringify(condition),
      ruleType,
      effect: JSON.stringify(effect),
      enabled: body.enabled ?? true,
    },
  });

  return NextResponse.json({ rule: serialize(created) });
}
