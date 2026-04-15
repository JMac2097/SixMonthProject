-- CreateTable
CREATE TABLE "ConnectionProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "credentials" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "trelloConnectionId" TEXT NOT NULL,
    "trelloBoardId" TEXT NOT NULL,
    "trelloListIds" JSONB NOT NULL,
    "trelloLabelIds" JSONB,
    "gitlabConnectionId" TEXT NOT NULL,
    "gitlabProjectId" INTEGER NOT NULL,
    "gitlabProjectPath" TEXT,
    "gitlabDefaultLabels" JSONB NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "descriptionTemplate" TEXT NOT NULL,
    "includeTrelloLabels" BOOLEAN NOT NULL DEFAULT true,
    "fixedLabels" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rule_trelloConnectionId_fkey" FOREIGN KEY ("trelloConnectionId") REFERENCES "ConnectionProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rule_gitlabConnectionId_fkey" FOREIGN KEY ("gitlabConnectionId") REFERENCES "ConnectionProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "SyncRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SyncItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "syncRunId" TEXT NOT NULL,
    "trelloCardId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "gitlabIssueIid" INTEGER,
    "gitlabIssueUrl" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SyncItem_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CardIssueLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trelloCardId" TEXT NOT NULL,
    "gitlabConnectionId" TEXT NOT NULL,
    "gitlabProjectId" INTEGER NOT NULL,
    "gitlabIssueIid" INTEGER NOT NULL,
    "gitlabIssueUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "SyncRun_ruleId_startedAt_idx" ON "SyncRun"("ruleId", "startedAt");

-- CreateIndex
CREATE INDEX "SyncItem_syncRunId_idx" ON "SyncItem"("syncRunId");

-- CreateIndex
CREATE INDEX "SyncItem_trelloCardId_idx" ON "SyncItem"("trelloCardId");

-- CreateIndex
CREATE INDEX "CardIssueLink_gitlabConnectionId_gitlabProjectId_idx" ON "CardIssueLink"("gitlabConnectionId", "gitlabProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CardIssueLink_trelloCardId_gitlabConnectionId_gitlabProjectId_key" ON "CardIssueLink"("trelloCardId", "gitlabConnectionId", "gitlabProjectId");
