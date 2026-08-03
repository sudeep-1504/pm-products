import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROVIDER_CATALOG, PROVIDER_IDS } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

async function getOrCreateConfig() {
  const existing = await prisma.appConfig.findFirst();
  if (existing) return existing;
  return prisma.appConfig.create({ data: {} });
}

function providerStatus() {
  return Object.values(PROVIDER_CATALOG).map((p) => ({
    id: p.id,
    label: p.label,
    models: p.models ?? null,
    modelPlaceholder: p.modelPlaceholder ?? null,
    // Ollama has no key — it's "configured" once OLLAMA_BASE_URL is set, same
    // server-side-only rule as every other provider's secret.
    configured: p.apiKeyEnvVar ? Boolean(process.env[p.apiKeyEnvVar]) : Boolean(process.env.OLLAMA_BASE_URL),
  }));
}

export async function GET() {
  const config = await getOrCreateConfig();
  return NextResponse.json({
    config,
    providers: providerStatus(),
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const config = await getOrCreateConfig();

  if (body.llmProvider !== undefined && !PROVIDER_IDS.includes(body.llmProvider)) {
    return NextResponse.json({ error: `Unknown provider: ${body.llmProvider}` }, { status: 400 });
  }

  const updated = await prisma.appConfig.update({
    where: { id: config.id },
    data: {
      llmProvider: body.llmProvider ?? undefined,
      llmModel: body.llmModel ?? undefined,
      confidenceThreshold:
        typeof body.confidenceThreshold === "number" ? body.confidenceThreshold : undefined,
      extractionBatchSize:
        typeof body.extractionBatchSize === "number" ? body.extractionBatchSize : undefined,
      extractionMaxRetries:
        typeof body.extractionMaxRetries === "number" ? body.extractionMaxRetries : undefined,
      defaultEffortUnit: body.defaultEffortUnit ?? undefined,
      defaultExportFormat: body.defaultExportFormat ?? undefined,
    },
  });

  return NextResponse.json({ config: updated });
}
