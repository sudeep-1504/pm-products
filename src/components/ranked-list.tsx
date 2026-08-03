"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { SIGNAL_LABELS, SignalKey } from "@/lib/domain/signals";
import type { ScoreRunDetail } from "@/lib/domain/score-run-service";

type RankedTask = ScoreRunDetail["rankedTasks"][number];

export function RankedList({ backlogId, initial }: { backlogId: string; initial: ScoreRunDetail }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState<RankedTask | null>(null);
  const [committing, setCommitting] = useState(false);

  async function handleCommit() {
    setCommitting(true);
    try {
      const res = await fetch(`/api/score-runs/${data.scoreRun.id}/commit`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to commit.");
      toast.success("Rank committed.");
      setData((d) => ({ ...d, scoreRun: { ...d.scoreRun, status: "committed" } }));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to commit.");
    } finally {
      setCommitting(false);
    }
  }

  const categoryOf = (t: RankedTask) => t.allSignals.find((s) => s.signal === "category")?.valueText;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-2 border-border p-3">
        <div className="flex items-center gap-2">
          <Badge variant={data.scoreRun.status === "committed" ? "success" : "muted"}>
            {data.scoreRun.status === "committed" ? "Committed" : "Draft"}
          </Badge>
          <span className="font-mono text-xs text-muted-foreground">
            {data.scoreRun.framework.name} · {data.scoreRun.llmModel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/score-runs/${data.scoreRun.id}/export?format=csv`}>Export CSV</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/api/score-runs/${data.scoreRun.id}/export?format=json`}>Export JSON</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/backlogs/${backlogId}/review`}>Back to review</a>
          </Button>
          {data.scoreRun.status !== "committed" && (
            <Button onClick={handleCommit} disabled={committing}>
              {committing ? "Committing..." : "Commit rank"}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border-2 border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Rank</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rankedTasks.map((t) => (
              <TableRow key={t.taskId} className="cursor-pointer" onClick={() => setSelected(t)}>
                <TableCell className="font-semibold">#{t.rank}</TableCell>
                <TableCell className="max-w-md truncate">{t.title}</TableCell>
                <TableCell>
                  {categoryOf(t) ? <Badge variant="muted">{categoryOf(t)}</Badge> : "—"}
                </TableCell>
                <TableCell className="text-right font-semibold">{t.finalScore.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  #{selected.rank} — {selected.title}
                </SheetTitle>
                <SheetDescription>{selected.description || "No description."}</SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 overflow-y-auto py-4 font-mono text-sm">
                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Signals
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {selected.allSignals.map((s) => (
                      <div key={s.signal} className="flex items-center justify-between border-b border-border pb-1.5">
                        <span>{SIGNAL_LABELS[s.signal as SignalKey] ?? s.signal}</span>
                        <div className="flex items-center gap-2">
                          <span>{s.valueText ?? s.valueNumeric ?? "—"}</span>
                          <Badge variant={s.source === "human" ? "human" : s.source === "csv" ? "csv" : "ai"}>
                            {s.source}
                            {s.source === "ai" && s.confidence !== null ? ` ${Math.round(s.confidence)}%` : ""}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Framework math
                  </h3>
                  <p className="border-2 border-border p-2">{selected.math}</p>
                  <p className="mt-2 text-muted-foreground">Base score: {selected.baseScore.toFixed(3)}</p>
                </section>

                <section>
                  <h3 className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Org rules applied
                  </h3>
                  {selected.appliedRules.length === 0 ? (
                    <p className="text-muted-foreground">
                      None. The org rules engine ships in a later phase — every task is ranked on
                      framework score alone for now.
                    </p>
                  ) : (
                    <pre className="whitespace-pre-wrap">{JSON.stringify(selected.appliedRules, null, 2)}</pre>
                  )}
                </section>

                <section className="border-t-2 border-border pt-3">
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Final score</span>
                    <span>{selected.finalScore.toFixed(3)}</span>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
