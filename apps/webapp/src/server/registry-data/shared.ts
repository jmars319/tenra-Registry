import type {
  Assignment,
  AssignmentTransitionTarget,
  AssetStatus,
  CustomerStatus,
  DocumentTemplateType,
  GeneratedDocumentStatus,
  OrganizationStatus,
  ReceivableEntryStatus,
  ReceivableEntryType
} from "@registry/domain";
import type { Prisma } from "@prisma/client";

// Sort priority boundary
export const customerStatusOrder = new Map<CustomerStatus, number>([
  ["active", 0],
  ["inactive", 1],
  ["archived", 2]
]);

export const assetStatusOrder = new Map<AssetStatus, number>([
  ["assigned", 0],
  ["available", 1],
  ["maintenance", 2],
  ["archived", 3]
]);

export const assignmentStatusOrder = new Map<Assignment["status"], number>([
  ["active", 0],
  ["draft", 1],
  ["completed", 2],
  ["cancelled", 3]
]);

export const receivableTypeOrder = new Map<ReceivableEntryType, number>([
  ["charge", 0],
  ["deposit", 1],
  ["adjustment", 2],
  ["refund", 3],
  ["payment", 4],
  ["credit", 5]
]);

export const monthPeriodFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

export type RegistryTransaction = Prisma.TransactionClient;
export type PrismaDocumentTemplateType =
  | "RENTAL_AGREEMENT"
  | "DELIVERY_TICKET"
  | "PICKUP_TICKET"
  | "CONDITION_REPORT"
  | "PAYMENT_RECEIPT"
  | "ACCOUNT_STATEMENT"
  | "PAST_DUE_NOTICE"
  | "DEPOSIT_RECEIPT"
  | "GENERAL_LETTER";
export type PrismaGeneratedDocumentStatus = "DRAFT" | "PRINTED" | "EMAILED" | "ARCHIVED";

// Date normalization boundary
export function normalizeOptionalString(value: string | null): string | undefined {
  return value ?? undefined;
}

export function normalizeNullableString(value: string | undefined): string | null {
  return value ?? null;
}

export function dateToIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function dateToIsoDateTime(value: Date): string {
  return value.toISOString();
}

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getTodayIsoDate(): string {
  return dateToIsoDate(new Date());
}

// Rent period boundary
export function getDefaultRentRunPeriod(): string {
  return getTodayIsoDate().slice(0, 7);
}

export function getDefaultRentRunBillingDay(): number {
  return 1;
}

export function clampBillingDay(day: number): number {
  if (!Number.isFinite(day)) {
    return getDefaultRentRunBillingDay();
  }

  return Math.min(28, Math.max(1, Math.trunc(day)));
}

export function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIsoDate(date);
}

export function getPeriodStart(period: string): string {
  return `${period}-01`;
}

export function getPeriodEnd(period: string): string {
  const [year = 1970, month = 1] = period.split("-").map((part) => Number.parseInt(part, 10));
  return dateToIsoDate(new Date(Date.UTC(year, month, 0)));
}

export function getDaysInclusive(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate).getTime();
  const end = parseDateOnly(endDate).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000) + 1);
}

export function getRentRunChargeDate(period: string, billingDay: number): string {
  return `${period}-${String(clampBillingDay(billingDay)).padStart(2, "0")}`;
}

export function getDefaultRentRunDueDate(
  period = getDefaultRentRunPeriod(),
  billingDay = getDefaultRentRunBillingDay()
): string {
  return addDays(getRentRunChargeDate(period, billingDay), 9);
}

export function formatRentRunPeriodLabel(period: string): string {
  return monthPeriodFormatter.format(parseDateOnly(`${period}-01`));
}

// Prisma status boundary
export function prismaStatusToOrganizationStatus(value: "ACTIVE" | "INACTIVE"): OrganizationStatus {
  return value.toLowerCase() as OrganizationStatus;
}

export function prismaStatusToCustomerStatus(value: "ACTIVE" | "INACTIVE" | "ARCHIVED"): CustomerStatus {
  return value.toLowerCase() as CustomerStatus;
}

export function prismaStatusToAssetStatus(value: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "ARCHIVED"): AssetStatus {
  return value.toLowerCase() as AssetStatus;
}

export function prismaStatusToAssignmentStatus(
  value: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
): Assignment["status"] {
  return value.toLowerCase() as Assignment["status"];
}

export function prismaCadenceToDomain(value: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"): Assignment["billingCadence"] {
  return value.toLowerCase() as Assignment["billingCadence"];
}

export function domainCadenceToPrisma(value: Assignment["billingCadence"]): "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM" {
  return value.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
}

export function domainAssignmentStatusToPrisma(
  value: Assignment["status"]
): "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" {
  return value.toUpperCase() as "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export function prismaReceivableTypeToDomain(value: "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND"): ReceivableEntryType {
  return value.toLowerCase() as ReceivableEntryType;
}

export function domainReceivableTypeToPrisma(
  value: ReceivableEntryType
): "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND" {
  return value.toUpperCase() as "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND";
}

export function prismaReceivableStatusToDomain(value: "POSTED" | "VOID"): ReceivableEntryStatus {
  return value.toLowerCase() as ReceivableEntryStatus;
}

export function prismaDocumentTemplateTypeToDomain(value: string): DocumentTemplateType {
  return value.toLowerCase().replaceAll("_", "-") as DocumentTemplateType;
}

export function domainDocumentTemplateTypeToPrisma(value: DocumentTemplateType): PrismaDocumentTemplateType {
  return value.toUpperCase().replaceAll("-", "_") as PrismaDocumentTemplateType;
}

export function prismaGeneratedDocumentStatusToDomain(value: PrismaGeneratedDocumentStatus): GeneratedDocumentStatus {
  return value.toLowerCase() as GeneratedDocumentStatus;
}

// Transition safety boundary
export function getAssetActivationErrorMessage(assetStatus: AssetStatus): string | null {
  switch (assetStatus) {
    case "available":
      return null;
    case "assigned":
      return "This unit is already rented and cannot be activated.";
    case "maintenance":
      return "This unit is in maintenance and cannot be activated.";
    case "archived":
      return "This unit is archived and cannot be activated.";
    default:
      return "This unit cannot be activated.";
  }
}

export function getAssignmentTransitionErrorMessage(
  currentStatus: Assignment["status"],
  nextStatus: AssignmentTransitionTarget
): string {
  if (currentStatus === "completed") {
    return "Completed rentals cannot be changed.";
  }

  if (currentStatus === "cancelled") {
    return "Cancelled rentals cannot be changed.";
  }

  if (currentStatus === nextStatus) {
    return `This assignment is already ${currentStatus}.`;
  }

  if (currentStatus === "draft") {
    return "Draft rentals can only be activated or cancelled.";
  }

  if (currentStatus === "active") {
    return "Active rentals can only be completed or cancelled.";
  }

  return "This rental transition is not allowed.";
}
