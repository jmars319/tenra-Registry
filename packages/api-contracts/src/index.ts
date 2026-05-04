import type {
  Assignment,
  Asset,
  Customer,
  DocumentTemplate,
  Organization,
  ReceivableEntry
} from "@registry/domain";
import type { EntityId } from "@registry/shared-types";

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
}

export interface CreateOrganizationResponse {
  organization: Organization;
}

export interface CreateCustomerRequest {
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
}

export interface CreateCustomerResponse {
  customer: Customer;
}

export interface ListCustomersRequest {
  organizationId: EntityId;
  status?: Customer["status"] | undefined;
}

export interface ListCustomersResponse {
  customers: Customer[];
}

export interface CreateAssetRequest {
  organizationId: EntityId;
  assetCode: string;
  name: string;
  category: Asset["category"];
  currentLocation?: string | undefined;
  homeLocation?: string | undefined;
  sizeLabel?: string | undefined;
  unitType?: string | undefined;
  condition?: string | undefined;
  notes?: string | undefined;
}

export interface CreateAssetResponse {
  asset: Asset;
}

export interface ListAssetsRequest {
  organizationId: EntityId;
  status?: Asset["status"] | undefined;
}

export interface ListAssetsResponse {
  assets: Asset[];
}

export interface CreateAssignmentRequest {
  organizationId: EntityId;
  customerId: EntityId;
  assetId: EntityId;
  startDate: Assignment["startDate"];
  endDate?: Assignment["endDate"] | undefined;
  billingCadence: Assignment["billingCadence"];
  rateInCents: Assignment["rateInCents"];
  notes?: Assignment["notes"] | undefined;
  status: Assignment["status"];
  siteName?: Assignment["siteName"] | undefined;
  siteStreet1?: Assignment["siteStreet1"] | undefined;
  siteStreet2?: Assignment["siteStreet2"] | undefined;
  siteCity?: Assignment["siteCity"] | undefined;
  siteState?: Assignment["siteState"] | undefined;
  sitePostalCode?: Assignment["sitePostalCode"] | undefined;
  deliveryScheduledFor?: Assignment["deliveryScheduledFor"] | undefined;
  deliveredOn?: Assignment["deliveredOn"] | undefined;
  pickupRequestedOn?: Assignment["pickupRequestedOn"] | undefined;
  pickedUpOn?: Assignment["pickedUpOn"] | undefined;
  placementNotes?: Assignment["placementNotes"] | undefined;
}

export interface CreateAssignmentResponse {
  assignment: Assignment;
}

export interface TransitionAssignmentStatusRequest {
  organizationId: EntityId;
  assignmentId: EntityId;
  nextStatus: "active" | "completed" | "cancelled";
}

export interface TransitionAssignmentStatusResponse {
  assignment: Assignment;
  asset: Asset;
}

export interface ListAssignmentsRequest {
  organizationId: EntityId;
  customerId?: EntityId | undefined;
  assetId?: EntityId | undefined;
  status?: Assignment["status"] | undefined;
}

export interface ListAssignmentsResponse {
  assignments: Assignment[];
}

export interface CreateReceivableEntryRequest {
  organizationId: EntityId;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  assetId?: EntityId | undefined;
  type: ReceivableEntry["type"];
  description: ReceivableEntry["description"];
  effectiveDate: ReceivableEntry["effectiveDate"];
  dueDate?: ReceivableEntry["dueDate"] | undefined;
  amountInCents: ReceivableEntry["amountInCents"];
  paymentMethod?: ReceivableEntry["paymentMethod"] | undefined;
  reference?: ReceivableEntry["reference"] | undefined;
  notes?: ReceivableEntry["notes"] | undefined;
}

export interface CreateReceivableEntryResponse {
  entry: ReceivableEntry;
}

export interface ListReceivableEntriesRequest {
  organizationId: EntityId;
  customerId?: EntityId | undefined;
  assignmentId?: EntityId | undefined;
}

export interface ListReceivableEntriesResponse {
  entries: ReceivableEntry[];
}

export interface CreateDocumentTemplateRequest {
  organizationId: EntityId;
  type: DocumentTemplate["type"];
  name: DocumentTemplate["name"];
  subject?: DocumentTemplate["subject"] | undefined;
  body: DocumentTemplate["body"];
  mergeFields: DocumentTemplate["mergeFields"];
  printEnabled: DocumentTemplate["printEnabled"];
  emailEnabled: DocumentTemplate["emailEnabled"];
}

export interface CreateDocumentTemplateResponse {
  template: DocumentTemplate;
}
