"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MAPPABLE_FIELDS, MappableField } from "@/lib/domain/column-mapping";

type Mapping = Record<MappableField, string | null>;

interface PreviewData {
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  suggestedMapping: Mapping;
}

const FIELD_LABELS: Record<MappableField, string> = {
  title: "Title (required)",
  description: "Description",
  reach: "Reach",
  value: "Value",
  impact: "Impact",
  effort: "Effort",
  confidence: "Confidence",
  urgency: "Urgency",
  risk: "Risk",
  category: "Category",
};

export function ImportWizard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [name, setName] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setName(f.name.replace(/\.(csv|xlsx|xls)$/i, ""));
    setLoadingPreview(true);
    setPreview(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("/api/backlogs/preview", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to parse file.");
      setPreview(body);
      setMapping(body.suggestedMapping);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file.");
      setFile(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  async function handleCreate() {
    if (!file || !mapping || !name.trim()) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name.trim());
      form.append("columnMapping", JSON.stringify(mapping));
      const res = await fetch("/api/backlogs", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create backlog.");
      toast.success("Backlog created.");
      router.push(`/backlogs/${body.backlogId}/review`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create backlog.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="py-10">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-12 text-center transition-colors ${
              isDragActive ? "border-foreground bg-muted" : "border-border"
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="size-8" />
            <p className="text-sm font-medium">
              {loadingPreview ? "Parsing..." : "Drop a CSV or XLSX here, or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">Max 15MB, 5000 rows.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 normal-case tracking-normal text-sm">
            <FileSpreadsheet className="size-4" />
            {file?.name} — {preview.rowCount} rows
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 max-w-sm">
            <Label htmlFor="backlogName">Backlog name</Label>
            <Input id="backlogName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Source column</TableHead>
                  <TableHead>Sample value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MAPPABLE_FIELDS.map((field) => (
                  <TableRow key={field}>
                    <TableCell className="font-medium">{FIELD_LABELS[field]}</TableCell>
                    <TableCell>
                      <Select
                        value={mapping?.[field] ?? "__none__"}
                        onValueChange={(v) =>
                          setMapping((m) => (m ? { ...m, [field]: v === "__none__" ? null : v } : m))
                        }
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— none —</SelectItem>
                          {preview.headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-muted-foreground">
                      {mapping?.[field] ? preview.sampleRows[0]?.[mapping[field] as string] : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Framework</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <span className="font-mono font-semibold">RICE</span> — (Reach x Impact x Confidence) / Effort.
            Phase 1 ships RICE only; more frameworks read the same signal layer later.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => { setFile(null); setPreview(null); }}>
          Choose a different file
        </Button>
        <Button onClick={handleCreate} disabled={submitting || !mapping?.title || !name.trim()}>
          {submitting ? "Creating..." : "Create backlog"}
        </Button>
      </div>
    </div>
  );
}
