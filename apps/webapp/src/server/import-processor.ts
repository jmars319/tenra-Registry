import type { AssetStatus, BillingCadence, ReceivableEntryType } from "@registry/domain";
import { normalizeReceivableAmount } from "@registry/domain";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import {
  getCsvHeader,
  getImportSpecByKey,
  registryImportSpecs,
  type RegistryImportSpec
} from "./import-specs";
import { getDefaultOrganization } from "./registry-data";

export type ImportDatasetKey = "customers" | "units" | "rentals" | "opening-balances" | "payment-history";
export type ImportPayloads = Partial<Record<ImportDatasetKey, string>>;

export interface ImportIssue {
  dataset: ImportDatasetKey;
  row?: number | undefined;
  field?: string | undefined;
  message: string;
}

export interface ImportDatasetPreview {
  key: ImportDatasetKey;
  title: string;
  rowCount: number;
  createCount: number;
}

export interface ImportDryRunResult {
  datasets: ImportDatasetPreview[];
  issues: ImportIssue[];
  totalRows: number;
  ready: boolean;
}

export interface ImportBatchListItem {
  id: string;
  label: string;
  status: string;
  summary: Record<string, unknown>;
  createdAt: string;
  rolledBackAt?: string | undefined;
  recordCount: number;
}

interface CsvTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

interface CustomerImportRow {
  customerCode: string;
  name: string;
  companyName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  billingStreet1?: string | undefined;
  billingStreet2?: string | undefined;
  billingCity?: string | undefined;
  billingState?: string | undefined;
  billingPostalCode?: string | undefined;
  notes?: string | undefined;
}

interface UnitImportRow {
  unitCode: string;
  name: string;
  sizeLabel?: string | undefined;
  unitType?: string | undefined;
  condition?: string | undefined;
  homeLocation?: string | undefined;
  currentLocation?: string | undefined;
  status: AssetStatus;
  notes?: string | undefined;
}

interface RentalImportRow {
  rentalCode: string;
  customerCode: string;
  unitCode: string;
  startDate: string;
  billingCadence: BillingCadence;
  rateInCents: number;
  siteName?: string | undefined;
  siteStreet1?: string | undefined;
  siteStreet2?: string | undefined;
  siteCity?: string | undefined;
  siteState?: string | undefined;
  sitePostalCode?: string | undefined;
  deliveredOn?: string | undefined;
  placementNotes?: string | undefined;
}

interface OpeningBalanceImportRow {
  entryCode: string;
  customerCode: string;
  rentalCode?: string | undefined;
  unitCode?: string | undefined;
  type: ReceivableEntryType;
  description: string;
  effectiveDate: string;
  dueDate?: string | undefined;
  amountInCents: number;
  paymentMethod?: string | undefined;
  reference?: string | undefined;
  notes?: string | undefined;
}

interface PaymentHistoryImportRow {
  paymentCode: string;
  customerCode: string;
  rentalCode?: string | undefined;
  unitCode?: string | undefined;
  receivedDate: string;
  amountInCents: number;
  paymentMethod?: string | undefined;
  reference?: string | undefined;
  description: string;
  notes?: string | undefined;
}

interface NormalizedImport {
  customers: CustomerImportRow[];
  units: UnitImportRow[];
  rentals: RentalImportRow[];
  openingBalances: OpeningBalanceImportRow[];
  paymentHistory: PaymentHistoryImportRow[];
  issues: ImportIssue[];
}

const datasetKeys = ["customers", "units", "rentals", "opening-balances", "payment-history"] as const satisfies readonly ImportDatasetKey[];
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const allowedAssetStatuses = new Set<AssetStatus>(["available", "assigned", "maintenance", "archived"]);
const allowedCadences = new Set<BillingCadence>(["daily", "weekly", "monthly", "custom"]);
const allowedEntryTypes = new Set<ReceivableEntryType>(["charge", "payment", "credit", "adjustment", "deposit", "refund"]);

function dateToIsoDateTime(value: Date): string {
  return value.toISOString();
}

function dateToIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function normalizeCell(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    rows.push(row);
  }

  return rows;
}

function parseCsvTable(dataset: ImportDatasetKey, text: string, issues: ImportIssue[]): CsvTable {
  const csvRows = parseCsv(text.replace(/^\uFEFF/u, ""));
  const [headerRow, ...bodyRows] = csvRows;

  if (!headerRow) {
    issues.push({
      dataset,
      message: "CSV is empty."
    });

    return {
      headers: [],
      rows: []
    };
  }

  const headers = headerRow.map((header) => header.trim());
  const rows = bodyRows.map((bodyRow) =>
    Object.fromEntries(headers.map((header, index) => [header, bodyRow[index]?.trim() ?? ""]))
  );

  return {
    headers,
    rows
  };
}

function validateHeaders(dataset: ImportDatasetKey, spec: RegistryImportSpec, table: CsvTable, issues: ImportIssue[]): void {
  const headerSet = new Set(table.headers);

  for (const field of spec.fields) {
    if (field.required && !headerSet.has(field.key)) {
      issues.push({
        dataset,
        field: field.key,
        message: `Missing required column ${field.key}.`
      });
    }
  }
}

function addRequiredIssue(
  issues: ImportIssue[],
  dataset: ImportDatasetKey,
  row: number,
  field: string
): void {
  issues.push({
    dataset,
    field,
    row,
    message: `${field} is required.`
  });
}

function validateUniqueCodes(
  issues: ImportIssue[],
  dataset: ImportDatasetKey,
  rows: Array<Record<string, string>>,
  field: string
): void {
  const seen = new Map<string, number>();

  rows.forEach((row, index) => {
    const value = normalizeCell(row[field]);

    if (!value) {
      return;
    }

    const existingRow = seen.get(value);

    if (existingRow !== undefined) {
      issues.push({
        dataset,
        field,
        row: index + 2,
        message: `${field} duplicates row ${existingRow}.`
      });
      return;
    }

    seen.set(value, index + 2);
  });
}

function parseCurrency(value: string | undefined): number | null {
  const normalized = value?.replace(/[$,]/gu, "").trim();

  if (!normalized) {
    return null;
  }

  const dollars = Number.parseFloat(normalized);

  if (Number.isNaN(dollars)) {
    return null;
  }

  return Math.round(dollars * 100);
}

function parseCustomers(rows: Array<Record<string, string>>, issues: ImportIssue[]): CustomerImportRow[] {
  validateUniqueCodes(issues, "customers", rows, "customer_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const customerCode = normalizeCell(row.customer_code);
    const name = normalizeCell(row.name);

    if (!customerCode) {
      addRequiredIssue(issues, "customers", rowNumber, "customer_code");
    }
    if (!name) {
      addRequiredIssue(issues, "customers", rowNumber, "name");
    }
    if (!customerCode || !name) {
      return [];
    }

    return [{
      customerCode,
      name,
      companyName: normalizeCell(row.company_name),
      email: normalizeCell(row.email),
      phone: normalizeCell(row.phone),
      billingStreet1: normalizeCell(row.billing_street_1),
      billingStreet2: normalizeCell(row.billing_street_2),
      billingCity: normalizeCell(row.billing_city),
      billingState: normalizeCell(row.billing_state),
      billingPostalCode: normalizeCell(row.billing_postal_code),
      notes: normalizeCell(row.notes)
    }];
  });
}

function parseUnits(rows: Array<Record<string, string>>, issues: ImportIssue[]): UnitImportRow[] {
  validateUniqueCodes(issues, "units", rows, "unit_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const unitCode = normalizeCell(row.unit_code);
    const name = normalizeCell(row.name);
    const status = (normalizeCell(row.status) ?? "available").toLowerCase() as AssetStatus;

    if (!unitCode) {
      addRequiredIssue(issues, "units", rowNumber, "unit_code");
    }
    if (!name) {
      addRequiredIssue(issues, "units", rowNumber, "name");
    }
    if (!allowedAssetStatuses.has(status)) {
      issues.push({
        dataset: "units",
        field: "status",
        row: rowNumber,
        message: "status must be available, assigned, maintenance, or archived."
      });
    }
    if (!unitCode || !name || !allowedAssetStatuses.has(status)) {
      return [];
    }

    return [{
      unitCode,
      name,
      sizeLabel: normalizeCell(row.size_label),
      unitType: normalizeCell(row.unit_type),
      condition: normalizeCell(row.condition),
      homeLocation: normalizeCell(row.home_location),
      currentLocation: normalizeCell(row.current_location),
      status,
      notes: normalizeCell(row.notes)
    }];
  });
}

function parseRentals(rows: Array<Record<string, string>>, issues: ImportIssue[]): RentalImportRow[] {
  validateUniqueCodes(issues, "rentals", rows, "rental_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const rentalCode = normalizeCell(row.rental_code);
    const customerCode = normalizeCell(row.customer_code);
    const unitCode = normalizeCell(row.unit_code);
    const startDate = normalizeCell(row.start_date);
    const billingCadence = (normalizeCell(row.billing_cadence) ?? "").toLowerCase() as BillingCadence;
    const rateInCents = parseCurrency(row.rate);

    for (const field of ["rental_code", "customer_code", "unit_code", "start_date", "billing_cadence", "rate"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "rentals", rowNumber, field);
      }
    }
    if (startDate && !datePattern.test(startDate)) {
      issues.push({
        dataset: "rentals",
        field: "start_date",
        row: rowNumber,
        message: "start_date must be YYYY-MM-DD."
      });
    }
    if (!allowedCadences.has(billingCadence)) {
      issues.push({
        dataset: "rentals",
        field: "billing_cadence",
        row: rowNumber,
        message: "billing_cadence must be daily, weekly, monthly, or custom."
      });
    }
    if (rateInCents === null) {
      issues.push({
        dataset: "rentals",
        field: "rate",
        row: rowNumber,
        message: "rate must be a dollar amount."
      });
    }
    if (!rentalCode || !customerCode || !unitCode || !startDate || !datePattern.test(startDate) || !allowedCadences.has(billingCadence) || rateInCents === null) {
      return [];
    }

    return [{
      rentalCode,
      customerCode,
      unitCode,
      startDate,
      billingCadence,
      rateInCents,
      siteName: normalizeCell(row.site_name),
      siteStreet1: normalizeCell(row.site_street_1),
      siteStreet2: normalizeCell(row.site_street_2),
      siteCity: normalizeCell(row.site_city),
      siteState: normalizeCell(row.site_state),
      sitePostalCode: normalizeCell(row.site_postal_code),
      deliveredOn: normalizeCell(row.delivered_on),
      placementNotes: normalizeCell(row.placement_notes)
    }];
  });
}

function parseOpeningBalances(rows: Array<Record<string, string>>, issues: ImportIssue[]): OpeningBalanceImportRow[] {
  validateUniqueCodes(issues, "opening-balances", rows, "entry_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const entryCode = normalizeCell(row.entry_code);
    const customerCode = normalizeCell(row.customer_code);
    const type = (normalizeCell(row.type) ?? "").toLowerCase() as ReceivableEntryType;
    const description = normalizeCell(row.description);
    const effectiveDate = normalizeCell(row.effective_date);
    const dueDate = normalizeCell(row.due_date);
    const amountInCents = parseCurrency(row.amount);

    for (const field of ["entry_code", "customer_code", "type", "description", "effective_date", "amount"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "opening-balances", rowNumber, field);
      }
    }
    if (!allowedEntryTypes.has(type)) {
      issues.push({
        dataset: "opening-balances",
        field: "type",
        row: rowNumber,
        message: "type must be charge, payment, credit, adjustment, deposit, or refund."
      });
    }
    if (effectiveDate && !datePattern.test(effectiveDate)) {
      issues.push({
        dataset: "opening-balances",
        field: "effective_date",
        row: rowNumber,
        message: "effective_date must be YYYY-MM-DD."
      });
    }
    if (dueDate && !datePattern.test(dueDate)) {
      issues.push({
        dataset: "opening-balances",
        field: "due_date",
        row: rowNumber,
        message: "due_date must be YYYY-MM-DD."
      });
    }
    if (amountInCents === null) {
      issues.push({
        dataset: "opening-balances",
        field: "amount",
        row: rowNumber,
        message: "amount must be a dollar amount."
      });
    }
    if (!entryCode || !customerCode || !description || !effectiveDate || !allowedEntryTypes.has(type) || !datePattern.test(effectiveDate) || (dueDate && !datePattern.test(dueDate)) || amountInCents === null) {
      return [];
    }

    return [{
      entryCode,
      customerCode,
      rentalCode: normalizeCell(row.rental_code),
      unitCode: normalizeCell(row.unit_code),
      type,
      description,
      effectiveDate,
      dueDate,
      amountInCents,
      paymentMethod: normalizeCell(row.payment_method),
      reference: normalizeCell(row.reference),
      notes: normalizeCell(row.notes)
    }];
  });
}

function parsePaymentHistory(rows: Array<Record<string, string>>, issues: ImportIssue[]): PaymentHistoryImportRow[] {
  validateUniqueCodes(issues, "payment-history", rows, "payment_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const paymentCode = normalizeCell(row.payment_code);
    const customerCode = normalizeCell(row.customer_code);
    const receivedDate = normalizeCell(row.received_date);
    const amountInCents = parseCurrency(row.amount);

    for (const field of ["payment_code", "customer_code", "received_date", "amount"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "payment-history", rowNumber, field);
      }
    }
    if (receivedDate && !datePattern.test(receivedDate)) {
      issues.push({
        dataset: "payment-history",
        field: "received_date",
        row: rowNumber,
        message: "received_date must be YYYY-MM-DD."
      });
    }
    if (amountInCents === null) {
      issues.push({
        dataset: "payment-history",
        field: "amount",
        row: rowNumber,
        message: "amount must be a dollar amount."
      });
    }
    if (!paymentCode || !customerCode || !receivedDate || !datePattern.test(receivedDate) || amountInCents === null) {
      return [];
    }

    return [{
      paymentCode,
      customerCode,
      rentalCode: normalizeCell(row.rental_code),
      unitCode: normalizeCell(row.unit_code),
      receivedDate,
      amountInCents,
      paymentMethod: normalizeCell(row.payment_method),
      reference: normalizeCell(row.reference),
      description: normalizeCell(row.description) ?? "Payment received",
      notes: normalizeCell(row.notes)
    }];
  });
}

function normalizeImport(payloads: ImportPayloads): NormalizedImport {
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

function getDatasetPreview(key: ImportDatasetKey, rowCount: number): ImportDatasetPreview {
  const spec = getImportSpecByKey(key);

  return {
    key,
    title: spec?.title ?? key,
    rowCount,
    createCount: rowCount
  };
}

async function addExistingRecordIssues(normalized: NormalizedImport, organizationId: string): Promise<void> {
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

async function addCrossReferenceIssues(normalized: NormalizedImport, organizationId: string): Promise<void> {
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

function getSummary(normalized: NormalizedImport): Record<string, number> {
  return {
    customers: normalized.customers.length,
    units: normalized.units.length,
    rentals: normalized.rentals.length,
    openingBalances: normalized.openingBalances.length,
    paymentHistory: normalized.paymentHistory.length
  };
}

async function findCustomerId(transaction: Prisma.TransactionClient, organizationId: string, customerCode: string): Promise<string> {
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

async function findAssetId(transaction: Prisma.TransactionClient, organizationId: string, unitCode: string): Promise<string> {
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

async function findAssignmentId(
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

function getRollbackPriority(targetModel: string): number {
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
