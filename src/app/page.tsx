import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [backlogs, productContext] = await Promise.all([
    prisma.backlog.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { tasks: true } }, scoreRuns: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    prisma.productContext.findFirst({ where: { isActive: true } }),
  ]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Backlogs</h1>
            <p className="text-sm text-muted-foreground">
              Ingest a backlog, extract signals, score it, commit a ranked list.
            </p>
          </div>
          <Button asChild>
            <Link href="/backlogs/new">New Backlog</Link>
          </Button>
        </div>

        {!productContext && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <p className="text-sm">
                No product context set yet. Extraction quality depends on it — set it up before your first run.
              </p>
              <Button variant="outline" asChild>
                <Link href="/product-context">Set up product context</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {backlogs.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No backlogs yet. Upload a CSV or XLSX to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {backlogs.map((b) => {
              const run = b.scoreRuns[0];
              const href = run ? `/backlogs/${b.id}/ranked` : `/backlogs/${b.id}/review`;
              return (
                <Link key={b.id} href={href}>
                  <Card className="h-full transition-colors hover:bg-muted">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-foreground normal-case tracking-normal text-sm font-medium">
                        {b.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">{b._count.tasks} tasks</p>
                      {run ? (
                        <Badge variant={run.status === "committed" ? "success" : "muted"}>
                          {run.status === "committed" ? "Committed" : "Draft run"}
                        </Badge>
                      ) : (
                        <Badge variant="flag">Needs review</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
