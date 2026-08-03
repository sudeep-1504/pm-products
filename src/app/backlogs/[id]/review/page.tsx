import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReviewTable } from "@/components/review-table";
import { getBacklogReviewData } from "@/lib/domain/backlog-service";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBacklogReviewData(id);
  if (!data) notFound();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">{data.backlog.name}</h1>
        <p className="text-sm text-muted-foreground">
          {data.framework.name} needs {data.framework.requiredSignals.join(", ")}. Resolve every gap
          before scoring — low-confidence values are editable but non-blocking.
        </p>
      </div>
      <ReviewTable backlogId={id} initialData={data} />
    </AppShell>
  );
}
