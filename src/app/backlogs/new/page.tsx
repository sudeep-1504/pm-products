import { AppShell } from "@/components/app-shell";
import { ImportWizard } from "@/components/import-wizard";

export default function NewBacklogPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">New Backlog</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV or XLSX, confirm the column mapping, then run AI extraction.
        </p>
      </div>
      <ImportWizard />
    </AppShell>
  );
}
