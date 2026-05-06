import type {
  Assignment,
  Asset,
  Customer,
  DocumentTemplate,
  GeneratedDocument,
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

export interface PostRentRunRequest {
  organizationId: EntityId;
  period: string;
  dueDate: string;
  billingDay: number;
  assignmentIds: EntityId[];
}

export interface PostRentRunResponse {
  postedCount: number;
  skippedCount: number;
  totalInCents: number;
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

export interface CreateGeneratedDocumentRequest {
  organizationId: EntityId;
  templateId: EntityId;
  customerId?: EntityId | undefined;
  assignmentId?: EntityId | undefined;
  title?: GeneratedDocument["title"] | undefined;
}

export interface CreateGeneratedDocumentResponse {
  document: GeneratedDocument;
}

export interface SaveGeneratedDocumentDraftRequest {
  organizationId: EntityId;
  templateId?: EntityId | undefined;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  assetId?: EntityId | undefined;
  type: GeneratedDocument["type"];
  title: GeneratedDocument["title"];
  subject?: GeneratedDocument["subject"] | undefined;
  body: GeneratedDocument["body"];
  recipientEmail?: GeneratedDocument["recipientEmail"] | undefined;
}

export interface CreateAccountStatementDocumentRequest {
  organizationId: EntityId;
  customerId: EntityId;
  title?: GeneratedDocument["title"] | undefined;
}

export interface UpdateGeneratedDocumentStatusRequest {
  organizationId: EntityId;
  documentId: EntityId;
  status: Extract<GeneratedDocument["status"], "printed" | "emailed">;
}

export interface RegistryLedgerExportRow {
  externalId: EntityId;
  customerCode: EntityId;
  customerName: string;
  rentalCode?: EntityId | undefined;
  unitCode?: string | undefined;
  entryType: ReceivableEntry["type"];
  effectiveDate: ReceivableEntry["effectiveDate"];
  description: ReceivableEntry["description"];
  amountMinor: ReceivableEntry["amountInCents"];
  paymentMethod?: ReceivableEntry["paymentMethod"] | undefined;
  reference?: ReceivableEntry["reference"] | undefined;
  notes?: ReceivableEntry["notes"] | undefined;
}

export interface RegistryLedgerExport {
  schema: "tenra-registry.ledger-export.v1";
  exportedAt: string;
  organizationId: EntityId;
  sourceApp: "registry";
  rows: RegistryLedgerExportRow[];
}

export interface BuildRegistryLedgerExportInput {
  organizationId: EntityId;
  exportedAt?: string | undefined;
  entries: ReceivableEntry[];
  customers: Array<Pick<Customer, "id" | "name">>;
  assignments?: Array<Pick<Assignment, "id">> | undefined;
  assets?: Array<Pick<Asset, "id" | "assetCode">> | undefined;
}

export function buildRegistryLedgerExport(input: BuildRegistryLedgerExportInput): RegistryLedgerExport {
  const customersById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const assignmentIds = new Set((input.assignments ?? []).map((assignment) => assignment.id));
  const assetsById = new Map((input.assets ?? []).map((asset) => [asset.id, asset]));

  return {
    schema: "tenra-registry.ledger-export.v1",
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    sourceApp: "registry",
    rows: input.entries
      .filter((entry) => entry.status === "posted")
      .map((entry) => {
        const customer = customersById.get(entry.customerId);
        const asset = entry.assetId ? assetsById.get(entry.assetId) : undefined;
        const rentalCode =
          entry.assignmentId && (assignmentIds.size === 0 || assignmentIds.has(entry.assignmentId))
            ? entry.assignmentId
            : undefined;

        return {
          externalId: entry.id,
          customerCode: entry.customerId,
          customerName: customer?.name ?? entry.customerId,
          rentalCode,
          unitCode: asset?.assetCode,
          entryType: entry.type,
          effectiveDate: entry.effectiveDate,
          description: entry.description,
          amountMinor: entry.amountInCents,
          paymentMethod: entry.paymentMethod,
          reference: entry.reference,
          notes: entry.notes
        };
      })
  };
}

export interface RegistryAssemblyDocumentRequest {
  schema: "tenra-registry.assembly-document-request.v1";
  exportedAt: string;
  sourceApp: "registry";
  organizationId: EntityId;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  documentType: GeneratedDocument["type"];
  title: string;
  contextMarkdown: string;
  desiredOutput: "letter" | "email" | "notice" | "agreement" | "statement";
}
