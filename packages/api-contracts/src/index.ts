import type {
  Assignment,
  Asset,
  Customer,
  Organization
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
}

export interface CreateAssignmentResponse {
  assignment: Assignment;
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
