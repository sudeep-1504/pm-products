"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Pencil } from "lucide-react";
import { effectSummary } from "@/lib/domain/org-rules";
import type { ConditionField, ConditionOperator, RuleType, RuleEffect } from "@/lib/domain/org-rules";

interface RuleDTO {
  id: string;
  name: string;
  condition: { field: ConditionField; operator: ConditionOperator; value: string };
  ruleType: RuleType;
  effect: RuleEffect;
  enabled: boolean;
}

interface FormState {
  name: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string;
  ruleType: RuleType;
  percentileMode: "floor" | "cap";
  percentile: number;
  factor: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  field: "category",
  operator: "equals",
  value: "",
  ruleType: "override",
  percentileMode: "floor",
  percentile: 90,
  factor: 0.5,
};

function formToEffect(form: FormState): RuleEffect {
  if (form.ruleType === "override") return { mode: "override" };
  if (form.ruleType === "floor_cap") return { mode: form.percentileMode, percentile: form.percentile };
  return { mode: "multiply", factor: form.factor };
}

function ruleToForm(rule: RuleDTO): FormState {
  const effect = rule.effect;
  return {
    name: rule.name,
    field: rule.condition.field,
    operator: rule.condition.operator,
    value: rule.condition.value,
    ruleType: rule.ruleType,
    percentileMode: effect.mode === "floor" || effect.mode === "cap" ? effect.mode : "floor",
    percentile: effect.mode === "floor" || effect.mode === "cap" ? effect.percentile : 90,
    factor: effect.mode === "multiply" ? effect.factor : 0.5,
  };
}

function RuleFields({ form, onChange }: { form: FormState; onChange: (form: FormState) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Name</Label>
        <Input value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} placeholder="e.g. Fraud always wins" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Field</Label>
          <Select value={form.field} onValueChange={(v) => onChange({ ...form, field: v as ConditionField, operator: v === "keyword" ? "contains" : form.operator })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="keyword">Keyword (title/description/category)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Operator</Label>
          <Select value={form.operator} onValueChange={(v) => onChange({ ...form, operator: v as ConditionOperator })} disabled={form.field === "keyword"}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Equals</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Value</Label>
          <Input value={form.value} onChange={(e) => onChange({ ...form, value: e.target.value })} placeholder="fraud" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Rule type</Label>
        <Select value={form.ruleType} onValueChange={(v) => onChange({ ...form, ruleType: v as RuleType })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="override">Override (hard pin to top)</SelectItem>
            <SelectItem value="floor_cap">Floor / Cap (percentile bound)</SelectItem>
            <SelectItem value="boost_penalty">Boost / Penalty (multiplier)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.ruleType === "floor_cap" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Mode</Label>
            <Select value={form.percentileMode} onValueChange={(v) => onChange({ ...form, percentileMode: v as "floor" | "cap" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floor">Floor (minimum)</SelectItem>
                <SelectItem value="cap">Cap (maximum)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Percentile</Label>
            <Input type="number" min={0} max={100} value={form.percentile} onChange={(e) => onChange({ ...form, percentile: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {form.ruleType === "boost_penalty" && (
        <div className="flex flex-col gap-1.5 max-w-40">
          <Label>Multiplier</Label>
          <Input type="number" step="0.05" value={form.factor} onChange={(e) => onChange({ ...form, factor: Number(e.target.value) })} />
        </div>
      )}
    </div>
  );
}

export function OrgRulesManager({ initial }: { initial: RuleDTO[] }) {
  const [rules, setRules] = useState<RuleDTO[]>(initial);
  const [newForm, setNewForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<RuleDTO | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function refetch() {
    const res = await fetch("/api/org-rules");
    if (res.ok) setRules((await res.json()).rules);
  }

  async function handleCreate() {
    if (!newForm.name.trim() || !newForm.value.trim()) {
      toast.error("Name and condition value are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/org-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newForm.name,
          condition: { field: newForm.field, operator: newForm.operator, value: newForm.value },
          ruleType: newForm.ruleType,
          effect: formToEffect(newForm),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create rule.");
      toast.success("Rule created.");
      setNewForm(EMPTY_FORM);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(rule: RuleDTO) {
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
    const res = await fetch(`/api/org-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    if (!res.ok) {
      toast.error("Failed to update rule.");
      await refetch();
    }
  }

  async function handleDelete(rule: RuleDTO) {
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    const res = await fetch(`/api/org-rules/${rule.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete rule.");
      await refetch();
    } else {
      toast.success("Rule deleted.");
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/org-rules/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          condition: { field: editForm.field, operator: editForm.operator, value: editForm.value },
          ruleType: editForm.ruleType,
          effect: formToEffect(editForm),
        }),
      });
      if (!res.ok) throw new Error("Failed to save rule.");
      toast.success("Rule updated.");
      setEditing(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save rule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>New rule</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RuleFields form={newForm} onChange={setNewForm} />
          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={saving}>
              Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {rules.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No rules yet. Framework math alone can&apos;t express &quot;fraud always wins&quot; — add a rule above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Effect</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch checked={rule.enabled} onCheckedChange={() => toggleEnabled(rule)} />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {rule.condition.field} {rule.condition.operator} &quot;{rule.condition.value}&quot;
                    </TableCell>
                    <TableCell>{rule.ruleType.replace("_", "/")}</TableCell>
                    <TableCell>{effectSummary(rule.effect)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(rule);
                            setEditForm(ruleToForm(rule));
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit rule</DialogTitle>
          </DialogHeader>
          <RuleFields form={editForm} onChange={setEditForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
