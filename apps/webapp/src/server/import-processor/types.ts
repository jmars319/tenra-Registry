import type { AssetStatus, BillingCadence, ReceivableEntryType } from "@registry/domain";

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

export interface CsvTable {
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface CustomerImportRow {
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

export interface UnitImportRow {
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

export interface RentalImportRow {
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

export interface OpeningBalanceImportRow {
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

export interface PaymentHistoryImportRow {
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

export interface NormalizedImport {
  customers: CustomerImportRow[];
  units: UnitImportRow[];
  rentals: RentalImportRow[];
  openingBalances: OpeningBalanceImportRow[];
  paymentHistory: PaymentHistoryImportRow[];
  issues: ImportIssue[];
}

export const datasetKeys = ["customers", "units", "rentals", "opening-balances", "payment-history"] as const satisfies readonly ImportDatasetKey[];
export const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
export const allowedAssetStatuses = new Set<AssetStatus>(["available", "assigned", "maintenance", "archived"]);
export const allowedCadences = new Set<BillingCadence>(["daily", "weekly", "monthly", "custom"]);
export const allowedEntryTypes = new Set<ReceivableEntryType>(["charge", "payment", "credit", "adjustment", "deposit", "refund"]);
