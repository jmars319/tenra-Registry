CREATE TABLE "HandoffAudit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "exportId" TEXT NOT NULL,
    "schema" TEXT NOT NULL,
    "targetApp" TEXT NOT NULL,
    "subjectId" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "payloadSummary" JSONB NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 1,
    "firstExportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastExportedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandoffAudit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HandoffAudit_organizationId_exportId_key" ON "HandoffAudit"("organizationId", "exportId");
CREATE INDEX "HandoffAudit_organizationId_lastExportedAt_idx" ON "HandoffAudit"("organizationId", "lastExportedAt");
CREATE INDEX "HandoffAudit_organizationId_targetApp_idx" ON "HandoffAudit"("organizationId", "targetApp");

ALTER TABLE "HandoffAudit" ADD CONSTRAINT "HandoffAudit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
