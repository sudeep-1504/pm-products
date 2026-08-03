"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface ProviderStatus {
  id: string;
  label: string;
  models: readonly { id: string; label: string }[] | null;
  modelPlaceholder: string | null;
  configured: boolean;
}

export function SettingsForm({
  initial,
  providers,
}: {
  initial: {
    llmProvider: string;
    llmModel: string;
    confidenceThreshold: number;
    extractionBatchSize: number;
    extractionMaxRetries: number;
    defaultEffortUnit: string;
    defaultExportFormat: string;
  };
  providers: ProviderStatus[];
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const selectedProvider = providers.find((p) => p.id === form.llmProvider) ?? providers[0];

  function handleProviderChange(providerId: string) {
    const provider = providers.find((p) => p.id === providerId);
    setForm((f) => ({
      ...f,
      llmProvider: providerId,
      // Switching into a fixed-model-list provider: default to its first
      // model unless the current value already belongs to that list.
      llmModel: provider?.models?.some((m) => m.id === f.llmModel)
        ? f.llmModel
        : (provider?.models?.[0]?.id ?? ""),
    }));
  }

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
            {selectedProvider?.configured ? (
              <Badge variant="success">
                Live extraction ({selectedProvider.id === "ollama" ? "OLLAMA_BASE_URL" : `${selectedProvider.id.toUpperCase()}_API_KEY`} configured)
              </Badge>
            ) : (
              <Badge variant="flag">
                {selectedProvider?.id === "ollama"
                  ? "No OLLAMA_BASE_URL set"
                  : `No ${selectedProvider?.id.toUpperCase()}_API_KEY set`}{" "}
                — extraction runs against a mock provider for local testing
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Provider</Label>
            <Select value={form.llmProvider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Model</Label>
            {selectedProvider?.models ? (
              <Select value={form.llmModel} onValueChange={(v) => setForm((f) => ({ ...f, llmModel: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={form.llmModel}
                onChange={(e) => setForm((f) => ({ ...f, llmModel: e.target.value }))}
                placeholder={selectedProvider?.modelPlaceholder ?? "Model ID"}
              />
            )}
            {!selectedProvider?.models && (
              <p className="text-xs text-muted-foreground">
                {selectedProvider?.id === "ollama"
                  ? "Whatever model you've pulled locally (ollama pull <name>) — this app doesn't maintain a fixed list since it's unbounded and instance-specific."
                  : "Typed freely rather than a fixed dropdown, since this provider's model catalog changes faster than this app can track — use the exact model ID from the provider's docs."}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Provider API keys are server-side secrets and are never entered here — configure them
              as server environment variables (see README).
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
