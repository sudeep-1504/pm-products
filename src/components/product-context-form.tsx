"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TagListInput } from "@/components/tag-list-input";
import { Plus, Trash2 } from "lucide-react";
import { OkrEntry, ProductContextData } from "@/lib/domain/product-context";

export function ProductContextForm({ initial }: { initial: ProductContextData & { version?: number } }) {
  const router = useRouter();
  const [form, setForm] = useState<ProductContextData>(initial);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ProductContextData>(key: K, value: ProductContextData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateOkr(index: number, patch: Partial<OkrEntry>) {
    const next = [...form.okrs];
    next[index] = { ...next[index], ...patch };
    update("okrs", next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/product-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to save.");
      }
      toast.success("Product context saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Product</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">What the product does</Label>
            <Textarea
              id="description"
              value={form.productDescription}
              onChange={(e) => update("productDescription", e.target.value)}
              placeholder="Short description of the product and who it serves."
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Goals / themes</Label>
            <TagListInput values={form.goals} onChange={(v) => update("goals", v)} placeholder="Add a goal, press Enter" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nsm">North star metric</Label>
              <Input
                id="nsm"
                value={form.northStarMetric}
                onChange={(e) => update("northStarMetric", e.target.value)}
                placeholder="The one metric this product moves"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Supporting input metrics</Label>
              <TagListInput
                values={form.supportingMetrics}
                onChange={(v) => update("supportingMetrics", v)}
                placeholder="Add a metric, press Enter"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Priority areas</Label>
              <TagListInput
                values={form.priorityAreas}
                onChange={(v) => update("priorityAreas", v)}
                placeholder="e.g. security, fraud, compliance"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Target segments</Label>
              <TagListInput
                values={form.targetSegments}
                onChange={(v) => update("targetSegments", v)}
                placeholder="Add a segment, press Enter"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>OKRs</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => update("okrs", [...form.okrs, { objective: "", keyResults: [] }])}
          >
            <Plus className="size-4" /> Add OKR
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {form.okrs.length === 0 && (
            <p className="text-sm text-muted-foreground">No OKRs yet.</p>
          )}
          {form.okrs.map((okr, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors duration-150 hover:border-border-strong">
              <div className="flex items-center gap-2">
                <Input
                  value={okr.objective}
                  onChange={(e) => updateOkr(i, { objective: e.target.value })}
                  placeholder="Objective"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => update("okrs", form.okrs.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <TagListInput
                values={okr.keyResults}
                onChange={(v) => updateOkr(i, { keyResults: v })}
                placeholder="Add a key result, press Enter"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional context</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="constraints">Constraints</Label>
            <Textarea
              id="constraints"
              value={form.constraints}
              onChange={(e) => update("constraints", e.target.value)}
              rows={2}
              placeholder="Known constraints (compliance, platform, timeline...)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="freeText">Free-text notes</Label>
            <Textarea
              id="freeText"
              value={form.freeText}
              onChange={(e) => update("freeText", e.target.value)}
              rows={4}
              placeholder="Anything else that grounds a task's value that doesn't fit the fields above."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {initial.version ? `Current version: ${initial.version}. Saving creates version ${initial.version + 1}.` : "Saving creates version 1."}
        </p>
        <Button onClick={handleSave} disabled={saving || !form.productDescription.trim()}>
          {saving ? "Saving..." : "Save product context"}
        </Button>
      </div>
    </div>
  );
}
