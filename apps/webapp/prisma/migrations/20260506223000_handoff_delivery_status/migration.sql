ALTER TABLE "HandoffAudit"
ADD COLUMN "lastDeliveryStatus" TEXT NOT NULL DEFAULT 'downloaded',
ADD COLUMN "lastDeliveryMessage" TEXT,
ADD COLUMN "lastDeliveryUpdatedAt" TIMESTAMP(3);

CREATE INDEX "HandoffAudit_organizationId_lastDeliveryStatus_idx"
ON "HandoffAudit"("organizationId", "lastDeliveryStatus");
