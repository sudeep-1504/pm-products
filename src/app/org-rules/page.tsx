import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { OrgRulesManager } from "@/components/org-rules-manager";

export const dynamic = "force-dynamic";

export default async function OrgRulesPage() {
  const rules = await prisma.orgRule.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Org Rules</h1>
        <p className="text-sm text-muted-foreground">
          Post-scoring pass. Precedence: override beats floor/cap, which beats boost/penalty, which
          beats the base framework score. Every applied rule is logged and shown in explainability.
        </p>
      </div>
      <OrgRulesManager
        initial={rules.map((r) => ({
          id: r.id,
          name: r.name,
          condition: JSON.parse(r.condition),
          ruleType: r.ruleType as "override" | "floor_cap" | "boost_penalty",
          effect: JSON.parse(r.effect),
          enabled: r.enabled,
        }))}
      />
    </AppShell>
  );
}
