CREATE TYPE "ImportBatchStatus" AS ENUM ('IMPORTED', 'ROLLED_BACK');
CREATE TYPE "ImportRecordAction" AS ENUM ('CREATED', 'ROLLED_BACK');

ALTER TABLE "Customer" ADD COLUMN "externalCode" TEXT;
ALTER TABLE "Asset" ADD COLUMN "externalCode" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "externalCode" TEXT;
ALTER TABLE "ReceivableEntry" ADD COLUMN "externalCode" TEXT;

CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'IMPORTED',
  "summary" JSONB NOT NULL,
  "rolledBackAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportRecord" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "dataset" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "targetModel" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "action" "ImportRecordAction" NOT NULL DEFAULT 'CREATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ImportRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_organizationId_externalCode_key" ON "Customer"("organizationId", "externalCode");
CREATE UNIQUE INDEX "Asset_organizationId_externalCode_key" ON "Asset"("organizationId", "externalCode");
CREATE UNIQUE INDEX "Assignment_organizationId_externalCode_key" ON "Assignment"("organizationId", "externalCode");
CREATE UNIQUE INDEX "ReceivableEntry_organizationId_externalCode_key" ON "ReceivableEntry"("organizationId", "externalCode");
CREATE INDEX "ImportBatch_organizationId_createdAt_idx" ON "ImportBatch"("organizationId", "createdAt");
CREATE INDEX "ImportBatch_organizationId_status_idx" ON "ImportBatch"("organizationId", "status");
CREATE INDEX "ImportRecord_batchId_dataset_idx" ON "ImportRecord"("batchId", "dataset");
CREATE INDEX "ImportRecord_targetModel_targetId_idx" ON "ImportRecord"("targetModel", "targetId");

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportRecord" ADD CONSTRAINT "ImportRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
