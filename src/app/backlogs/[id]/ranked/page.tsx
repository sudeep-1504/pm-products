import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RankedList } from "@/components/ranked-list";
import { getScoreRunDetail, getLatestScoreRunForBacklog } from "@/lib/domain/score-run-service";

export const dynamic = "force-dynamic";

export default async function RankedPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id } = await params;
  const { run } = await searchParams;

  const runId = run ?? (await getLatestScoreRunForBacklog(id))?.id;
  if (!runId) notFound();

  const data = await getScoreRunDetail(runId);
  if (!data) notFound();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">{data.backlog.name} — Ranked</h1>
        <p className="text-sm text-muted-foreground">
          Click any row to see the full explanation: signal sources, framework math, applied rules.
        </p>
      </div>
      <RankedList backlogId={id} initial={data} />
    </AppShell>
  );
}
