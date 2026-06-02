import type {
  Assignment,
  Asset,
  AssetStatus,
  Customer,
  CustomerBalanceSummary,
  DocumentTemplateType,
  GeneratedDocument,
  Organization,
  ReceivableEntry
} from "@registry/domain";
import type { Prisma } from "@prisma/client";

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

export interface HandoffAuditSummary {
  id: string;
  exportId: string;
  schema: string;
  targetApp: string;
  subjectId?: string | undefined;
  rowCount: number;
  payloadSummary: Prisma.JsonValue;
  downloadCount: number;
  lastDeliveryStatus: string;
  lastDeliveryMessage?: string | undefined;
  lastDeliveryUpdatedAt?: string | undefined;
  firstExportedAt: string;
  lastExportedAt: string;
}
