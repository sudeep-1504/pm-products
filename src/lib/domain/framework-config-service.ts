import { prisma } from "@/lib/prisma";
import { getFramework, DEFAULT_WEIGHTED_PARAMETERS } from "./frameworks";

function defaultParametersFor(key: string): string {
  if (key === "weighted") return JSON.stringify(DEFAULT_WEIGHTED_PARAMETERS);
  return "{}";
}

export async function getOrCreateFrameworkConfig(key: string) {
  const existing = await prisma.frameworkConfig.findUnique({ where: { key } });
  if (existing) return existing;

  const framework = getFramework(key); // throws on unknown key
  return prisma.frameworkConfig.create({
    data: { key, name: framework.name, parameters: defaultParametersFor(key) },
  });
}
