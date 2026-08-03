-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "ProductContext" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "llmModel" TEXT NOT NULL DEFAULT 'claude-sonnet-5',
    "confidenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "extractionBatchSize" INTEGER NOT NULL DEFAULT 10,
    "extractionMaxRetries" INTEGER NOT NULL DEFAULT 2,
    "defaultEffortUnit" TEXT NOT NULL DEFAULT 'person_weeks',
    "defaultExportFormat" TEXT NOT NULL DEFAULT 'csv',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backlog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileType" TEXT NOT NULL,
    "rawHeaders" TEXT NOT NULL,
    "columnMapping" TEXT NOT NULL,
    "frameworkKey" TEXT NOT NULL DEFAULT 'rice',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Backlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "backlogId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawFields" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSignal" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "signal" TEXT NOT NULL,
    "valueNumeric" DOUBLE PRECISION,
    "valueText" TEXT,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "rationale" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrameworkConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "effect" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreRun" (
    "id" TEXT NOT NULL,
    "backlogId" TEXT NOT NULL,
    "frameworkConfigId" TEXT NOT NULL,
    "productContextId" TEXT,
    "llmModel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),

    CONSTRAINT "ScoreRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskScore" (
    "id" TEXT NOT NULL,
    "scoreRunId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "frameworkInputsSnapshot" TEXT NOT NULL,
    "math" TEXT NOT NULL DEFAULT '',
    "baseScore" DOUBLE PRECISION NOT NULL,
    "appliedRules" TEXT NOT NULL DEFAULT '[]',
    "finalScore" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "TaskScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "scoreRunId" TEXT,
    "taskId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "FrameworkConfig_key_key" ON "FrameworkConfig"("key");

-- CreateIndex
CREATE INDEX "ScoreRun_backlogId_idx" ON "ScoreRun"("backlogId");

-- CreateIndex
CREATE INDEX "TaskScore_scoreRunId_idx" ON "TaskScore"("scoreRunId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskScore_scoreRunId_taskId_key" ON "TaskScore"("scoreRunId", "taskId");

-- CreateIndex
CREATE INDEX "AuditEvent_scoreRunId_idx" ON "AuditEvent"("scoreRunId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "Backlog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSignal" ADD CONSTRAINT "TaskSignal_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRun" ADD CONSTRAINT "ScoreRun_backlogId_fkey" FOREIGN KEY ("backlogId") REFERENCES "Backlog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRun" ADD CONSTRAINT "ScoreRun_frameworkConfigId_fkey" FOREIGN KEY ("frameworkConfigId") REFERENCES "FrameworkConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreRun" ADD CONSTRAINT "ScoreRun_productContextId_fkey" FOREIGN KEY ("productContextId") REFERENCES "ProductContext"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskScore" ADD CONSTRAINT "TaskScore_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "ScoreRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskScore" ADD CONSTRAINT "TaskScore_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_scoreRunId_fkey" FOREIGN KEY ("scoreRunId") REFERENCES "ScoreRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

