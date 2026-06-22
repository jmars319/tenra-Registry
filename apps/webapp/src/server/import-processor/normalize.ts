import { db } from "../db";
import { getImportSpecByKey } from "../import-specs";
import { getDefaultOrganization } from "../registry-data";
import { parseCsvTable, validateHeaders } from "./csv";
import { parseCustomers, parseOpeningBalances, parsePaymentHistory, parseRentals, parseUnits } from "./rowParsers";
import { datasetKeys } from "./types";
import type { CsvTable, ImportDatasetKey, ImportDatasetPreview, ImportDryRunResult, ImportIssue, ImportPayloads, NormalizedImport } from "./types";

// CSV normalization boundary
export function normalizeImport(payloads: ImportPayloads): NormalizedImport {
  const issues: ImportIssue[] = [];
  const parsedTables = new Map<ImportDatasetKey, CsvTable>();

  for (const dataset of datasetKeys) {
    const text = payloads[dataset]?.trim();

    if (!text) {
      continue;
    }

    const spec = getImportSpecByKey(dataset);
    if (!spec) {
      continue;
    }

    const table = parseCsvTable(dataset, text, issues);
    validateHeaders(dataset, spec, table, issues);
    parsedTables.set(dataset, table);
  }

  return {
    customers: parseCustomers(parsedTables.get("customers")?.rows ?? [], issues),
    units: parseUnits(parsedTables.get("units")?.rows ?? [], issues),
    rentals: parseRentals(parsedTables.get("rentals")?.rows ?? [], issues),
    openingBalances: parseOpeningBalances(parsedTables.get("opening-balances")?.rows ?? [], issues),
    paymentHistory: parsePaymentHistory(parsedTables.get("payment-history")?.rows ?? [], issues),
    issues
  };
}

export function getDatasetPreview(key: ImportDatasetKey, rowCount: number): ImportDatasetPreview {
  const spec = getImportSpecByKey(key);

  return {
    key,
    title: spec?.title ?? key,
    rowCount,
    createCount: rowCount
  };
}

// Duplicate detection boundary
export async function addExistingRecordIssues(normalized: NormalizedImport, organizationId: string): Promise<void> {
  const [customers, units, rentals, entries] = await Promise.all([
    normalized.customers.length > 0
      ? db.customer.findMany({
          where: {
            organizationId,
            externalCode: {
              in: normalized.customers.map((row) => row.customerCode)
            }
          },
          select: {
            externalCode: true
          }
        })
      : [],
    normalized.units.length > 0
      ? db.asset.findMany({
          where: {
            organizationId,
            OR: [
              {
                externalCode: {
                  in: normalized.units.map((row) => row.unitCode)
                }
              },
              {
                assetCode: {
                  in: normalized.units.map((row) => row.unitCode)
                }
              }
            ]
          },
          select: {
            assetCode: true,
            externalCode: true
          }
        })
      : [],
    normalized.rentals.length > 0
      ? db.assignment.findMany({
          where: {
            organizationId,
            externalCode: {
              in: normalized.rentals.map((row) => row.rentalCode)
            }
          },
          select: {
            externalCode: true
          }
        })
      : [],
    normalized.openingBalances.length > 0 || normalized.paymentHistory.length > 0
      ? db.receivableEntry.findMany({
          where: {
            organizationId,
            externalCode: {
              in: [
                ...normalized.openingBalances.map((row) => row.entryCode),
                ...normalized.paymentHistory.map((row) => row.paymentCode)
              ]
            }
          },
          select: {
            externalCode: true
          }
        })
      : []
  ]);
  const existingCustomers = new Set(customers.map((customer) => customer.externalCode).filter(Boolean));
  const existingUnits = new Set(units.flatMap((unit) => [unit.externalCode, unit.assetCode]).filter(Boolean));
  const existingRentals = new Set(rentals.map((rental) => rental.externalCode).filter(Boolean));
  const existingEntries = new Set(entries.map((entry) => entry.externalCode).filter(Boolean));

  normalized.customers.forEach((row) => {
    if (existingCustomers.has(row.customerCode)) {
      normalized.issues.push({
        dataset: "customers",
        field: "customer_code",
        message: `Customer ${row.customerCode} already exists.`
      });
    }
  });
  normalized.units.forEach((row) => {
    if (existingUnits.has(row.unitCode)) {
      normalized.issues.push({
        dataset: "units",
        field: "unit_code",
        message: `Unit ${row.unitCode} already exists.`
      });
    }
  });
  normalized.rentals.forEach((row) => {
    if (existingRentals.has(row.rentalCode)) {
      normalized.issues.push({
        dataset: "rentals",
        field: "rental_code",
        message: `Rental ${row.rentalCode} already exists.`
      });
    }
  });
  normalized.openingBalances.forEach((row) => {
    if (existingEntries.has(row.entryCode)) {
      normalized.issues.push({
        dataset: "opening-balances",
        field: "entry_code",
        message: `Opening balance ${row.entryCode} already exists.`
      });
    }
  });
  normalized.paymentHistory.forEach((row) => {
    if (existingEntries.has(row.paymentCode)) {
      normalized.issues.push({
        dataset: "payment-history",
        field: "payment_code",
        message: `Payment ${row.paymentCode} already exists.`
      });
    }
  });
}

// Cross-reference boundary
export async function addCrossReferenceIssues(normalized: NormalizedImport, organizationId: string): Promise<void> {
  const fileCustomerCodes = new Set(normalized.customers.map((row) => row.customerCode));
  const fileUnitCodes = new Set(normalized.units.map((row) => row.unitCode));
  const fileRentalCodes = new Set(normalized.rentals.map((row) => row.rentalCode));
  const neededCustomerCodes = Array.from(
    new Set([
      ...normalized.rentals.map((row) => row.customerCode),
      ...normalized.openingBalances.map((row) => row.customerCode),
      ...normalized.paymentHistory.map((row) => row.customerCode)
    ])
  ).filter((code) => !fileCustomerCodes.has(code));
  const neededUnitCodes = Array.from(
    new Set([
      ...normalized.rentals.map((row) => row.unitCode),
      ...normalized.openingBalances.map((row) => row.unitCode).filter((code): code is string => Boolean(code)),
      ...normalized.paymentHistory.map((row) => row.unitCode).filter((code): code is string => Boolean(code))
    ])
  ).filter((code) => !fileUnitCodes.has(code));
  const neededRentalCodes = Array.from(
    new Set([
      ...normalized.openingBalances.map((row) => row.rentalCode).filter((code): code is string => Boolean(code)),
      ...normalized.paymentHistory.map((row) => row.rentalCode).filter((code): code is string => Boolean(code))
    ])
  ).filter((code) => !fileRentalCodes.has(code));
  const [existingCustomers, existingUnits, existingRentals] = await Promise.all([
    neededCustomerCodes.length > 0
      ? db.customer.findMany({
          where: {
            organizationId,
            externalCode: {
              in: neededCustomerCodes
            }
          },
          select: {
            externalCode: true
          }
        })
      : [],
    neededUnitCodes.length > 0
      ? db.asset.findMany({
          where: {
            organizationId,
            OR: [
              {
                externalCode: {
                  in: neededUnitCodes
                }
              },
              {
                assetCode: {
                  in: neededUnitCodes
                }
              }
            ]
          },
          select: {
            assetCode: true,
            externalCode: true
          }
        })
      : [],
    neededRentalCodes.length > 0
      ? db.assignment.findMany({
          where: {
            organizationId,
            externalCode: {
              in: neededRentalCodes
            }
          },
          select: {
            externalCode: true
          }
        })
      : []
  ]);
  const customerCodes = new Set([...fileCustomerCodes, ...existingCustomers.map((customer) => customer.externalCode).filter(Boolean)]);
  const unitCodes = new Set([...fileUnitCodes, ...existingUnits.flatMap((unit) => [unit.externalCode, unit.assetCode]).filter(Boolean)]);
  const rentalCodes = new Set([...fileRentalCodes, ...existingRentals.map((rental) => rental.externalCode).filter(Boolean)]);

  normalized.rentals.forEach((row) => {
    if (!customerCodes.has(row.customerCode)) {
      normalized.issues.push({
        dataset: "rentals",
        field: "customer_code",
        message: `Customer ${row.customerCode} was not found in the files or existing Registry records.`
      });
    }
    if (!unitCodes.has(row.unitCode)) {
      normalized.issues.push({
        dataset: "rentals",
        field: "unit_code",
        message: `Unit ${row.unitCode} was not found in the files or existing Registry records.`
      });
    }
  });
  normalized.openingBalances.forEach((row) => {
    if (!customerCodes.has(row.customerCode)) {
      normalized.issues.push({
        dataset: "opening-balances",
        field: "customer_code",
        message: `Customer ${row.customerCode} was not found in the files or existing Registry records.`
      });
    }
    if (row.unitCode && !unitCodes.has(row.unitCode)) {
      normalized.issues.push({
        dataset: "opening-balances",
        field: "unit_code",
        message: `Unit ${row.unitCode} was not found in the files or existing Registry records.`
      });
    }
    if (row.rentalCode && !rentalCodes.has(row.rentalCode)) {
      normalized.issues.push({
        dataset: "opening-balances",
        field: "rental_code",
        message: `Rental ${row.rentalCode} was not found in the files or existing Registry records.`
      });
    }
  });
  normalized.paymentHistory.forEach((row) => {
    if (!customerCodes.has(row.customerCode)) {
      normalized.issues.push({
        dataset: "payment-history",
        field: "customer_code",
        message: `Customer ${row.customerCode} was not found in the files or existing Registry records.`
      });
    }
    if (row.unitCode && !unitCodes.has(row.unitCode)) {
      normalized.issues.push({
        dataset: "payment-history",
        field: "unit_code",
        message: `Unit ${row.unitCode} was not found in the files or existing Registry records.`
      });
    }
    if (row.rentalCode && !rentalCodes.has(row.rentalCode)) {
      normalized.issues.push({
        dataset: "payment-history",
        field: "rental_code",
        message: `Rental ${row.rentalCode} was not found in the files or existing Registry records.`
      });
    }
  });
}

// Dry-run result boundary
export async function dryRunRegistryImport(payloads: ImportPayloads): Promise<ImportDryRunResult> {
  const organization = await getDefaultOrganization();
  const normalized = normalizeImport(payloads);
  await Promise.all([
    addExistingRecordIssues(normalized, organization.id),
    addCrossReferenceIssues(normalized, organization.id)
  ]);
  const datasets = [
    getDatasetPreview("customers", normalized.customers.length),
    getDatasetPreview("units", normalized.units.length),
    getDatasetPreview("rentals", normalized.rentals.length),
    getDatasetPreview("opening-balances", normalized.openingBalances.length),
    getDatasetPreview("payment-history", normalized.paymentHistory.length)
  ].filter((dataset) => dataset.rowCount > 0);
  const totalRows = datasets.reduce((total, dataset) => total + dataset.rowCount, 0);

  if (totalRows === 0 && normalized.issues.length === 0) {
    normalized.issues.push({
      dataset: "customers",
      message: "Choose at least one populated CSV file."
    });
  }

  return {
    datasets,
    issues: normalized.issues,
    totalRows,
    ready: normalized.issues.length === 0 && totalRows > 0
  };
}
