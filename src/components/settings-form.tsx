"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ModelOption {
  id: string;
  label: string;
}

export function SettingsForm({
  initial,
  availableModels,
  hasApiKey,
}: {
  initial: {
    llmModel: string;
    confidenceThreshold: number;
    extractionBatchSize: number;
    extractionMaxRetries: number;
    defaultEffortUnit: string;
    defaultExportFormat: string;
  };
  availableModels: ModelOption[];
  hasApiKey: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/app-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save settings.");
      toast.success("Settings saved.");
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
          <CardTitle>Model</CardTitle>
          <CardDescription className="text-xs">
            {hasApiKey ? (
              <Badge variant="success">Live extraction (ANTHROPIC_API_KEY configured)</Badge>
            ) : (
              <Badge variant="flag">
                No ANTHROPIC_API_KEY set — extraction runs against a mock provider for local testing
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Provider &amp; model</Label>
            <Select value={form.llmModel} onValueChange={(v) => setForm((f) => ({ ...f, llmModel: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Provider API keys are server-side secrets and are never entered here — configure
              ANTHROPIC_API_KEY as a server environment variable.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extraction parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="threshold">Low-confidence threshold (%)</Label>
            <Input
              id="threshold"
              type="number"
              min={0}
              max={100}
              value={form.confidenceThreshold}
              onChange={(e) => setForm((f) => ({ ...f, confidenceThreshold: Number(e.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="batchSize">Extraction batch size</Label>
            <Input
              id="batchSize"
              type="number"
              min={1}
              max={50}
              value={form.extractionBatchSize}
              onChange={(e) => setForm((f) => ({ ...f, extractionBatchSize: Number(e.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="retries">Max retries per batch</Label>
            <Input
              id="retries"
              type="number"
              min={0}
              max={5}
              value={form.extractionMaxRetries}
              onChange={(e) => setForm((f) => ({ ...f, extractionMaxRetries: Number(e.target.value) }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Default effort unit</Label>
            <Select
              value={form.defaultEffortUnit}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultEffortUnit: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="person_weeks">Person-weeks</SelectItem>
                <SelectItem value="fibonacci">Fibonacci points</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Default export format</Label>
            <Select
              value={form.defaultExportFormat}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultExportFormat: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
