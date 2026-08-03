import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { CLAUDE_MODELS } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let config = await prisma.appConfig.findFirst();
  if (!config) {
    config = await prisma.appConfig.create({ data: {} });
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Every product configuration lives here — no config files, no code edits.
        </p>
      </div>
      <SettingsForm
        initial={{
          llmModel: config.llmModel,
          confidenceThreshold: config.confidenceThreshold,
          extractionBatchSize: config.extractionBatchSize,
          extractionMaxRetries: config.extractionMaxRetries,
          defaultEffortUnit: config.defaultEffortUnit,
          defaultExportFormat: config.defaultExportFormat,
        }}
        availableModels={[...CLAUDE_MODELS]}
        hasApiKey={Boolean(process.env.ANTHROPIC_API_KEY)}
      />
    </AppShell>
  );
}
