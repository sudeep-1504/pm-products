import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CLAUDE_MODELS } from "@/lib/ai/types";

export const dynamic = "force-dynamic";

async function getOrCreateConfig() {
  const existing = await prisma.appConfig.findFirst();
  if (existing) return existing;
  return prisma.appConfig.create({ data: {} });
}

export async function GET() {
  const config = await getOrCreateConfig();
  return NextResponse.json({
    config,
    availableModels: CLAUDE_MODELS,
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const config = await getOrCreateConfig();

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
