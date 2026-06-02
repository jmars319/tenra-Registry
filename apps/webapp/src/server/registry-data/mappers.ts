import type {
  Assignment,
  Asset,
  AssetStatus,
  Customer,
  CustomerStatus,
  DocumentTemplate,
  GeneratedDocument,
  Organization,
  ReceivableEntry,
  ReceivableEntryType
} from "@registry/domain";
import {
  assignmentStatusOrder,
  assetStatusOrder,
  customerStatusOrder,
  dateToIsoDate,
  dateToIsoDateTime,
  getAssetActivationErrorMessage,
  normalizeOptionalString,
  prismaCadenceToDomain,
  prismaDocumentTemplateTypeToDomain,
  prismaGeneratedDocumentStatusToDomain,
  prismaReceivableStatusToDomain,
  prismaReceivableTypeToDomain,
  prismaStatusToAssetStatus,
  prismaStatusToAssignmentStatus,
  prismaStatusToCustomerStatus,
  prismaStatusToOrganizationStatus,
  receivableTypeOrder
} from "./shared";
import type { PrismaGeneratedDocumentStatus, RegistryTransaction } from "./shared";

export async function findActiveAssignmentForAsset(
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

export function assertAssetCanBeActivated(assetStatus: AssetStatus): void {
  const errorMessage = getAssetActivationErrorMessage(assetStatus);

  if (errorMessage) {
    throw new Error(errorMessage);
  }
}

export function serializeOrganization(record: {
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

export function serializeCustomer(record: {
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

export function serializeAsset(record: {
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

export function serializeAssignment(record: {
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

export function serializeReceivableEntry(record: {
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

export function serializeDocumentTemplate(record: {
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

export function serializeGeneratedDocument(record: {
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

export function sortCustomers<T extends { status: CustomerStatus; name: string }>(customers: T[]): T[] {
  return [...customers].sort((left, right) => {
    const statusDelta = (customerStatusOrder.get(left.status) ?? 99) - (customerStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.name.localeCompare(right.name);
  });
}

export function sortAssets<T extends { status: AssetStatus; assetCode: string }>(assets: T[]): T[] {
  return [...assets].sort((left, right) => {
    const statusDelta = (assetStatusOrder.get(left.status) ?? 99) - (assetStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return left.assetCode.localeCompare(right.assetCode);
  });
}

export function sortAssignments<T extends { status: Assignment["status"]; startDate: string }>(assignments: T[]): T[] {
  return [...assignments].sort((left, right) => {
    const statusDelta =
      (assignmentStatusOrder.get(left.status) ?? 99) - (assignmentStatusOrder.get(right.status) ?? 99);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return right.startDate.localeCompare(left.startDate);
  });
}

export function sortReceivableEntries<T extends { effectiveDate: string; type: ReceivableEntryType }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    const dateDelta = right.effectiveDate.localeCompare(left.effectiveDate);

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return (receivableTypeOrder.get(left.type) ?? 99) - (receivableTypeOrder.get(right.type) ?? 99);
  });
}
