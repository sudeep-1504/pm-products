import { AppShell } from "@/components/app-shell";
import { WeightedScoringEditor } from "@/components/weighted-scoring-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FRAMEWORK_LIST } from "@/lib/domain/frameworks";
import { getOrCreateFrameworkConfig } from "@/lib/domain/framework-config-service";

export const dynamic = "force-dynamic";

export default async function FrameworkConfigPage() {
  const weightedConfig = await getOrCreateFrameworkConfig("weighted");
  const weightedParameters = JSON.parse(weightedConfig.parameters);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Framework Config</h1>
        <p className="text-sm text-muted-foreground">
          Framework selection happens per backlog (import wizard, or switch it on the review screen).
          This screen holds framework-level parameters — currently just Weighted Scoring&apos;s criteria
          and weights, since every other framework&apos;s math is fixed.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Weighted Scoring criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <WeightedScoringEditor initial={weightedParameters} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All frameworks</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {FRAMEWORK_LIST.map((f) => (
              <div key={f.key} className="border-b border-border pb-2 last:border-0">
                <p className="text-sm font-semibold">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
