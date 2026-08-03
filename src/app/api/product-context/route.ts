import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProductContextData } from "@/lib/domain/product-context";

export const dynamic = "force-dynamic";

export async function GET() {
  const latest = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  if (!latest) return NextResponse.json({ context: null });
  return NextResponse.json({ context: serialize(latest) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ProductContextData;

  if (!body.productDescription?.trim()) {
    return NextResponse.json({ error: "Product description is required." }, { status: 400 });
  }

  const previous = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  const created = await prisma.$transaction(async (tx) => {
    if (previous) {
      await tx.productContext.update({ where: { id: previous.id }, data: { isActive: false } });
    }
    return tx.productContext.create({
      data: {
        version: (previous?.version ?? 0) + 1,
        isActive: true,
        productDescription: body.productDescription,
        goals: JSON.stringify(body.goals ?? []),
        okrs: JSON.stringify(body.okrs ?? []),
        northStarMetric: body.northStarMetric ?? "",
        supportingMetrics: JSON.stringify(body.supportingMetrics ?? []),
        priorityAreas: JSON.stringify(body.priorityAreas ?? []),
        targetSegments: JSON.stringify(body.targetSegments ?? []),
        constraints: body.constraints ?? "",
        freeText: body.freeText ?? "",
      },
    });
  });

  return NextResponse.json({ context: serialize(created) });
}

function serialize(row: {
  id: string;
  version: number;
  productDescription: string;
  goals: string;
  okrs: string;
  northStarMetric: string;
  supportingMetrics: string;
  priorityAreas: string;
  targetSegments: string;
  constraints: string;
  freeText: string;
}) {
  return {
    id: row.id,
    version: row.version,
    productDescription: row.productDescription,
    goals: JSON.parse(row.goals),
    okrs: JSON.parse(row.okrs),
    northStarMetric: row.northStarMetric,
    supportingMetrics: JSON.parse(row.supportingMetrics),
    priorityAreas: JSON.parse(row.priorityAreas),
    targetSegments: JSON.parse(row.targetSegments),
    constraints: row.constraints,
    freeText: row.freeText,
  };
}
