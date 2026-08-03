import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { ProductContextForm } from "@/components/product-context-form";
import { EMPTY_PRODUCT_CONTEXT } from "@/lib/domain/product-context";

export const dynamic = "force-dynamic";

export default async function ProductContextPage() {
  const row = await prisma.productContext.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });

  const initial = row
    ? {
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
      }
    : EMPTY_PRODUCT_CONTEXT;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Product Context</h1>
        <p className="text-sm text-muted-foreground">
          Grounds every extraction call. Edits are versioned — each save records a new version, and every
          score run records which version it ran against.
        </p>
      </div>
      <ProductContextForm initial={initial} />
    </AppShell>
  );
}
