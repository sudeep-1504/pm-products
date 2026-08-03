"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { SIGNAL_LABELS, SignalKey, SignalValue } from "@/lib/domain/signals";
import { FRAMEWORK_LIST } from "@/lib/domain/frameworks";
import type { BacklogReviewData } from "@/lib/domain/backlog-service";

type TaskRow = BacklogReviewData["tasks"][number];

const SOURCE_BADGE_VARIANT: Record<string, "csv" | "ai" | "human"> = {
  csv: "csv",
  ai: "ai",
  human: "human",
};

export function ReviewTable({
  backlogId,
  initialData,
}: {
  backlogId: string;
  initialData: BacklogReviewData;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState<{ taskId: string; signal: SignalKey } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [switchingFramework, setSwitchingFramework] = useState(false);
  const [pendingFramework, setPendingFramework] = useState(data.framework.key);
  const parentRef = useRef<HTMLDivElement>(null);

  // useVirtualizer returns functions the React Compiler can't safely memoize,
  // so it skips optimizing this component. Safe here: the returned values
  // (getVirtualItems/getTotalSize) stay local to this render and are never
  // passed into a memoized child.
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: data.tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  const totalLowConfidence = useMemo(
    () =>
      data.tasks.reduce(
        (sum, t) =>
          sum +
          t.completeness.lowConfidence.filter((s) => !dismissed.has(`${t.id}:${s}`)).length,
        0
      ),
    [data.tasks, dismissed]
  );

  async function refetch() {
    const res = await fetch(`/api/backlogs/${backlogId}`);
    if (res.ok) setData(await res.json());
  }

  async function switchFramework() {
    if (pendingFramework === data.framework.key) return;
    setSwitchingFramework(true);
    try {
      const res = await fetch(`/api/backlogs/${backlogId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameworkKey: pendingFramework }),
      });
      if (!res.ok) throw new Error("Failed to switch framework.");
      toast.success(
        "Framework switched. Signals are reused — any new required signal shows up as a gap below."
      );
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to switch framework.");
    } finally {
      setSwitchingFramework(false);
    }
  }

  async function runExtraction() {
    setExtracting(true);
    try {
      const res = await fetch(`/api/backlogs/${backlogId}/extract`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Extraction failed.");
      toast.success(
        body.isMock
          ? `Mock extraction complete (no ANTHROPIC_API_KEY set): ${body.signalsWritten} signals filled.`
          : `Extraction complete: ${body.signalsWritten} signals filled across ${body.tasksProcessed} tasks.`
      );
      if (body.failedTaskIds?.length) {
        toast.error(`${body.failedTaskIds.length} tasks failed extraction after retries.`);
      }
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extraction failed.");
    } finally {
      setExtracting(false);
    }
  }

  function acceptAllAI() {
    const next = new Set(dismissed);
    for (const t of data.tasks) {
      for (const s of t.completeness.lowConfidence) next.add(`${t.id}:${s}`);
    }
    setDismissed(next);
    toast.success("Low-confidence flags acknowledged.");
  }

  async function runScoring() {
    setScoring(true);
    try {
      const res = await fetch(`/api/backlogs/${backlogId}/score`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Scoring failed.");
      router.push(`/backlogs/${backlogId}/ranked?run=${body.scoreRunId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scoring failed.");
    } finally {
      setScoring(false);
    }
  }

  async function saveEdit(task: TaskRow, signal: SignalKey, raw: string) {
    const isCategory = signal === "category";
    const payload = isCategory
      ? { signal, valueText: raw }
      : { signal, valueNumeric: raw.trim() === "" ? null : Number(raw) };

    if (!isCategory && raw.trim() !== "" && !Number.isFinite(Number(raw))) {
      toast.error("Enter a number.");
      return;
    }

    // Optimistic update
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== task.id) return t;
        const idx = prev.displaySignals.indexOf(signal);
        const newSignals = [...t.signals];
        const newValue: SignalValue = {
          signal,
          valueNumeric: isCategory ? null : raw.trim() === "" ? null : Number(raw),
          valueText: isCategory ? raw : null,
          source: "human",
          confidence: null,
          rationale: "Human override.",
        };
        newSignals[idx] = newValue;
        const gaps = t.completeness.gaps.filter((g) => g !== signal);
        const lowConfidence = t.completeness.lowConfidence.filter((g) => g !== signal);
        return {
          ...t,
          signals: newSignals,
          completeness: { gaps, lowConfidence, isComplete: gaps.length === 0 },
        };
      }),
    }));
    setEditing(null);

    try {
      const res = await fetch(`/api/backlogs/${backlogId}/tasks/${task.id}/signals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save edit.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save edit.");
      await refetch();
    }
  }

  const totalGaps = data.tasks.reduce((sum, t) => sum + t.completeness.gaps.length, 0);
  const totalTasks = data.tasks.length;
  const resolvedFraction =
    totalTasks === 0 ? 0 : ((totalTasks * data.displaySignals.length - totalGaps) /
      (totalTasks * data.displaySignals.length)) * 100;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm shadow-foreground/[0.03]">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Framework</span>
        <Select value={pendingFramework} onValueChange={setPendingFramework}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FRAMEWORK_LIST.map((f) => (
              <SelectItem key={f.key} value={f.key}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pendingFramework !== data.framework.key && (
          <Button size="sm" onClick={switchFramework} disabled={switchingFramework}>
            {switchingFramework ? "Switching..." : "Switch (reuses signals)"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm shadow-foreground/[0.03]">
        <div className="flex items-center gap-3">
          <Button onClick={runExtraction} disabled={extracting} variant="outline">
            {extracting ? "Running extraction..." : "Run AI Extraction"}
          </Button>
          <Button onClick={acceptAllAI} variant="ghost" disabled={totalLowConfidence === 0}>
            Bulk accept AI ({totalLowConfidence} flagged)
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1 w-48">
            <span className="text-xs text-muted-foreground font-mono">
              {totalGaps === 0 ? "All signals resolved" : `${totalGaps} gap(s) blocking`}
            </span>
            <Progress value={resolvedFraction} />
          </div>
          {data.canScore ? (
            <ShimmerButton onClick={runScoring} disabled={scoring}>
              {scoring ? "Scoring..." : "Run Scoring"}
            </ShimmerButton>
          ) : (
            <Button disabled>Run Scoring</Button>
          )}
        </div>
      </div>

      <div ref={parentRef} className="max-h-[70vh] overflow-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm font-mono">
          <thead className="sticky top-0 z-10 bg-background">
            <tr className="border-b border-border">
              <th className="w-12 px-2 py-2 text-left text-[11px] uppercase text-muted-foreground">#</th>
              <th className="min-w-56 px-2 py-2 text-left text-[11px] uppercase text-muted-foreground">Title</th>
              {data.displaySignals.map((s) => (
                <th key={s} className="min-w-32 px-2 py-2 text-left text-[11px] uppercase text-muted-foreground">
                  {SIGNAL_LABELS[s]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ height: rowVirtualizer.getTotalSize(), position: "relative", display: "block" }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const task = data.tasks[virtualRow.index];
              return (
                <tr
                  key={task.id}
                  className="absolute left-0 flex w-full border-b border-border transition-colors duration-150 hover:bg-muted"
                  style={{ transform: `translateY(${virtualRow.start}px)`, height: virtualRow.size }}
                >
                  <td className="w-12 px-2 py-2 text-muted-foreground">{task.rowIndex + 1}</td>
                  <td className="min-w-56 flex-1 truncate px-2 py-2" title={task.description}>
                    {task.title}
                  </td>
                  {data.displaySignals.map((signal, i) => {
                    const value = task.signals[i];
                    const isGap = task.completeness.gaps.includes(signal);
                    const isLow =
                      task.completeness.lowConfidence.includes(signal) &&
                      !dismissed.has(`${task.id}:${signal}`);
                    const isEditing = editing?.taskId === task.id && editing.signal === signal;

                    return (
                      <td key={signal} className="min-w-32 px-2 py-1.5">
                        {isEditing ? (
                          <Input
                            autoFocus
                            defaultValue={value ? (value.valueText ?? value.valueNumeric ?? "") : ""}
                            className="h-7 w-24 text-xs"
                            onBlur={(e) => saveEdit(task, signal, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          <button
                            className={`flex items-center gap-1.5 rounded-md border px-1.5 py-1 text-left transition-colors duration-150 ${
                              isGap
                                ? "border-gap/40 bg-gap-soft"
                                : isLow
                                  ? "border-flag/40 bg-flag-soft"
                                  : "border-transparent hover:border-border-strong"
                            }`}
                            onClick={() => setEditing({ taskId: task.id, signal })}
                          >
                            {isGap ? (
                              <Badge variant="gap">GAP</Badge>
                            ) : (
                              <>
                                <span>{value?.valueText ?? value?.valueNumeric ?? "—"}</span>
                                {value && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span>
                                        <Badge variant={SOURCE_BADGE_VARIANT[value.source] ?? "muted"}>
                                          {value.source}
                                          {value.source === "ai" && value.confidence !== null
                                            ? ` ${Math.round(value.confidence)}%`
                                            : ""}
                                        </Badge>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{value.rationale || "No rationale recorded."}</TooltipContent>
                                  </Tooltip>
                                )}
                                {isLow && <Badge variant="flag">LOW</Badge>}
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
