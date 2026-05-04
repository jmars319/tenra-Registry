import type { RegistryRole } from "@registry/auth";
import type {
  AuditFields,
  EntityId,
  ISODateString,
  MoneyAmount
} from "@registry/shared-types";

export const organizationStatuses = ["active", "inactive"] as const;
export const customerStatuses = ["active", "inactive", "archived"] as const;
export const assetStatuses = ["available", "assigned", "maintenance", "archived"] as const;
export const assignmentStatuses = ["draft", "active", "completed", "cancelled"] as const;
export const assignmentTransitionTargets = ["active", "completed", "cancelled"] as const;
export const billingCadences = ["daily", "weekly", "monthly", "custom"] as const;
export const invoiceStatuses = ["draft", "open", "paid", "void"] as const;
export const balanceStates = ["current", "past-due", "settled", "credit"] as const;
export const assetCategories = ["unit", "vehicle", "equipment", "other"] as const;
export const receivableEntryTypes = ["charge", "payment", "credit", "adjustment", "deposit", "refund"] as const;
export const receivableEntryStatuses = ["posted", "void"] as const;
export const documentTemplateTypes = [
  "rental-agreement",
  "delivery-ticket",
  "pickup-ticket",
  "condition-report",
  "payment-receipt",
  "account-statement",
  "past-due-notice",
  "deposit-receipt",
  "general-letter"
] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type CustomerStatus = (typeof customerStatuses)[number];
export type AssetStatus = (typeof assetStatuses)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type AssignmentTransitionTarget = (typeof assignmentTransitionTargets)[number];
export type BillingCadence = (typeof billingCadences)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type BalanceState = (typeof balanceStates)[number];
export type AssetCategory = (typeof assetCategories)[number];
export type ReceivableEntryType = (typeof receivableEntryTypes)[number];
export type ReceivableEntryStatus = (typeof receivableEntryStatuses)[number];
export type DocumentTemplateType = (typeof documentTemplateTypes)[number];

export interface Organization extends AuditFields {
  id: EntityId;
  name: string;
  slug: string;
  status: OrganizationStatus;
}

export interface Customer extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  companyName?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  billingStreet1?: string | undefined;
  billingStreet2?: string | undefined;
  billingCity?: string | undefined;
  billingState?: string | undefined;
  billingPostalCode?: string | undefined;
  billingCountry?: string | undefined;
  notes?: string | undefined;
  status: CustomerStatus;
}

export interface Asset extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  assetCode: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  currentLocation?: string | undefined;
  homeLocation?: string | undefined;
  sizeLabel?: string | undefined;
  unitType?: string | undefined;
  condition?: string | undefined;
  notes?: string | undefined;
}

export interface Assignment extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  customerId: EntityId;
  assetId: EntityId;
  startDate: ISODateString;
  endDate?: ISODateString | undefined;
  billingCadence: BillingCadence;
  rateInCents: number;
  status: AssignmentStatus;
  siteName?: string | undefined;
  siteStreet1?: string | undefined;
  siteStreet2?: string | undefined;
  siteCity?: string | undefined;
  siteState?: string | undefined;
  sitePostalCode?: string | undefined;
  deliveryScheduledFor?: ISODateString | undefined;
  deliveredOn?: ISODateString | undefined;
  pickupRequestedOn?: ISODateString | undefined;
  pickedUpOn?: ISODateString | undefined;
  placementNotes?: string | undefined;
  notes?: string | undefined;
}

export interface ReceivableEntry extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  assetId?: EntityId | undefined;
  type: ReceivableEntryType;
  status: ReceivableEntryStatus;
  description: string;
  effectiveDate: ISODateString;
  dueDate?: ISODateString | undefined;
  amountInCents: number;
  paymentMethod?: string | undefined;
  reference?: string | undefined;
  notes?: string | undefined;
}

export interface CustomerBalanceSummary {
  customerId: EntityId;
  customerName: string;
  totalChargesInCents: number;
  totalCreditsInCents: number;
  balanceInCents: number;
  pastDueInCents: number;
  lastPaymentDate?: ISODateString | undefined;
}

export interface DocumentTemplate extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  type: DocumentTemplateType;
  name: string;
  subject?: string | undefined;
  body: string;
  mergeFields: string[];
  printEnabled: boolean;
  emailEnabled: boolean;
  active: boolean;
}

export interface InvoiceLineItem {
  id: EntityId;
  invoiceId: EntityId;
  description: string;
  quantity: number;
  unitAmount: MoneyAmount;
  lineTotal: MoneyAmount;
}

export interface Invoice extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  invoiceNumber: string;
  issuedOn: ISODateString;
  dueOn: ISODateString;
  status: InvoiceStatus;
  subtotal: MoneyAmount;
  taxTotal: MoneyAmount;
  total: MoneyAmount;
  paidAmount: MoneyAmount;
  balanceState: BalanceState;
}

export interface OperatorAccess extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  userId: EntityId;
  role: RegistryRole;
  active: boolean;
}

export function getInvoiceOutstandingAmount(invoice: Invoice): number {
  return invoice.total.amountInCents - invoice.paidAmount.amountInCents;
}

export function deriveBalanceState(invoice: Invoice): BalanceState {
  const outstanding = getInvoiceOutstandingAmount(invoice);

  if (outstanding < 0) {
    return "credit";
  }

  if (outstanding === 0) {
    return "settled";
  }

  return invoice.status === "open" ? "current" : invoice.balanceState;
}

export function getReceivableEntryTypeLabel(type: ReceivableEntryType): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDocumentTemplateTypeLabel(type: DocumentTemplateType): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isReceivableCreditType(type: ReceivableEntryType): boolean {
  return type === "payment" || type === "credit";
}

export function normalizeReceivableAmount(type: ReceivableEntryType, amountInCents: number): number {
  const absoluteAmount = Math.abs(amountInCents);
  return isReceivableCreditType(type) ? -absoluteAmount : absoluteAmount;
}

export function summarizeReceivableEntries(
  entries: Pick<ReceivableEntry, "amountInCents" | "dueDate" | "effectiveDate" | "status">[],
  today: ISODateString
): Omit<CustomerBalanceSummary, "customerId" | "customerName"> {
  let totalChargesInCents = 0;
  let totalCreditsInCents = 0;
  let pastDueChargesInCents = 0;
  let lastPaymentDate: ISODateString | undefined;

  for (const entry of entries) {
    if (entry.status !== "posted") {
      continue;
    }

    if (entry.amountInCents >= 0) {
      totalChargesInCents += entry.amountInCents;

      if (entry.dueDate && entry.dueDate < today) {
        pastDueChargesInCents += entry.amountInCents;
      }
    } else {
      totalCreditsInCents += Math.abs(entry.amountInCents);

      if (!lastPaymentDate || entry.effectiveDate > lastPaymentDate) {
        lastPaymentDate = entry.effectiveDate;
      }
    }
  }

  const balanceInCents = totalChargesInCents - totalCreditsInCents;
  const pastDueInCents = Math.max(0, pastDueChargesInCents - totalCreditsInCents);

  return {
    totalChargesInCents,
    totalCreditsInCents,
    balanceInCents,
    pastDueInCents,
    ...(lastPaymentDate ? { lastPaymentDate } : {})
  };
}

export function isAssignmentActive(assignment: Assignment): boolean {
  return assignment.status === "active";
}

const assignmentLifecycleMap: Record<AssignmentStatus, AssignmentTransitionTarget[]> = {
  draft: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function getAllowedAssignmentTransitions(status: AssignmentStatus): AssignmentTransitionTarget[] {
  return [...assignmentLifecycleMap[status]];
}

export function canTransitionAssignmentStatus(
  currentStatus: AssignmentStatus,
  nextStatus: AssignmentTransitionTarget
): boolean {
  return assignmentLifecycleMap[currentStatus].includes(nextStatus);
}

export function isOrganizationOperational(status: OrganizationStatus): boolean {
  return status === "active";
}

export function formatUsdCents(amountInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountInCents / 100);
}
