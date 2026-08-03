/*
  Warnings:

  - You are about to drop the column `isActive` on the `FrameworkConfig` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Backlog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileType" TEXT NOT NULL,
    "rawHeaders" TEXT NOT NULL,
    "columnMapping" TEXT NOT NULL,
    "frameworkKey" TEXT NOT NULL DEFAULT 'rice',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Backlog" ("columnMapping", "createdAt", "id", "name", "rawHeaders", "sourceFileName", "sourceFileType", "updatedAt") SELECT "columnMapping", "createdAt", "id", "name", "rawHeaders", "sourceFileName", "sourceFileType", "updatedAt" FROM "Backlog";
DROP TABLE "Backlog";
ALTER TABLE "new_Backlog" RENAME TO "Backlog";
CREATE TABLE "new_FrameworkConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FrameworkConfig" ("createdAt", "id", "key", "name", "parameters", "updatedAt") SELECT "createdAt", "id", "key", "name", "parameters", "updatedAt" FROM "FrameworkConfig";
DROP TABLE "FrameworkConfig";
ALTER TABLE "new_FrameworkConfig" RENAME TO "FrameworkConfig";
CREATE UNIQUE INDEX "FrameworkConfig_key_key" ON "FrameworkConfig"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
