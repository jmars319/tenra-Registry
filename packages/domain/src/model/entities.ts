import type { RegistryRole } from "@registry/auth";
import type { AuditFields, EntityId, ISODateTimeString, ISODateString, MoneyAmount } from "@registry/shared-types";
import type {
  AssetCategory,
  AssetStatus,
  AssignmentStatus,
  BillingCadence,
  BalanceState,
  CustomerStatus,
  DocumentTemplateType,
  GeneratedDocumentStatus,
  InvoiceStatus,
  OrganizationStatus,
  ReceivableEntryStatus,
  ReceivableEntryType
} from "./statuses";

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

export interface GeneratedDocument extends AuditFields {
  id: EntityId;
  organizationId: EntityId;
  templateId?: EntityId | undefined;
  customerId?: EntityId | undefined;
  assignmentId?: EntityId | undefined;
  assetId?: EntityId | undefined;
  type: DocumentTemplateType;
  status: GeneratedDocumentStatus;
  title: string;
  subject?: string | undefined;
  body: string;
  recipientEmail?: string | undefined;
  printedAt?: ISODateTimeString | undefined;
  emailedAt?: ISODateTimeString | undefined;
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
