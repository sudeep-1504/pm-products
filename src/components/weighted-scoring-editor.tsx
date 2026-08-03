"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { NUMERIC_SIGNALS, SIGNAL_LABELS, SignalKey } from "@/lib/domain/signals";
import type { WeightedCriterion, WeightedScoringParameters } from "@/lib/domain/frameworks";

export function WeightedScoringEditor({ initial }: { initial: WeightedScoringParameters }) {
  const [criteria, setCriteria] = useState<WeightedCriterion[]>(initial.criteria);
  const [saving, setSaving] = useState(false);

  function updateCriterion(index: number, patch: Partial<WeightedCriterion>) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/framework-config/weighted", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parameters: { criteria } }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      toast.success("Weighted scoring criteria saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {criteria.map((c, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors duration-150 hover:border-border-strong">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label>Signal</Label>
            <Select value={c.signal} onValueChange={(v) => updateCriterion(i, { signal: v as SignalKey })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NUMERIC_SIGNALS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SIGNAL_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-32 flex-col gap-1.5">
            <Label>Weight</Label>
            <Input
              type="number"
              step="0.1"
              value={c.weight}
              onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-5"
            onClick={() => setCriteria((prev) => prev.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCriteria((prev) => [...prev, { signal: "value", weight: 1 }])}
        >
          <Plus className="size-4" /> Add criterion
        </Button>
        <Button onClick={handleSave} disabled={saving || criteria.length === 0}>
          {saving ? "Saving..." : "Save criteria"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Score = sum(weight x normalised signal value). Negative weights penalize (e.g. effort).
        Normalisation uses fixed assumed ranges per signal, not batch-relative min/max — see README.
      </p>
    </div>
  );
}
