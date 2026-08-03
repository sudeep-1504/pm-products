-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaskScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoreRunId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "frameworkInputsSnapshot" TEXT NOT NULL,
    "math" TEXT NOT NULL DEFAULT '',
    "baseScore" REAL NOT NULL,
    "appliedRules" TEXT NOT NULL DEFAULT '[]',
    "finalScore" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    CONSTRAINT "TaskScore_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "ScoreRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskScore_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TaskScore" ("appliedRules", "baseScore", "finalScore", "frameworkInputsSnapshot", "id", "rank", "scoreRunId", "taskId") SELECT "appliedRules", "baseScore", "finalScore", "frameworkInputsSnapshot", "id", "rank", "scoreRunId", "taskId" FROM "TaskScore";
DROP TABLE "TaskScore";
ALTER TABLE "new_TaskScore" RENAME TO "TaskScore";
CREATE INDEX "TaskScore_scoreRunId_idx" ON "TaskScore"("scoreRunId");
CREATE UNIQUE INDEX "TaskScore_scoreRunId_taskId_key" ON "TaskScore"("scoreRunId", "taskId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
