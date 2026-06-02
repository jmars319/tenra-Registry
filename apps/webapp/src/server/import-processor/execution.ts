import { normalizeReceivableAmount } from "@registry/domain";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { getCsvHeader, getImportSpecByKey, registryImportSpecs } from "../import-specs";
import { getDefaultOrganization } from "../registry-data";
import { dateToIsoDate, dateToIsoDateTime, parseDateOnly } from "./csv";
import { dryRunRegistryImport, normalizeImport } from "./normalize";
import type { ImportBatchListItem, ImportDatasetKey, ImportPayloads, NormalizedImport } from "./types";

export function getSummary(normalized: NormalizedImport): Record<string, number> {
  return {
    customers: normalized.customers.length,
    units: normalized.units.length,
    rentals: normalized.rentals.length,
    openingBalances: normalized.openingBalances.length,
    paymentHistory: normalized.paymentHistory.length
  };
}

export async function findCustomerId(transaction: Prisma.TransactionClient, organizationId: string, customerCode: string): Promise<string> {
  const customer = await transaction.customer.findFirst({
    where: {
      organizationId,
      externalCode: customerCode
    },
    select: {
      id: true
    }
  });

  if (!customer) {
    throw new Error(`Customer ${customerCode} was not found during import execution.`);
  }

  return customer.id;
}

export async function findAssetId(transaction: Prisma.TransactionClient, organizationId: string, unitCode: string): Promise<string> {
  const asset = await transaction.asset.findFirst({
    where: {
      organizationId,
      OR: [
        {
          externalCode: unitCode
        },
        {
          assetCode: unitCode
        }
      ]
    },
    select: {
      id: true
    }
  });

  if (!asset) {
    throw new Error(`Unit ${unitCode} was not found during import execution.`);
  }

  return asset.id;
}

export async function findAssignmentId(
  transaction: Prisma.TransactionClient,
  organizationId: string,
  rentalCode: string
): Promise<string> {
  const assignment = await transaction.assignment.findFirst({
    where: {
      organizationId,
      externalCode: rentalCode
    },
    select: {
      id: true
    }
  });

  if (!assignment) {
    throw new Error(`Rental ${rentalCode} was not found during import execution.`);
  }

  return assignment.id;
}

export async function executeRegistryImport(payloads: ImportPayloads): Promise<ImportBatchListItem> {
  const organization = await getDefaultOrganization();
  const dryRun = await dryRunRegistryImport(payloads);

  if (!dryRun.ready) {
    throw new Error("Import cannot be executed until the dry run has no errors.");
  }

  const normalized = normalizeImport(payloads);

  const batch = await db.$transaction(async (transaction) => {
    const importBatch = await transaction.importBatch.create({
      data: {
        organizationId: organization.id,
        label: `Registry import ${new Date().toLocaleString("en-US")}`,
        summary: getSummary(normalized)
      }
    });

    for (const row of normalized.customers) {
      const customer = await transaction.customer.create({
        data: {
          organizationId: organization.id,
          externalCode: row.customerCode,
          name: row.name,
          companyName: row.companyName ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          billingStreet1: row.billingStreet1 ?? null,
          billingStreet2: row.billingStreet2 ?? null,
          billingCity: row.billingCity ?? null,
          billingState: row.billingState ?? null,
          billingPostalCode: row.billingPostalCode ?? null,
          notes: row.notes ?? null,
          status: "ACTIVE"
        }
      });
      await transaction.importRecord.create({
        data: {
          batchId: importBatch.id,
          dataset: "customers",
          sourceKey: row.customerCode,
          targetModel: "Customer",
          targetId: customer.id
        }
      });
    }

    for (const row of normalized.units) {
      const asset = await transaction.asset.create({
        data: {
          organizationId: organization.id,
          externalCode: row.unitCode,
          assetCode: row.unitCode,
          name: row.name,
          category: "UNIT",
          status: row.status.toUpperCase() as "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "ARCHIVED",
          currentLocation: row.currentLocation ?? null,
          homeLocation: row.homeLocation ?? null,
          sizeLabel: row.sizeLabel ?? null,
          unitType: row.unitType ?? null,
          condition: row.condition ?? null,
          notes: row.notes ?? null
        }
      });
      await transaction.importRecord.create({
        data: {
          batchId: importBatch.id,
          dataset: "units",
          sourceKey: row.unitCode,
          targetModel: "Asset",
          targetId: asset.id
        }
      });
    }

    for (const row of normalized.rentals) {
      const customerId = await findCustomerId(transaction, organization.id, row.customerCode);
      const assetId = await findAssetId(transaction, organization.id, row.unitCode);
      const assignment = await transaction.assignment.create({
        data: {
          organizationId: organization.id,
          externalCode: row.rentalCode,
          customerId,
          assetId,
          startDate: parseDateOnly(row.startDate),
          billingCadence: row.billingCadence.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM",
          rateInCents: row.rateInCents,
          status: "ACTIVE",
          siteName: row.siteName ?? null,
          siteStreet1: row.siteStreet1 ?? null,
          siteStreet2: row.siteStreet2 ?? null,
          siteCity: row.siteCity ?? null,
          siteState: row.siteState ?? null,
          sitePostalCode: row.sitePostalCode ?? null,
          deliveredOn: row.deliveredOn ? parseDateOnly(row.deliveredOn) : null,
          placementNotes: row.placementNotes ?? null
        }
      });
      await transaction.asset.update({
        where: {
          id: assetId
        },
        data: {
          status: "ASSIGNED"
        }
      });
      await transaction.importRecord.create({
        data: {
          batchId: importBatch.id,
          dataset: "rentals",
          sourceKey: row.rentalCode,
          targetModel: "Assignment",
          targetId: assignment.id
        }
      });
    }

    for (const row of normalized.openingBalances) {
      const customerId = await findCustomerId(transaction, organization.id, row.customerCode);
      const assetId = row.unitCode ? await findAssetId(transaction, organization.id, row.unitCode) : null;
      const assignmentId = row.rentalCode ? await findAssignmentId(transaction, organization.id, row.rentalCode) : null;
      const entry = await transaction.receivableEntry.create({
        data: {
          organizationId: organization.id,
          externalCode: row.entryCode,
          customerId,
          assignmentId,
          assetId,
          type: row.type.toUpperCase() as "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND",
          status: "POSTED",
          description: row.description,
          effectiveDate: parseDateOnly(row.effectiveDate),
          dueDate: row.dueDate ? parseDateOnly(row.dueDate) : null,
          amountInCents: normalizeReceivableAmount(row.type, row.amountInCents),
          paymentMethod: row.paymentMethod ?? null,
          reference: row.reference ?? row.entryCode,
          notes: row.notes ?? "Imported opening balance."
        }
      });
      await transaction.importRecord.create({
        data: {
          batchId: importBatch.id,
          dataset: "opening-balances",
          sourceKey: row.entryCode,
          targetModel: "ReceivableEntry",
          targetId: entry.id
        }
      });
    }

    for (const row of normalized.paymentHistory) {
      const customerId = await findCustomerId(transaction, organization.id, row.customerCode);
      const assetId = row.unitCode ? await findAssetId(transaction, organization.id, row.unitCode) : null;
      const assignmentId = row.rentalCode ? await findAssignmentId(transaction, organization.id, row.rentalCode) : null;
      const entry = await transaction.receivableEntry.create({
        data: {
          organizationId: organization.id,
          externalCode: row.paymentCode,
          customerId,
          assignmentId,
          assetId,
          type: "PAYMENT",
          status: "POSTED",
          description: row.description,
          effectiveDate: parseDateOnly(row.receivedDate),
          dueDate: null,
          amountInCents: normalizeReceivableAmount("payment", row.amountInCents),
          paymentMethod: row.paymentMethod ?? null,
          reference: row.reference ?? row.paymentCode,
          notes: row.notes ?? "Imported payment history."
        }
      });
      await transaction.importRecord.create({
        data: {
          batchId: importBatch.id,
          dataset: "payment-history",
          sourceKey: row.paymentCode,
          targetModel: "ReceivableEntry",
          targetId: entry.id
        }
      });
    }

    return transaction.importBatch.findUniqueOrThrow({
      where: {
        id: importBatch.id
      },
      include: {
        records: true
      }
    });
  });

  return {
    id: batch.id,
    label: batch.label,
    status: batch.status.toLowerCase(),
    summary: batch.summary as Record<string, unknown>,
    createdAt: dateToIsoDateTime(batch.createdAt),
    rolledBackAt: batch.rolledBackAt ? dateToIsoDateTime(batch.rolledBackAt) : undefined,
    recordCount: batch.records.length
  };
}

export async function listImportBatches(): Promise<ImportBatchListItem[]> {
  const organization = await getDefaultOrganization();
  const batches = await db.importBatch.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      records: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 12
  });

  return batches.map((batch) => ({
    id: batch.id,
    label: batch.label,
    status: batch.status.toLowerCase(),
    summary: batch.summary as Record<string, unknown>,
    createdAt: dateToIsoDate(batch.createdAt),
    rolledBackAt: batch.rolledBackAt ? dateToIsoDateTime(batch.rolledBackAt) : undefined,
    recordCount: batch.records.length
  }));
}

export function getRollbackPriority(targetModel: string): number {
  switch (targetModel) {
    case "ReceivableEntry":
      return 0;
    case "Assignment":
      return 1;
    case "Asset":
      return 2;
    case "Customer":
      return 3;
    default:
      return 99;
  }
}

export async function rollbackImportBatch(batchId: string): Promise<void> {
  const organization = await getDefaultOrganization();
  const batch = await db.importBatch.findFirst({
    where: {
      id: batchId,
      organizationId: organization.id
    },
    include: {
      records: true
    }
  });

  if (!batch) {
    throw new Error("Import batch not found.");
  }
  if (batch.status !== "IMPORTED") {
    throw new Error("This import batch has already been rolled back.");
  }

  const records = [...batch.records].sort(
    (left, right) => getRollbackPriority(left.targetModel) - getRollbackPriority(right.targetModel)
  );

  await db.$transaction(async (transaction) => {
    for (const record of records) {
      if (record.targetModel === "ReceivableEntry") {
        await transaction.receivableEntry.deleteMany({
          where: {
            id: record.targetId,
            organizationId: organization.id
          }
        });
      }

      if (record.targetModel === "Assignment") {
        const assignment = await transaction.assignment.findFirst({
          where: {
            id: record.targetId,
            organizationId: organization.id
          },
          select: {
            assetId: true
          }
        });
        await transaction.assignment.deleteMany({
          where: {
            id: record.targetId,
            organizationId: organization.id
          }
        });

        if (assignment) {
          const activeAssignments = await transaction.assignment.count({
            where: {
              assetId: assignment.assetId,
              organizationId: organization.id,
              status: "ACTIVE"
            }
          });

          if (activeAssignments === 0) {
            await transaction.asset.updateMany({
              where: {
                id: assignment.assetId,
                organizationId: organization.id,
                status: "ASSIGNED"
              },
              data: {
                status: "AVAILABLE"
              }
            });
          }
        }
      }

      if (record.targetModel === "Asset") {
        await transaction.asset.deleteMany({
          where: {
            id: record.targetId,
            organizationId: organization.id
          }
        });
      }

      if (record.targetModel === "Customer") {
        await transaction.customer.deleteMany({
          where: {
            id: record.targetId,
            organizationId: organization.id
          }
        });
      }

      await transaction.importRecord.update({
        where: {
          id: record.id
        },
        data: {
          action: "ROLLED_BACK"
        }
      });
    }

    await transaction.importBatch.update({
      where: {
        id: batch.id
      },
      data: {
        status: "ROLLED_BACK",
        rolledBackAt: new Date()
      }
    });
  });
}

export function getBlankCsvHeader(dataset: ImportDatasetKey): string {
  const spec = getImportSpecByKey(dataset) ?? registryImportSpecs.find((candidate) => candidate.key === "customers");

  if (!spec) {
    throw new Error("Import layouts are not configured.");
  }

  return `${getCsvHeader(spec)}\n`;
}
