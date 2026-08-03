-- CreateTable
CREATE TABLE "ProductContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productDescription" TEXT NOT NULL,
    "goals" TEXT NOT NULL,
    "okrs" TEXT NOT NULL,
    "northStarMetric" TEXT NOT NULL,
    "supportingMetrics" TEXT NOT NULL,
    "priorityAreas" TEXT NOT NULL,
    "targetSegments" TEXT NOT NULL,
    "constraints" TEXT NOT NULL DEFAULT '',
    "freeText" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "llmProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "llmModel" TEXT NOT NULL DEFAULT 'claude-sonnet-5',
    "confidenceThreshold" REAL NOT NULL DEFAULT 70,
    "extractionBatchSize" INTEGER NOT NULL DEFAULT 10,
    "extractionMaxRetries" INTEGER NOT NULL DEFAULT 2,
    "defaultEffortUnit" TEXT NOT NULL DEFAULT 'person_weeks',
    "defaultExportFormat" TEXT NOT NULL DEFAULT 'csv',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Backlog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileType" TEXT NOT NULL,
    "rawHeaders" TEXT NOT NULL,
    "columnMapping" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backlogId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawFields" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "Backlog" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskSignal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "valueNumeric" REAL,
    "valueText" TEXT,
    "source" TEXT NOT NULL,
    "confidence" REAL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TaskSignal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FrameworkConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "parameters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrgRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ScoreRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backlogId" TEXT NOT NULL,
    "frameworkConfigId" TEXT NOT NULL,
    "productContextId" TEXT,
    "llmModel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" DATETIME,
    CONSTRAINT "ScoreRun_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "Backlog" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScoreRun_frameworkConfigId_fkey" FOREIGN KEY ("frameworkConfigId") REFERENCES "FrameworkConfig" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScoreRun_productContextId_fkey" FOREIGN KEY ("productContextId") REFERENCES "ProductContext" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoreRunId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "frameworkInputsSnapshot" TEXT NOT NULL,
    "baseScore" REAL NOT NULL,
    "appliedRules" TEXT NOT NULL DEFAULT '[]',
    "finalScore" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    CONSTRAINT "TaskScore_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "ScoreRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskScore_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoreRunId" TEXT,
    "taskId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "ScoreRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProductContext_version_idx" ON "ProductContext"("version");

-- CreateIndex
CREATE INDEX "Task_backlogId_idx" ON "Task"("backlogId");

-- CreateIndex
CREATE INDEX "TaskSignal_taskId_idx" ON "TaskSignal"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSignal_taskId_signal_key" ON "TaskSignal"("taskId", "signal");

-- CreateIndex
CREATE INDEX "ScoreRun_backlogId_idx" ON "ScoreRun"("backlogId");

-- CreateIndex
CREATE INDEX "TaskScore_scoreRunId_idx" ON "TaskScore"("scoreRunId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskScore_scoreRunId_taskId_key" ON "TaskScore"("scoreRunId", "taskId");

-- CreateIndex
CREATE INDEX "AuditEvent_scoreRunId_idx" ON "AuditEvent"("scoreRunId");
