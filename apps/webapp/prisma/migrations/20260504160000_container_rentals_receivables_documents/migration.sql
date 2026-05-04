-- CreateEnum
CREATE TYPE "ReceivableEntryType" AS ENUM ('CHARGE', 'PAYMENT', 'CREDIT', 'ADJUSTMENT', 'DEPOSIT', 'REFUND');

-- CreateEnum
CREATE TYPE "ReceivableEntryStatus" AS ENUM ('POSTED', 'VOID');

-- CreateEnum
CREATE TYPE "DocumentTemplateType" AS ENUM ('RENTAL_AGREEMENT', 'DELIVERY_TICKET', 'PICKUP_TICKET', 'CONDITION_REPORT', 'PAYMENT_RECEIPT', 'ACCOUNT_STATEMENT', 'PAST_DUE_NOTICE', 'DEPOSIT_RECEIPT', 'GENERAL_LETTER');

-- AlterTable
ALTER TABLE "Asset"
ADD COLUMN "homeLocation" TEXT,
ADD COLUMN "sizeLabel" TEXT,
ADD COLUMN "unitType" TEXT,
ADD COLUMN "condition" TEXT;

-- AlterTable
ALTER TABLE "Assignment"
ADD COLUMN "siteName" TEXT,
ADD COLUMN "siteStreet1" TEXT,
ADD COLUMN "siteStreet2" TEXT,
ADD COLUMN "siteCity" TEXT,
ADD COLUMN "siteState" TEXT,
ADD COLUMN "sitePostalCode" TEXT,
ADD COLUMN "deliveryScheduledFor" DATE,
ADD COLUMN "deliveredOn" DATE,
ADD COLUMN "pickupRequestedOn" DATE,
ADD COLUMN "pickedUpOn" DATE,
ADD COLUMN "placementNotes" TEXT;

-- CreateTable
CREATE TABLE "ReceivableEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "assetId" TEXT,
    "type" "ReceivableEntryType" NOT NULL,
    "status" "ReceivableEntryStatus" NOT NULL DEFAULT 'POSTED',
    "description" TEXT NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "dueDate" DATE,
    "amountInCents" INTEGER NOT NULL,
    "paymentMethod" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceivableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "DocumentTemplateType" NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "mergeFields" TEXT[],
    "printEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceivableEntry_organizationId_effectiveDate_idx" ON "ReceivableEntry"("organizationId", "effectiveDate");

-- CreateIndex
CREATE INDEX "ReceivableEntry_customerId_status_idx" ON "ReceivableEntry"("customerId", "status");

-- CreateIndex
CREATE INDEX "ReceivableEntry_assignmentId_status_idx" ON "ReceivableEntry"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "ReceivableEntry_assetId_status_idx" ON "ReceivableEntry"("assetId", "status");

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_type_idx" ON "DocumentTemplate"("organizationId", "type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_organizationId_active_idx" ON "DocumentTemplate"("organizationId", "active");

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivableEntry" ADD CONSTRAINT "ReceivableEntry_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
