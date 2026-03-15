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

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type CustomerStatus = (typeof customerStatuses)[number];
export type AssetStatus = (typeof assetStatuses)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type AssignmentTransitionTarget = (typeof assignmentTransitionTargets)[number];
export type BillingCadence = (typeof billingCadences)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type BalanceState = (typeof balanceStates)[number];
export type AssetCategory = (typeof assetCategories)[number];

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
  notes?: string | undefined;
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
