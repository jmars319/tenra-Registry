import type {
  CreateAssignmentRequest,
  CreateAssetRequest,
  CreateCustomerRequest,
  CreateAccountStatementDocumentRequest,
  CreateDocumentTemplateRequest,
  CreateGeneratedDocumentRequest,
  PostRentRunRequest,
  CreateReceivableEntryRequest,
  SaveGeneratedDocumentDraftRequest,
  TransitionAssignmentStatusRequest,
  UpdateGeneratedDocumentStatusRequest
} from "@registry/api-contracts";
import {
  REGISTRY_DEFAULT_ORGANIZATION_SLUG,
  getAssetRoute,
  getAssignmentRoute,
  getCustomerRoute
} from "@registry/config";
import type {
  Assignment,
  Asset,
  AssetStatus,
  AssignmentTransitionTarget,
  Customer,
  CustomerBalanceSummary,
  CustomerStatus,
  DocumentTemplate,
  DocumentTemplateType,
  GeneratedDocument,
  GeneratedDocumentStatus,
  Organization,
  OrganizationStatus,
  ReceivableEntry,
  ReceivableEntryStatus,
  ReceivableEntryType
} from "@registry/domain";
import {
  canTransitionAssignmentStatus,
  formatUsdCents,
  normalizeReceivableAmount,
  summarizeReceivableEntries
} from "@registry/domain";
import { Prisma } from "@prisma/client";
import { db } from "./db";

const customerStatusOrder = new Map<CustomerStatus, number>([
  ["active", 0],
  ["inactive", 1],
  ["archived", 2]
]);

const assetStatusOrder = new Map<AssetStatus, number>([
  ["assigned", 0],
  ["available", 1],
  ["maintenance", 2],
  ["archived", 3]
]);

const assignmentStatusOrder = new Map<Assignment["status"], number>([
  ["active", 0],
  ["draft", 1],
  ["completed", 2],
  ["cancelled", 3]
]);

const receivableTypeOrder = new Map<ReceivableEntryType, number>([
  ["charge", 0],
  ["deposit", 1],
  ["adjustment", 2],
  ["refund", 3],
  ["payment", 4],
  ["credit", 5]
]);

const monthPeriodFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
  year: "numeric"
});

type RegistryTransaction = Prisma.TransactionClient;
type PrismaDocumentTemplateType =
  | "RENTAL_AGREEMENT"
  | "DELIVERY_TICKET"
  | "PICKUP_TICKET"
  | "CONDITION_REPORT"
  | "PAYMENT_RECEIPT"
  | "ACCOUNT_STATEMENT"
  | "PAST_DUE_NOTICE"
  | "DEPOSIT_RECEIPT"
  | "GENERAL_LETTER";
type PrismaGeneratedDocumentStatus = "DRAFT" | "PRINTED" | "EMAILED" | "ARCHIVED";

function normalizeOptionalString(value: string | null): string | undefined {
  return value ?? undefined;
}

function normalizeNullableString(value: string | undefined): string | null {
  return value ?? null;
}

function dateToIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dateToIsoDateTime(value: Date): string {
  return value.toISOString();
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function getTodayIsoDate(): string {
  return dateToIsoDate(new Date());
}

export function getDefaultRentRunPeriod(): string {
  return getTodayIsoDate().slice(0, 7);
}

export function getDefaultRentRunBillingDay(): number {
  return 1;
}

function clampBillingDay(day: number): number {
  if (!Number.isFinite(day)) {
    return getDefaultRentRunBillingDay();
  }

  return Math.min(28, Math.max(1, Math.trunc(day)));
}

function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToIsoDate(date);
}

function getPeriodStart(period: string): string {
  return `${period}-01`;
}

function getPeriodEnd(period: string): string {
  const [year = 1970, month = 1] = period.split("-").map((part) => Number.parseInt(part, 10));
  return dateToIsoDate(new Date(Date.UTC(year, month, 0)));
}

function getDaysInclusive(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate).getTime();
  const end = parseDateOnly(endDate).getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000) + 1);
}

function getRentRunChargeDate(period: string, billingDay: number): string {
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

function prismaStatusToOrganizationStatus(value: "ACTIVE" | "INACTIVE"): OrganizationStatus {
  return value.toLowerCase() as OrganizationStatus;
}

function prismaStatusToCustomerStatus(value: "ACTIVE" | "INACTIVE" | "ARCHIVED"): CustomerStatus {
  return value.toLowerCase() as CustomerStatus;
}

function prismaStatusToAssetStatus(value: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "ARCHIVED"): AssetStatus {
  return value.toLowerCase() as AssetStatus;
}

function prismaStatusToAssignmentStatus(
  value: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED"
): Assignment["status"] {
  return value.toLowerCase() as Assignment["status"];
}

function prismaCadenceToDomain(value: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"): Assignment["billingCadence"] {
  return value.toLowerCase() as Assignment["billingCadence"];
}

function domainCadenceToPrisma(value: Assignment["billingCadence"]): "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM" {
  return value.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
}

function domainAssignmentStatusToPrisma(
  value: Assignment["status"]
): "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED" {
  return value.toUpperCase() as "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
}

function prismaReceivableTypeToDomain(value: "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND"): ReceivableEntryType {
  return value.toLowerCase() as ReceivableEntryType;
}

function domainReceivableTypeToPrisma(
  value: ReceivableEntryType
): "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND" {
  return value.toUpperCase() as "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND";
}

function prismaReceivableStatusToDomain(value: "POSTED" | "VOID"): ReceivableEntryStatus {
  return value.toLowerCase() as ReceivableEntryStatus;
}

function prismaDocumentTemplateTypeToDomain(value: string): DocumentTemplateType {
  return value.toLowerCase().replaceAll("_", "-") as DocumentTemplateType;
}

function domainDocumentTemplateTypeToPrisma(value: DocumentTemplateType): PrismaDocumentTemplateType {
  return value.toUpperCase().replaceAll("-", "_") as PrismaDocumentTemplateType;
}

function prismaGeneratedDocumentStatusToDomain(value: PrismaGeneratedDocumentStatus): GeneratedDocumentStatus {
  return value.toLowerCase() as GeneratedDocumentStatus;
}

function getAssetActivationErrorMessage(assetStatus: AssetStatus): string | null {
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

function getAssignmentTransitionErrorMessage(
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

async function findActiveAssignmentForAsset(
  transaction: RegistryTransaction,
  organizationId: string,
  assetId: string,
  excludeAssignmentId?: string
) {
  return transaction.assignment.findFirst({
    where: {
      organizationId,
      assetId,
      status: "ACTIVE",
      ...(excludeAssignmentId
        ? {
            id: {
              not: excludeAssignmentId
            }
          }
        : {})
    }
  });
}

function assertAssetCanBeActivated(assetStatus: AssetStatus): void {
  const errorMessage = getAssetActivationErrorMessage(assetStatus);

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

function serializeOrganization(record: {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}): Organization {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    status: prismaStatusToOrganizationStatus(record.status),
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeCustomer(record: {
  id: string;
  organizationId: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  billingStreet1: string | null;
  billingStreet2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
  notes: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    companyName: normalizeOptionalString(record.companyName),
    email: normalizeOptionalString(record.email),
    phone: normalizeOptionalString(record.phone),
    billingStreet1: normalizeOptionalString(record.billingStreet1),
    billingStreet2: normalizeOptionalString(record.billingStreet2),
    billingCity: normalizeOptionalString(record.billingCity),
    billingState: normalizeOptionalString(record.billingState),
    billingPostalCode: normalizeOptionalString(record.billingPostalCode),
    billingCountry: normalizeOptionalString(record.billingCountry),
    notes: normalizeOptionalString(record.notes),
    status: prismaStatusToCustomerStatus(record.status),
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeAsset(record: {
  id: string;
  organizationId: string;
  assetCode: string;
  name: string;
  category: "UNIT" | "VEHICLE" | "EQUIPMENT" | "OTHER";
  status: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "ARCHIVED";
  currentLocation: string | null;
  homeLocation: string | null;
  sizeLabel: string | null;
  unitType: string | null;
  condition: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Asset {
  return {
    id: record.id,
    organizationId: record.organizationId,
    assetCode: record.assetCode,
    name: record.name,
    category: record.category.toLowerCase() as Asset["category"],
    status: prismaStatusToAssetStatus(record.status),
    currentLocation: normalizeOptionalString(record.currentLocation),
    homeLocation: normalizeOptionalString(record.homeLocation),
    sizeLabel: normalizeOptionalString(record.sizeLabel),
    unitType: normalizeOptionalString(record.unitType),
    condition: normalizeOptionalString(record.condition),
    notes: normalizeOptionalString(record.notes),
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeAssignment(record: {
  id: string;
  organizationId: string;
  customerId: string;
  assetId: string;
  startDate: Date;
  endDate: Date | null;
  billingCadence: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
  rateInCents: number;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
  deliveryScheduledFor: Date | null;
  deliveredOn: Date | null;
  pickupRequestedOn: Date | null;
  pickedUpOn: Date | null;
  placementNotes: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Assignment {
  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId,
    assetId: record.assetId,
    startDate: dateToIsoDate(record.startDate),
    endDate: record.endDate ? dateToIsoDate(record.endDate) : undefined,
    billingCadence: prismaCadenceToDomain(record.billingCadence),
    rateInCents: record.rateInCents,
    status: prismaStatusToAssignmentStatus(record.status),
    siteName: normalizeOptionalString(record.siteName),
    siteStreet1: normalizeOptionalString(record.siteStreet1),
    siteStreet2: normalizeOptionalString(record.siteStreet2),
    siteCity: normalizeOptionalString(record.siteCity),
    siteState: normalizeOptionalString(record.siteState),
    sitePostalCode: normalizeOptionalString(record.sitePostalCode),
    deliveryScheduledFor: record.deliveryScheduledFor ? dateToIsoDate(record.deliveryScheduledFor) : undefined,
    deliveredOn: record.deliveredOn ? dateToIsoDate(record.deliveredOn) : undefined,
    pickupRequestedOn: record.pickupRequestedOn ? dateToIsoDate(record.pickupRequestedOn) : undefined,
    pickedUpOn: record.pickedUpOn ? dateToIsoDate(record.pickedUpOn) : undefined,
    placementNotes: normalizeOptionalString(record.placementNotes),
    notes: normalizeOptionalString(record.notes),
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeReceivableEntry(record: {
  id: string;
  organizationId: string;
  customerId: string;
  assignmentId: string | null;
  assetId: string | null;
  type: "CHARGE" | "PAYMENT" | "CREDIT" | "ADJUSTMENT" | "DEPOSIT" | "REFUND";
  status: "POSTED" | "VOID";
  description: string;
  effectiveDate: Date;
  dueDate: Date | null;
  amountInCents: number;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ReceivableEntry {
  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId,
    assignmentId: normalizeOptionalString(record.assignmentId),
    assetId: normalizeOptionalString(record.assetId),
    type: prismaReceivableTypeToDomain(record.type),
    status: prismaReceivableStatusToDomain(record.status),
    description: record.description,
    effectiveDate: dateToIsoDate(record.effectiveDate),
    dueDate: record.dueDate ? dateToIsoDate(record.dueDate) : undefined,
    amountInCents: record.amountInCents,
    paymentMethod: normalizeOptionalString(record.paymentMethod),
    reference: normalizeOptionalString(record.reference),
    notes: normalizeOptionalString(record.notes),
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeDocumentTemplate(record: {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  subject: string | null;
  body: string;
  mergeFields: string[];
  printEnabled: boolean;
  emailEnabled: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DocumentTemplate {
  return {
    id: record.id,
    organizationId: record.organizationId,
    type: prismaDocumentTemplateTypeToDomain(record.type),
    name: record.name,
    subject: normalizeOptionalString(record.subject),
    body: record.body,
    mergeFields: record.mergeFields,
    printEnabled: record.printEnabled,
    emailEnabled: record.emailEnabled,
    active: record.active,
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function serializeGeneratedDocument(record: {
  id: string;
  organizationId: string;
  templateId: string | null;
  customerId: string | null;
  assignmentId: string | null;
  assetId: string | null;
  type: string;
  status: PrismaGeneratedDocumentStatus;
  title: string;
  subject: string | null;
  body: string;
  recipientEmail: string | null;
  printedAt: Date | null;
  emailedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): GeneratedDocument {
  return {
    id: record.id,
    organizationId: record.organizationId,
    templateId: normalizeOptionalString(record.templateId),
    customerId: normalizeOptionalString(record.customerId),
    assignmentId: normalizeOptionalString(record.assignmentId),
    assetId: normalizeOptionalString(record.assetId),
    type: prismaDocumentTemplateTypeToDomain(record.type),
    status: prismaGeneratedDocumentStatusToDomain(record.status),
    title: record.title,
    subject: normalizeOptionalString(record.subject),
    body: record.body,
    recipientEmail: normalizeOptionalString(record.recipientEmail),
    printedAt: record.printedAt ? dateToIsoDateTime(record.printedAt) : undefined,
    emailedAt: record.emailedAt ? dateToIsoDateTime(record.emailedAt) : undefined,
    createdAt: dateToIsoDateTime(record.createdAt),
    updatedAt: dateToIsoDateTime(record.updatedAt)
  };
}

function sortCustomers<T extends { status: CustomerStatus; name: string }>(customers: T[]): T[] {
  return [...customers].sort((left, right) => {
    const statusDelta = (customerStatusOrder.get(left.status) ?? 99) - (customerStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

function sortAssets<T extends { status: AssetStatus; assetCode: string }>(assets: T[]): T[] {
  return [...assets].sort((left, right) => {
    const statusDelta = (assetStatusOrder.get(left.status) ?? 99) - (assetStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.assetCode.localeCompare(right.assetCode);
  });
}

function sortAssignments<T extends { status: Assignment["status"]; startDate: string }>(assignments: T[]): T[] {
  return [...assignments].sort((left, right) => {
    const statusDelta =
      (assignmentStatusOrder.get(left.status) ?? 99) - (assignmentStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return right.startDate.localeCompare(left.startDate);
  });
}

function sortReceivableEntries<T extends { effectiveDate: string; type: ReceivableEntryType }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    const dateDelta = right.effectiveDate.localeCompare(left.effectiveDate);

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return (receivableTypeOrder.get(left.type) ?? 99) - (receivableTypeOrder.get(right.type) ?? 99);
  });
}

export interface DashboardAssignmentItem extends Assignment {
  href: string;
  customerName: string;
  assetCode: string;
  assetName: string;
}

export interface CustomerListItem extends Customer {
  href: string;
  activeAssignmentCount: number;
  balanceInCents: number;
  pastDueInCents: number;
}

export interface CustomerDetail {
  customer: Customer;
  assignments: DashboardAssignmentItem[];
  receivableEntries: ReceivableListItem[];
  balance: CustomerBalanceSummary;
}

export interface AssetListItem extends Asset {
  href: string;
  activeAssignment?: {
    assignmentId: string;
    customerName: string;
    siteName?: string | undefined;
    siteCity?: string | undefined;
    siteState?: string | undefined;
  } | undefined;
}

export interface AssetDetail {
  asset: Asset;
  assignments: DashboardAssignmentItem[];
}

export interface AssignmentListItem extends Assignment {
  href: string;
  customerName: string;
  customerHref: string;
  assetCode: string;
  assetName: string;
  assetHref: string;
}

export interface AssignmentDetail {
  assignment: AssignmentListItem;
  customer: Customer;
  asset: Asset;
  receivableEntries: ReceivableListItem[];
  balanceInCents: number;
}

export interface AssignmentLifecycleResult {
  assignment: Assignment;
  asset: Asset;
  customerId: string;
}

export interface AssignmentFormOption {
  id: string;
  label: string;
  status: AssetStatus;
  occupiedByActiveAssignment: boolean;
}

export interface ReceivableListItem extends ReceivableEntry {
  customerName: string;
  customerHref: string;
  assignmentHref?: string | undefined;
  assetCode?: string | undefined;
  assetName?: string | undefined;
  assetHref?: string | undefined;
}

export interface ReceivableCustomerOption {
  id: string;
  label: string;
}

export interface ReceivableAssignmentOption {
  id: string;
  label: string;
  customerId: string;
  assetId: string;
}

export interface RentRunPreviewLine {
  assignmentId: string;
  customerId: string;
  customerName: string;
  customerHref: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assetHref: string;
  siteLabel: string;
  billingCadence: Assignment["billingCadence"];
  amountInCents: number;
  baseRateInCents: number;
  activeDays: number;
  periodDays: number;
  calculation: string;
  startDate: string;
  endDate?: string | undefined;
  reference: string;
  alreadyPosted: boolean;
  existingEntryId?: string | undefined;
}

export interface RentRunPreview {
  organization: Organization;
  period: string;
  billingDay: number;
  chargeDate: string;
  dueDate: string;
  lines: RentRunPreviewLine[];
  readyCount: number;
  readyTotalInCents: number;
  postedCount: number;
}

export interface RentRunHistoryItem {
  period: string;
  periodLabel: string;
  postedOn: string;
  count: number;
  totalInCents: number;
}

export interface DocumentRentalOption {
  id: string;
  label: string;
  customerId: string;
  assetId: string;
}

export interface GeneratedDocumentListItem extends GeneratedDocument {
  customerName?: string | undefined;
  customerHref?: string | undefined;
  assetCode?: string | undefined;
  assignmentHref?: string | undefined;
}

export interface GeneratedDocumentDetail {
  document: GeneratedDocumentListItem;
  templateName?: string | undefined;
}

export interface GeneratedDocumentDraft {
  templateId?: string | undefined;
  customerId: string;
  assignmentId?: string | undefined;
  assetId?: string | undefined;
  type: DocumentTemplateType;
  title: string;
  subject?: string | undefined;
  body: string;
  recipientEmail?: string | undefined;
  customerName: string;
  assetCode?: string | undefined;
}

export async function getDefaultOrganization(): Promise<Organization> {
  const organization =
    (await db.organization.findUnique({
      where: {
        slug: REGISTRY_DEFAULT_ORGANIZATION_SLUG
      }
    })) ??
    (await db.organization.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    }));

  if (!organization) {
    throw new Error("No organization found. Run the webapp seed step before using tenra Registry.");
  }

  return serializeOrganization(organization);
}

export async function getDashboardSnapshot(): Promise<{
  organization: Organization;
  counts: {
    customers: number;
    units: number;
    activeRentals: number;
    availableUnits: number;
    balanceDueInCents: number;
    pastDueInCents: number;
    paymentsThisMonthInCents: number;
  };
  activeAssignments: DashboardAssignmentItem[];
  priorityBalances: CustomerBalanceSummary[];
  pickupQueue: DashboardAssignmentItem[];
}> {
  const organization = await getDefaultOrganization();
  const today = getTodayIsoDate();
  const monthStart = today.slice(0, 8) + "01";

  const [
    customers,
    units,
    activeRentals,
    availableUnits,
    activeAssignments,
    pickupQueue,
    receivableEntries,
    customersWithEntries
  ] = await Promise.all([
    db.customer.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE"
      }
    }),
    db.asset.count({
      where: {
        organizationId: organization.id,
        category: "UNIT"
      }
    }),
    db.assignment.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE"
      }
    }),
    db.asset.count({
      where: {
        organizationId: organization.id,
        status: "AVAILABLE",
        category: "UNIT"
      }
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE"
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        asset: {
          select: {
            assetCode: true,
            name: true
          }
        }
      },
      orderBy: {
        startDate: "desc"
      },
      take: 5
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        pickupRequestedOn: {
          not: null
        },
        pickedUpOn: null
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        asset: {
          select: {
            assetCode: true,
            name: true
          }
        }
      },
      orderBy: {
        pickupRequestedOn: "asc"
      },
      take: 5
    }),
    db.receivableEntry.findMany({
      where: {
        organizationId: organization.id,
        status: "POSTED"
      }
    }),
    db.customer.findMany({
      where: {
        organizationId: organization.id
      },
      include: {
        receivableEntries: {
          where: {
            status: "POSTED"
          }
        }
      }
    })
  ]);

  const receivableSummary = summarizeReceivableEntries(receivableEntries.map(serializeReceivableEntry), today);
  const priorityBalances = customersWithEntries
    .map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      ...summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today)
    }))
    .filter((balance) => balance.balanceInCents > 0 || balance.pastDueInCents > 0)
    .sort((left, right) => right.pastDueInCents - left.pastDueInCents || right.balanceInCents - left.balanceInCents)
    .slice(0, 5);
  const paymentsThisMonthInCents = receivableEntries
    .map(serializeReceivableEntry)
    .filter((entry) => entry.amountInCents < 0 && entry.effectiveDate >= monthStart)
    .reduce((total, entry) => total + Math.abs(entry.amountInCents), 0);

  return {
    organization,
    counts: {
      customers,
      units,
      activeRentals,
      availableUnits,
      balanceDueInCents: receivableSummary.balanceInCents,
      pastDueInCents: receivableSummary.pastDueInCents,
      paymentsThisMonthInCents
    },
    activeAssignments: activeAssignments.map((assignment) => ({
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name
    })),
    priorityBalances,
    pickupQueue: pickupQueue.map((assignment) => ({
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name
    }))
  };
}

export async function listCustomers(): Promise<CustomerListItem[]> {
  const organization = await getDefaultOrganization();

  const records = await db.customer.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      assignments: {
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true
        }
      },
      receivableEntries: {
        where: {
          status: "POSTED"
        }
      }
    }
  });
  const today = getTodayIsoDate();

  return sortCustomers(
    records.map((record) => {
      const balance = summarizeReceivableEntries(record.receivableEntries.map(serializeReceivableEntry), today);

      return {
        ...serializeCustomer(record),
        href: getCustomerRoute(record.id),
        activeAssignmentCount: record.assignments.length,
        balanceInCents: balance.balanceInCents,
        pastDueInCents: balance.pastDueInCents
      };
    })
  );
}

export async function getCustomerDetail(customerId: string): Promise<CustomerDetail | null> {
  const organization = await getDefaultOrganization();

  const customer = await db.customer.findFirst({
    where: {
      id: customerId,
      organizationId: organization.id
    }
  });

  if (!customer) {
    return null;
  }

  const [assignments, receivableEntries] = await Promise.all([
    db.assignment.findMany({
      where: {
        customerId,
        organizationId: organization.id
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true
          }
        }
      }
    }),
    db.receivableEntry.findMany({
      where: {
        customerId,
        organizationId: organization.id
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true
          }
        },
        assignment: {
          select: {
            id: true
          }
        },
        asset: {
          select: {
            id: true,
            assetCode: true,
            name: true
          }
        }
      }
    })
  ]);

  const serializedEntries = sortReceivableEntries(
    receivableEntries.map((entry) => ({
      ...serializeReceivableEntry(entry),
      customerName: entry.customer.name,
      customerHref: getCustomerRoute(entry.customer.id),
      assignmentHref: entry.assignment ? getAssignmentRoute(entry.assignment.id) : undefined,
      assetCode: entry.asset?.assetCode,
      assetName: entry.asset?.name,
      assetHref: entry.asset ? getAssetRoute(entry.asset.id) : undefined
    }))
  );

  return {
    customer: serializeCustomer(customer),
    assignments: sortAssignments(
      assignments.map((assignment) => ({
        ...serializeAssignment(assignment),
        href: getAssignmentRoute(assignment.id),
        customerName: assignment.customer.name,
        assetCode: assignment.asset.assetCode,
        assetName: assignment.asset.name
      }))
    ),
    receivableEntries: serializedEntries,
    balance: {
      customerId: customer.id,
      customerName: customer.name,
      ...summarizeReceivableEntries(serializedEntries, getTodayIsoDate())
    }
  };
}

export async function createCustomer(input: CreateCustomerRequest): Promise<Customer> {
  const customer = await db.customer.create({
    data: {
      organizationId: input.organizationId,
      name: input.name,
      companyName: normalizeNullableString(input.companyName),
      email: normalizeNullableString(input.email),
      phone: normalizeNullableString(input.phone),
      billingStreet1: normalizeNullableString(input.billingStreet1),
      billingStreet2: normalizeNullableString(input.billingStreet2),
      billingCity: normalizeNullableString(input.billingCity),
      billingState: normalizeNullableString(input.billingState),
      billingPostalCode: normalizeNullableString(input.billingPostalCode),
      billingCountry: input.billingCountry ?? "US",
      notes: normalizeNullableString(input.notes),
      status: "ACTIVE"
    }
  });

  return serializeCustomer(customer);
}

export async function listAssets(): Promise<AssetListItem[]> {
  const organization = await getDefaultOrganization();

  const records = await db.asset.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      assignments: {
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true,
          siteName: true,
          siteCity: true,
          siteState: true,
          customer: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  return sortAssets(
    records.map((record) => ({
      ...serializeAsset(record),
      href: getAssetRoute(record.id),
      activeAssignment: record.assignments[0]
        ? {
            assignmentId: record.assignments[0].id,
            customerName: record.assignments[0].customer.name,
            siteName: normalizeOptionalString(record.assignments[0].siteName),
            siteCity: normalizeOptionalString(record.assignments[0].siteCity),
            siteState: normalizeOptionalString(record.assignments[0].siteState)
          }
        : undefined
    }))
  );
}

export async function getAssetDetail(assetId: string): Promise<AssetDetail | null> {
  const organization = await getDefaultOrganization();

  const asset = await db.asset.findFirst({
    where: {
      id: assetId,
      organizationId: organization.id
    }
  });

  if (!asset) {
    return null;
  }

  const assignments = await db.assignment.findMany({
    where: {
      assetId,
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          name: true
        }
      },
      asset: {
        select: {
          assetCode: true,
          name: true
        }
      }
    }
  });

  return {
    asset: serializeAsset(asset),
    assignments: sortAssignments(
      assignments.map((assignment) => ({
        ...serializeAssignment(assignment),
        href: getAssignmentRoute(assignment.id),
        customerName: assignment.customer.name,
        assetCode: assignment.asset.assetCode,
        assetName: assignment.asset.name
      }))
    )
  };
}

export async function createAsset(input: CreateAssetRequest): Promise<Asset> {
  const asset = await db.asset.create({
    data: {
      organizationId: input.organizationId,
      assetCode: input.assetCode,
      name: input.name,
      category: input.category.toUpperCase() as "UNIT" | "VEHICLE" | "EQUIPMENT" | "OTHER",
      status: "AVAILABLE",
      currentLocation: normalizeNullableString(input.currentLocation),
      homeLocation: normalizeNullableString(input.homeLocation),
      sizeLabel: normalizeNullableString(input.sizeLabel),
      unitType: normalizeNullableString(input.unitType),
      condition: normalizeNullableString(input.condition),
      notes: normalizeNullableString(input.notes)
    }
  });

  return serializeAsset(asset);
}

export async function listAssignments(): Promise<AssignmentListItem[]> {
  const organization = await getDefaultOrganization();

  const assignments = await db.assignment.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      asset: {
        select: {
          id: true,
          assetCode: true,
          name: true
        }
      }
    }
  });

  return sortAssignments(
    assignments.map((assignment) => ({
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      customerHref: getCustomerRoute(assignment.customer.id),
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name,
      assetHref: getAssetRoute(assignment.asset.id)
    }))
  );
}

export async function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetail | null> {
  const organization = await getDefaultOrganization();

  const assignment = await db.assignment.findFirst({
    where: {
      id: assignmentId,
      organizationId: organization.id
    },
    include: {
      customer: true,
      asset: true
    }
  });

  if (!assignment) {
    return null;
  }

  const receivableEntries = await db.receivableEntry.findMany({
    where: {
      assignmentId: assignment.id,
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          id: true,
          assetCode: true,
          name: true
        }
      }
    }
  });
  const serializedEntries = sortReceivableEntries(
    receivableEntries.map((entry) => ({
      ...serializeReceivableEntry(entry),
      customerName: entry.customer.name,
      customerHref: getCustomerRoute(entry.customer.id),
      assignmentHref: entry.assignment ? getAssignmentRoute(entry.assignment.id) : undefined,
      assetCode: entry.asset?.assetCode,
      assetName: entry.asset?.name,
      assetHref: entry.asset ? getAssetRoute(entry.asset.id) : undefined
    }))
  );

  return {
    assignment: {
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      customerHref: getCustomerRoute(assignment.customer.id),
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name,
      assetHref: getAssetRoute(assignment.asset.id)
    },
    customer: serializeCustomer(assignment.customer),
    asset: serializeAsset(assignment.asset),
    receivableEntries: serializedEntries,
    balanceInCents: summarizeReceivableEntries(serializedEntries, getTodayIsoDate()).balanceInCents
  };
}

export async function getAssignmentFormOptions(): Promise<{
  organization: Organization;
  customers: Array<{ id: string; label: string }>;
  assets: AssignmentFormOption[];
}> {
  const organization = await getDefaultOrganization();

  const [customers, assets] = await Promise.all([
    db.customer.findMany({
      where: {
        organizationId: organization.id,
        status: {
          not: "ARCHIVED"
        }
      },
      orderBy: {
        name: "asc"
      }
    }),
    db.asset.findMany({
      where: {
        organizationId: organization.id
      },
      include: {
        assignments: {
          where: {
            status: "ACTIVE"
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        assetCode: "asc"
      }
    })
  ]);

  return {
    organization,
    customers: customers.map((customer) => ({
      id: customer.id,
      label: customer.companyName ? `${customer.name} · ${customer.companyName}` : customer.name
    })),
    assets: assets.map((asset) => ({
      id: asset.id,
      label: `${asset.assetCode} · ${asset.name}`,
      status: prismaStatusToAssetStatus(asset.status),
      occupiedByActiveAssignment: asset.assignments.length > 0
    }))
  };
}

export async function createAssignment(input: CreateAssignmentRequest): Promise<Assignment> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Rentals must be created inside the default organization.");
  }

  try {
    const assignment = await db.$transaction(
      async (transaction) => {
        const [customer, asset] = await Promise.all([
          transaction.customer.findFirst({
            where: {
              id: input.customerId,
              organizationId: organization.id
            }
          }),
          transaction.asset.findFirst({
            where: {
              id: input.assetId,
              organizationId: organization.id
            }
          })
        ]);

        if (!customer) {
          throw new Error("Customer not found in the default organization.");
        }

        if (!asset) {
          throw new Error("Unit not found in the default organization.");
        }

        if (input.status === "active") {
          assertAssetCanBeActivated(prismaStatusToAssetStatus(asset.status));
          const existingActiveAssignment = await findActiveAssignmentForAsset(
            transaction,
            organization.id,
            input.assetId
          );

          if (existingActiveAssignment) {
            throw new Error("That unit already has an active rental.");
          }
        }

        const createdAssignment = await transaction.assignment.create({
          data: {
            organizationId: organization.id,
            customerId: input.customerId,
            assetId: input.assetId,
            startDate: parseDateOnly(input.startDate),
            endDate: input.endDate ? parseDateOnly(input.endDate) : null,
            billingCadence: domainCadenceToPrisma(input.billingCadence),
            rateInCents: input.rateInCents,
            status: domainAssignmentStatusToPrisma(input.status),
            siteName: normalizeNullableString(input.siteName),
            siteStreet1: normalizeNullableString(input.siteStreet1),
            siteStreet2: normalizeNullableString(input.siteStreet2),
            siteCity: normalizeNullableString(input.siteCity),
            siteState: normalizeNullableString(input.siteState),
            sitePostalCode: normalizeNullableString(input.sitePostalCode),
            deliveryScheduledFor: input.deliveryScheduledFor ? parseDateOnly(input.deliveryScheduledFor) : null,
            deliveredOn: input.deliveredOn ? parseDateOnly(input.deliveredOn) : null,
            pickupRequestedOn: input.pickupRequestedOn ? parseDateOnly(input.pickupRequestedOn) : null,
            pickedUpOn: input.pickedUpOn ? parseDateOnly(input.pickedUpOn) : null,
            placementNotes: normalizeNullableString(input.placementNotes),
            notes: normalizeNullableString(input.notes)
          }
        });

        if (input.status === "active") {
          await transaction.asset.update({
            where: {
              id: input.assetId
            },
            data: {
              status: "ASSIGNED"
            }
          });
        }

        return createdAssignment;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );

    return serializeAssignment(assignment);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That unit already has an active rental.");
    }

    throw error;
  }
}

export async function transitionAssignmentStatus(
  input: TransitionAssignmentStatusRequest
): Promise<AssignmentLifecycleResult> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Rentals must be updated inside the default organization.");
  }

  try {
    return await db.$transaction(
      async (transaction) => {
        const assignment = await transaction.assignment.findFirst({
          where: {
            id: input.assignmentId,
            organizationId: organization.id
          },
          include: {
            asset: true
          }
        });

        if (!assignment) {
          throw new Error("Rental not found in the default organization.");
        }

        const currentStatus = prismaStatusToAssignmentStatus(assignment.status);

        if (!canTransitionAssignmentStatus(currentStatus, input.nextStatus)) {
          throw new Error(getAssignmentTransitionErrorMessage(currentStatus, input.nextStatus));
        }

        if (input.nextStatus === "active") {
          assertAssetCanBeActivated(prismaStatusToAssetStatus(assignment.asset.status));
          const existingActiveAssignment = await findActiveAssignmentForAsset(
            transaction,
            organization.id,
            assignment.assetId,
            assignment.id
          );

          if (existingActiveAssignment) {
            throw new Error("That unit already has an active rental.");
          }
        }

        const updatedAssignment = await transaction.assignment.update({
          where: {
            id: assignment.id
          },
          data: {
            status: domainAssignmentStatusToPrisma(input.nextStatus)
          }
        });

        let updatedAsset = assignment.asset;

        if (input.nextStatus === "active") {
          updatedAsset = await transaction.asset.update({
            where: {
              id: assignment.assetId
            },
            data: {
              status: "ASSIGNED"
            }
          });
        }

        if (currentStatus === "active" && (input.nextStatus === "completed" || input.nextStatus === "cancelled")) {
          const otherActiveAssignment = await findActiveAssignmentForAsset(
            transaction,
            organization.id,
            assignment.assetId
          );

          if (!otherActiveAssignment && assignment.asset.status === "ASSIGNED") {
            updatedAsset = await transaction.asset.update({
              where: {
                id: assignment.assetId
              },
              data: {
                status: "AVAILABLE"
              }
            });
          } else {
            const latestAsset = await transaction.asset.findUnique({
              where: {
                id: assignment.assetId
              }
            });

            if (latestAsset) {
              updatedAsset = latestAsset;
            }
          }
        }

        return {
          assignment: serializeAssignment(updatedAssignment),
          asset: serializeAsset(updatedAsset),
          customerId: assignment.customerId
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("That unit already has an active rental.");
    }

    throw error;
  }
}

export async function listReceivableEntries(): Promise<ReceivableListItem[]> {
  const organization = await getDefaultOrganization();

  const entries = await db.receivableEntry.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          id: true,
          assetCode: true,
          name: true
        }
      }
    }
  });

  return sortReceivableEntries(
    entries.map((entry) => ({
      ...serializeReceivableEntry(entry),
      customerName: entry.customer.name,
      customerHref: getCustomerRoute(entry.customer.id),
      assignmentHref: entry.assignment ? getAssignmentRoute(entry.assignment.id) : undefined,
      assetCode: entry.asset?.assetCode,
      assetName: entry.asset?.name,
      assetHref: entry.asset ? getAssetRoute(entry.asset.id) : undefined
    }))
  );
}

export async function getReceivableFormOptions(): Promise<{
  organization: Organization;
  customers: ReceivableCustomerOption[];
  assignments: ReceivableAssignmentOption[];
}> {
  const organization = await getDefaultOrganization();

  const [customers, assignments] = await Promise.all([
    db.customer.findMany({
      where: {
        organizationId: organization.id,
        status: {
          not: "ARCHIVED"
        }
      },
      orderBy: {
        name: "asc"
      }
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id,
        status: {
          in: ["ACTIVE", "DRAFT"]
        }
      },
      include: {
        customer: {
          select: {
            name: true
          }
        },
        asset: {
          select: {
            assetCode: true,
            name: true
          }
        }
      },
      orderBy: {
        startDate: "desc"
      }
    })
  ]);

  return {
    organization,
    customers: customers.map((customer) => ({
      id: customer.id,
      label: customer.companyName ? `${customer.name} · ${customer.companyName}` : customer.name
    })),
    assignments: assignments.map((assignment) => ({
      id: assignment.id,
      customerId: assignment.customerId,
      assetId: assignment.assetId,
      label: `${assignment.asset.assetCode} · ${assignment.customer.name} · ${dateToIsoDate(assignment.startDate)}`
    }))
  };
}

export async function createReceivableEntry(input: CreateReceivableEntryRequest): Promise<ReceivableEntry> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Receivable entries must be created inside the default organization.");
  }

  const entry = await db.$transaction(async (transaction) => {
    const customer = await transaction.customer.findFirst({
      where: {
        id: input.customerId,
        organizationId: organization.id
      }
    });

    if (!customer) {
      throw new Error("Customer not found in the default organization.");
    }

    let assignmentAssetId = input.assetId;

    if (input.assignmentId) {
      const assignment = await transaction.assignment.findFirst({
        where: {
          id: input.assignmentId,
          organizationId: organization.id
        }
      });

      if (!assignment) {
        throw new Error("Rental not found in the default organization.");
      }

      if (assignment.customerId !== input.customerId) {
        throw new Error("The selected rental belongs to a different customer.");
      }

      assignmentAssetId = assignment.assetId;
    }

    if (assignmentAssetId) {
      const asset = await transaction.asset.findFirst({
        where: {
          id: assignmentAssetId,
          organizationId: organization.id
        }
      });

      if (!asset) {
        throw new Error("Unit not found in the default organization.");
      }
    }

    return transaction.receivableEntry.create({
      data: {
        organizationId: organization.id,
        customerId: input.customerId,
        assignmentId: normalizeNullableString(input.assignmentId),
        assetId: normalizeNullableString(assignmentAssetId),
        type: domainReceivableTypeToPrisma(input.type),
        description: input.description,
        effectiveDate: parseDateOnly(input.effectiveDate),
        dueDate: input.dueDate ? parseDateOnly(input.dueDate) : null,
        amountInCents: normalizeReceivableAmount(input.type, input.amountInCents),
        paymentMethod: normalizeNullableString(input.paymentMethod),
        reference: normalizeNullableString(input.reference),
        notes: normalizeNullableString(input.notes)
      }
    });
  });

  return serializeReceivableEntry(entry);
}

function getRentRunReference(period: string, assignmentId: string): string {
  return `rent-run:${period}:${assignmentId}`;
}

function formatRentRunSiteLabel(assignment: {
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
}): string {
  return formatAssignmentSite(assignment).replace(/\n/gu, " · ") || "No rental site recorded";
}

function calculateRentRunAmount(input: {
  billingCadence: Assignment["billingCadence"];
  rateInCents: number;
  activeDays: number;
  periodDays: number;
}): {
  amountInCents: number;
  calculation: string;
} {
  if (input.activeDays <= 0) {
    return {
      amountInCents: 0,
      calculation: "No active days in period"
    };
  }

  if (input.billingCadence === "daily") {
    return {
      amountInCents: input.rateInCents * input.activeDays,
      calculation: `${input.activeDays} active day${input.activeDays === 1 ? "" : "s"} at ${formatUsdCents(input.rateInCents)} daily`
    };
  }

  if (input.billingCadence === "weekly") {
    const weeks = Math.ceil(input.activeDays / 7);

    return {
      amountInCents: input.rateInCents * weeks,
      calculation: `${weeks} billing week${weeks === 1 ? "" : "s"} from ${input.activeDays} active days`
    };
  }

  if (input.billingCadence === "monthly" && input.activeDays < input.periodDays) {
    return {
      amountInCents: Math.round((input.rateInCents * input.activeDays) / input.periodDays),
      calculation: `Prorated monthly rent: ${input.activeDays} of ${input.periodDays} days`
    };
  }

  return {
    amountInCents: input.rateInCents,
    calculation: input.billingCadence === "custom" ? "Custom cadence uses the stored rate" : "Full monthly rent"
  };
}

export async function getRentRunPreview(
  period = getDefaultRentRunPeriod(),
  dueDate = getDefaultRentRunDueDate(period),
  billingDay = getDefaultRentRunBillingDay()
): Promise<RentRunPreview> {
  const organization = await getDefaultOrganization();
  const normalizedBillingDay = clampBillingDay(billingDay);
  const periodStart = getPeriodStart(period);
  const periodEnd = getPeriodEnd(period);
  const periodDays = getDaysInclusive(periodStart, periodEnd);

  const activeAssignments = await db.assignment.findMany({
    where: {
      organizationId: organization.id,
      status: "ACTIVE",
      startDate: {
        lte: parseDateOnly(periodEnd)
      },
      OR: [
        {
          endDate: null
        },
        {
          endDate: {
            gte: parseDateOnly(periodStart)
          }
        }
      ]
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      asset: {
        select: {
          id: true,
          assetCode: true,
          name: true
        }
      }
    },
    orderBy: [
      {
        customer: {
          name: "asc"
        }
      },
      {
        startDate: "asc"
      }
    ]
  });
  const references = activeAssignments.map((assignment) => getRentRunReference(period, assignment.id));
  const existingEntries =
    references.length > 0
      ? await db.receivableEntry.findMany({
          where: {
            organizationId: organization.id,
            status: "POSTED",
            reference: {
              in: references
            }
          },
          select: {
            id: true,
            reference: true
          }
        })
      : [];
  const existingByReference = new Map(
    existingEntries
      .filter((entry): entry is { id: string; reference: string } => typeof entry.reference === "string")
      .map((entry) => [entry.reference, entry.id])
  );

  const lines = activeAssignments.map((assignment) => {
    const reference = getRentRunReference(period, assignment.id);
    const existingEntryId = existingByReference.get(reference);
    const assignmentStart = dateToIsoDate(assignment.startDate);
    const assignmentEnd = assignment.endDate ? dateToIsoDate(assignment.endDate) : periodEnd;
    const activeStart = assignmentStart > periodStart ? assignmentStart : periodStart;
    const activeEnd = assignmentEnd < periodEnd ? assignmentEnd : periodEnd;
    const activeDays = getDaysInclusive(activeStart, activeEnd);
    const billingCadence = prismaCadenceToDomain(assignment.billingCadence);
    const calculation = calculateRentRunAmount({
      billingCadence,
      rateInCents: assignment.rateInCents,
      activeDays,
      periodDays
    });

    return {
      assignmentId: assignment.id,
      customerId: assignment.customerId,
      customerName: assignment.customer.name,
      customerHref: getCustomerRoute(assignment.customer.id),
      assetId: assignment.assetId,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name,
      assetHref: getAssetRoute(assignment.asset.id),
      siteLabel: formatRentRunSiteLabel(assignment),
      billingCadence,
      amountInCents: calculation.amountInCents,
      baseRateInCents: assignment.rateInCents,
      activeDays,
      periodDays,
      calculation: calculation.calculation,
      startDate: assignmentStart,
      endDate: assignment.endDate ? dateToIsoDate(assignment.endDate) : undefined,
      reference,
      alreadyPosted: Boolean(existingEntryId),
      ...(existingEntryId ? { existingEntryId } : {})
    };
  });
  const readyLines = lines.filter((line) => !line.alreadyPosted && line.amountInCents > 0);

  return {
    organization,
    period,
    billingDay: normalizedBillingDay,
    chargeDate: getRentRunChargeDate(period, normalizedBillingDay),
    dueDate,
    lines,
    readyCount: readyLines.length,
    readyTotalInCents: readyLines.reduce((total, line) => total + line.amountInCents, 0),
    postedCount: lines.length - readyLines.length
  };
}

export async function postRentRun(input: PostRentRunRequest): Promise<{
  postedCount: number;
  skippedCount: number;
  totalInCents: number;
}> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Rent runs must be posted inside the default organization.");
  }

  const preview = await getRentRunPreview(input.period, input.dueDate, input.billingDay);
  const selectedAssignmentIds = new Set(input.assignmentIds);
  const selectedLines = preview.lines.filter((line) => selectedAssignmentIds.has(line.assignmentId) && line.amountInCents > 0);

  if (selectedLines.length === 0) {
    throw new Error("Choose at least one rental to post.");
  }

  let postedCount = 0;
  let skippedCount = 0;
  let totalInCents = 0;

  await db.$transaction(async (transaction) => {
    for (const line of selectedLines) {
      const existingEntry = await transaction.receivableEntry.findFirst({
        where: {
          organizationId: organization.id,
          status: "POSTED",
          reference: line.reference
        },
        select: {
          id: true
        }
      });

      if (existingEntry) {
        skippedCount += 1;
        continue;
      }

      await transaction.receivableEntry.create({
        data: {
          organizationId: organization.id,
          customerId: line.customerId,
          assignmentId: line.assignmentId,
          assetId: line.assetId,
          type: "CHARGE",
          status: "POSTED",
          description: `${formatRentRunPeriodLabel(input.period)} rent`,
          effectiveDate: parseDateOnly(preview.chargeDate),
          dueDate: parseDateOnly(input.dueDate),
          amountInCents: normalizeReceivableAmount("charge", line.amountInCents),
          paymentMethod: null,
          reference: line.reference,
          notes: `Posted from rent run for ${formatRentRunPeriodLabel(input.period)}. ${line.calculation}. Billing day ${input.billingDay}.`
        }
      });

      postedCount += 1;
      totalInCents += line.amountInCents;
    }
  });

  return {
    postedCount,
    skippedCount,
    totalInCents
  };
}

export async function listRentRunHistory(): Promise<RentRunHistoryItem[]> {
  const organization = await getDefaultOrganization();
  const entries = await db.receivableEntry.findMany({
    where: {
      organizationId: organization.id,
      status: "POSTED",
      reference: {
        startsWith: "rent-run:"
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const history = new Map<string, RentRunHistoryItem>();

  for (const entry of entries) {
    const period = entry.reference?.split(":")[1];

    if (!period) {
      continue;
    }

    const existing = history.get(period);

    if (existing) {
      existing.count += 1;
      existing.totalInCents += entry.amountInCents;
      if (dateToIsoDate(entry.createdAt) > existing.postedOn) {
        existing.postedOn = dateToIsoDate(entry.createdAt);
      }
      continue;
    }

    history.set(period, {
      period,
      periodLabel: formatRentRunPeriodLabel(period),
      postedOn: dateToIsoDate(entry.createdAt),
      count: 1,
      totalInCents: entry.amountInCents
    });
  }

  return Array.from(history.values()).sort((left, right) => right.period.localeCompare(left.period));
}

export async function listDocumentTemplates(): Promise<DocumentTemplate[]> {
  const organization = await getDefaultOrganization();

  const templates = await db.documentTemplate.findMany({
    where: {
      organizationId: organization.id
    },
    orderBy: [
      {
        active: "desc"
      },
      {
        type: "asc"
      },
      {
        name: "asc"
      }
    ]
  });

  return templates.map(serializeDocumentTemplate);
}

export async function createDocumentTemplate(input: CreateDocumentTemplateRequest): Promise<DocumentTemplate> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Document templates must be created inside the default organization.");
  }

  const template = await db.documentTemplate.create({
    data: {
      organizationId: organization.id,
      type: domainDocumentTemplateTypeToPrisma(input.type),
      name: input.name,
      subject: normalizeNullableString(input.subject),
      body: input.body,
      mergeFields: input.mergeFields,
      printEnabled: input.printEnabled,
      emailEnabled: input.emailEnabled,
      active: true
    }
  });

  return serializeDocumentTemplate(template);
}

function renderTemplateText(templateText: string | null | undefined, values: Record<string, string>): string | null {
  if (!templateText) {
    return null;
  }

  return templateText.replace(/\{\{\s*([a-zA-Z0-9.]+)\s*\}\}/gu, (_match, key: string) => values[key] ?? "");
}

function formatAssignmentSite(assignment: {
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
}): string {
  return [
    assignment.siteName,
    assignment.siteStreet1,
    assignment.siteStreet2,
    [assignment.siteCity, assignment.siteState, assignment.sitePostalCode].filter(Boolean).join(", ")
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

export async function getDocumentFormOptions(): Promise<{
  organization: Organization;
  templates: DocumentTemplate[];
  customers: ReceivableCustomerOption[];
  rentals: DocumentRentalOption[];
}> {
  const [organization, templates, receivableOptions] = await Promise.all([
    getDefaultOrganization(),
    listDocumentTemplates(),
    getReceivableFormOptions()
  ]);

  return {
    organization,
    templates: templates.filter((template) => template.active),
    customers: receivableOptions.customers,
    rentals: receivableOptions.assignments.map((assignment) => ({
      id: assignment.id,
      customerId: assignment.customerId,
      assetId: assignment.assetId,
      label: assignment.label
    }))
  };
}

export async function listGeneratedDocuments(): Promise<GeneratedDocumentListItem[]> {
  const organization = await getDefaultOrganization();

  const documents = await db.generatedDocument.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          assetCode: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return documents.map((document) => ({
    ...serializeGeneratedDocument(document),
    customerName: document.customer?.name,
    customerHref: document.customer ? getCustomerRoute(document.customer.id) : undefined,
    assetCode: document.asset?.assetCode,
    assignmentHref: document.assignment ? getAssignmentRoute(document.assignment.id) : undefined
  }));
}

export async function getGeneratedDocumentDetail(documentId: string): Promise<GeneratedDocumentDetail | null> {
  const organization = await getDefaultOrganization();

  const document = await db.generatedDocument.findFirst({
    where: {
      id: documentId,
      organizationId: organization.id
    },
    include: {
      template: {
        select: {
          name: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          assetCode: true
        }
      }
    }
  });

  if (!document) {
    return null;
  }

  return {
    document: {
      ...serializeGeneratedDocument(document),
      customerName: document.customer?.name,
      customerHref: document.customer ? getCustomerRoute(document.customer.id) : undefined,
      assetCode: document.asset?.assetCode,
      assignmentHref: document.assignment ? getAssignmentRoute(document.assignment.id) : undefined
    },
    templateName: document.template?.name
  };
}

export async function previewGeneratedDocument(input: CreateGeneratedDocumentRequest): Promise<GeneratedDocumentDraft> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be created inside the default organization.");
  }

  const template = await db.documentTemplate.findFirst({
    where: {
      id: input.templateId,
      organizationId: organization.id,
      active: true
    }
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  const assignment = input.assignmentId
    ? await db.assignment.findFirst({
        where: {
          id: input.assignmentId,
          organizationId: organization.id
        },
        include: {
          customer: {
            include: {
              receivableEntries: {
                where: {
                  status: "POSTED"
                }
              }
            }
          },
          asset: true
        }
      })
    : null;

  const customerId = assignment?.customerId ?? input.customerId;

  if (!customerId) {
    throw new Error("Choose a customer or rental.");
  }

  const customer =
    assignment?.customer ??
    (await db.customer.findFirst({
      where: {
        id: customerId,
        organizationId: organization.id
      },
      include: {
        receivableEntries: {
          where: {
            status: "POSTED"
          }
        }
      }
    }));

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const balance = summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), getTodayIsoDate());
  const asset = assignment?.asset;
  const values: Record<string, string> = {
    "organization.name": organization.name,
    "customer.name": customer.name,
    "customer.companyName": customer.companyName ?? "",
    "customer.email": customer.email ?? "",
    "customer.phone": customer.phone ?? "",
    "unit.assetCode": asset?.assetCode ?? "",
    "unit.name": asset?.name ?? "",
    "unit.size": asset?.sizeLabel ?? "",
    "unit.condition": asset?.condition ?? "",
    "rental.startDate": assignment ? dateToIsoDate(assignment.startDate) : "",
    "rental.endDate": assignment?.endDate ? dateToIsoDate(assignment.endDate) : "",
    "rental.rate": assignment ? formatUsdCents(assignment.rateInCents) : "",
    "rental.siteAddress": assignment ? formatAssignmentSite(assignment) : "",
    "rental.placementNotes": assignment?.placementNotes ?? "",
    "balance.amount": formatUsdCents(balance.balanceInCents),
    "balance.pastDue": formatUsdCents(balance.pastDueInCents),
    "payment.amount": "",
    "payment.reference": ""
  };
  const title =
    input.title?.trim() ||
    `${template.name}${customer.name ? ` - ${customer.name}` : ""}`;

  return {
    templateId: template.id,
    customerId: customer.id,
    assignmentId: assignment?.id ?? undefined,
    assetId: asset?.id ?? undefined,
    type: prismaDocumentTemplateTypeToDomain(template.type),
    title,
    subject: renderTemplateText(template.subject, values) ?? undefined,
    body: renderTemplateText(template.body, values) ?? "",
    recipientEmail: customer.email ?? undefined,
    customerName: customer.name,
    assetCode: asset?.assetCode ?? undefined
  };
}

export async function createGeneratedDocument(input: CreateGeneratedDocumentRequest): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();
  const draft = await previewGeneratedDocument(input);

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: normalizeNullableString(draft.templateId),
      customerId: draft.customerId,
      assignmentId: normalizeNullableString(draft.assignmentId),
      assetId: normalizeNullableString(draft.assetId),
      type: domainDocumentTemplateTypeToPrisma(draft.type),
      title: draft.title,
      subject: normalizeNullableString(draft.subject),
      body: draft.body,
      recipientEmail: normalizeNullableString(draft.recipientEmail)
    }
  });

  return serializeGeneratedDocument(document);
}

export async function saveGeneratedDocumentDraft(input: SaveGeneratedDocumentDraftRequest): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be saved inside the default organization.");
  }

  const customer = await db.customer.findFirst({
    where: {
      id: input.customerId,
      organizationId: organization.id
    }
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: normalizeNullableString(input.templateId),
      customerId: input.customerId,
      assignmentId: normalizeNullableString(input.assignmentId),
      assetId: normalizeNullableString(input.assetId),
      type: domainDocumentTemplateTypeToPrisma(input.type),
      title: input.title,
      subject: normalizeNullableString(input.subject),
      body: input.body,
      recipientEmail: normalizeNullableString(input.recipientEmail)
    }
  });

  return serializeGeneratedDocument(document);
}

function formatCustomerBillingAddress(customer: {
  billingStreet1: string | null;
  billingStreet2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
}): string {
  const cityStatePostal = [customer.billingCity, customer.billingState, customer.billingPostalCode]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  return [
    customer.billingStreet1,
    customer.billingStreet2,
    cityStatePostal,
    customer.billingCountry
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

function formatStatementEntryLine(entry: {
  effectiveDate: Date;
  dueDate: Date | null;
  description: string;
  amountInCents: number;
  asset: {
    assetCode: string;
  } | null;
}): string {
  const dueLabel = entry.dueDate ? `Due ${dateToIsoDate(entry.dueDate)}` : "No due date";
  const unitLabel = entry.asset?.assetCode ?? "Account";

  return `${dateToIsoDate(entry.effectiveDate)} | ${unitLabel} | ${entry.description} | ${dueLabel} | ${formatUsdCents(
    entry.amountInCents
  )}`;
}

export async function createAccountStatementDocument(
  input: CreateAccountStatementDocumentRequest
): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Account statements must be created inside the default organization.");
  }

  const customer = await db.customer.findFirst({
    where: {
      id: input.customerId,
      organizationId: organization.id
    },
    include: {
      receivableEntries: {
        where: {
          status: "POSTED"
        },
        include: {
          asset: {
            select: {
              assetCode: true
            }
          }
        },
        orderBy: [
          {
            effectiveDate: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      }
    }
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const today = getTodayIsoDate();
  const balance = summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today);
  const statementLines = customer.receivableEntries.map(formatStatementEntryLine);
  const billingAddress = formatCustomerBillingAddress(customer);
  const body = [
    `${organization.name}`,
    "",
    `Account statement for ${customer.name}`,
    customer.companyName ? `Company: ${customer.companyName}` : undefined,
    customer.email ? `Email: ${customer.email}` : undefined,
    customer.phone ? `Phone: ${customer.phone}` : undefined,
    billingAddress ? `Billing address:\n${billingAddress}` : undefined,
    "",
    "Account activity",
    statementLines.length > 0 ? statementLines.join("\n") : "No posted charges or payments yet.",
    "",
    `Total charges: ${formatUsdCents(balance.totalChargesInCents)}`,
    `Payments and credits: ${formatUsdCents(balance.totalCreditsInCents)}`,
    `Balance due: ${formatUsdCents(balance.balanceInCents)}`,
    `Past due: ${formatUsdCents(balance.pastDueInCents)}`,
    balance.lastPaymentDate ? `Last payment or credit: ${balance.lastPaymentDate}` : undefined
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
  const title = input.title?.trim() || `Account statement - ${customer.name} - ${today}`;

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: null,
      customerId: customer.id,
      assignmentId: null,
      assetId: null,
      type: "ACCOUNT_STATEMENT",
      title,
      subject: `Account statement from ${organization.name}`,
      body,
      recipientEmail: customer.email
    }
  });

  return serializeGeneratedDocument(document);
}

export async function updateGeneratedDocumentStatus(
  input: UpdateGeneratedDocumentStatusRequest
): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be updated inside the default organization.");
  }

  const document = await db.generatedDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: organization.id
    }
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const now = new Date();
  const updatedDocument = await db.generatedDocument.update({
    where: {
      id: document.id
    },
    data:
      input.status === "printed"
        ? {
            status: "PRINTED",
            printedAt: now
          }
        : {
            status: "EMAILED",
            emailedAt: now
          }
  });

  return serializeGeneratedDocument(updatedDocument);
}

export async function getReportsSnapshot(): Promise<{
  organization: Organization;
  unitCounts: Array<{ label: string; count: number }>;
  rentalCounts: Array<{ label: string; count: number }>;
  balances: CustomerBalanceSummary[];
  monthlyPaymentsInCents: number;
  openBalanceInCents: number;
  pastDueInCents: number;
}> {
  const organization = await getDefaultOrganization();
  const today = getTodayIsoDate();
  const monthStart = today.slice(0, 8) + "01";

  const [assets, assignments, customers] = await Promise.all([
    db.asset.findMany({
      where: {
        organizationId: organization.id
      }
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id
      }
    }),
    db.customer.findMany({
      where: {
        organizationId: organization.id
      },
      include: {
        receivableEntries: {
          where: {
            status: "POSTED"
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    })
  ]);

  const unitStatusCounts = new Map<AssetStatus, number>();
  for (const asset of assets) {
    const status = prismaStatusToAssetStatus(asset.status);
    unitStatusCounts.set(status, (unitStatusCounts.get(status) ?? 0) + 1);
  }

  const rentalStatusCounts = new Map<Assignment["status"], number>();
  for (const assignment of assignments) {
    const status = prismaStatusToAssignmentStatus(assignment.status);
    rentalStatusCounts.set(status, (rentalStatusCounts.get(status) ?? 0) + 1);
  }

  const balances = customers
    .map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      ...summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today)
    }))
    .sort((left, right) => right.balanceInCents - left.balanceInCents || left.customerName.localeCompare(right.customerName));
  const monthlyPaymentsInCents = balances.reduce((total, balance) => {
    const customer = customers.find((record) => record.id === balance.customerId);

    if (!customer) {
      return total;
    }

    return (
      total +
      customer.receivableEntries
        .map(serializeReceivableEntry)
        .filter((entry) => entry.amountInCents < 0 && entry.effectiveDate >= monthStart)
        .reduce((entryTotal, entry) => entryTotal + Math.abs(entry.amountInCents), 0)
    );
  }, 0);

  return {
    organization,
    unitCounts: Array.from(unitStatusCounts.entries()).map(([label, count]) => ({ label, count })),
    rentalCounts: Array.from(rentalStatusCounts.entries()).map(([label, count]) => ({ label, count })),
    balances,
    monthlyPaymentsInCents,
    openBalanceInCents: balances.reduce((total, balance) => total + balance.balanceInCents, 0),
    pastDueInCents: balances.reduce((total, balance) => total + balance.pastDueInCents, 0)
  };
}
