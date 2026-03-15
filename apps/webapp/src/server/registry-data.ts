import type {
  CreateAssignmentRequest,
  CreateAssetRequest,
  CreateCustomerRequest,
  TransitionAssignmentStatusRequest
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
  CustomerStatus,
  Organization,
  OrganizationStatus
} from "@registry/domain";
import { canTransitionAssignmentStatus } from "@registry/domain";
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

type RegistryTransaction = Prisma.TransactionClient;

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

function getAssetActivationErrorMessage(assetStatus: AssetStatus): string | null {
  switch (assetStatus) {
    case "available":
      return null;
    case "assigned":
      return "This asset is already assigned and cannot be activated.";
    case "maintenance":
      return "This asset is in maintenance and cannot be activated.";
    case "archived":
      return "This asset is archived and cannot be activated.";
    default:
      return "This asset cannot be activated.";
  }
}

function getAssignmentTransitionErrorMessage(
  currentStatus: Assignment["status"],
  nextStatus: AssignmentTransitionTarget
): string {
  if (currentStatus === "completed") {
    return "Completed assignments cannot be changed.";
  }

  if (currentStatus === "cancelled") {
    return "Cancelled assignments cannot be changed.";
  }

  if (currentStatus === nextStatus) {
    return `This assignment is already ${currentStatus}.`;
  }

  if (currentStatus === "draft") {
    return "Draft assignments can only be activated or cancelled.";
  }

  if (currentStatus === "active") {
    return "Active assignments can only be completed or cancelled.";
  }

  return "This assignment transition is not allowed.";
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
    notes: normalizeOptionalString(record.notes),
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

export interface DashboardAssignmentItem extends Assignment {
  href: string;
  customerName: string;
  assetCode: string;
  assetName: string;
}

export interface CustomerListItem extends Customer {
  href: string;
  activeAssignmentCount: number;
}

export interface CustomerDetail {
  customer: Customer;
  assignments: DashboardAssignmentItem[];
}

export interface AssetListItem extends Asset {
  href: string;
  activeAssignment?: {
    assignmentId: string;
    customerName: string;
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
    throw new Error("No organization found. Run the webapp seed step before using Registry.");
  }

  return serializeOrganization(organization);
}

export async function getDashboardSnapshot(): Promise<{
  organization: Organization;
  counts: {
    customers: number;
    assets: number;
    activeAssignments: number;
    availableAssets: number;
  };
  activeAssignments: DashboardAssignmentItem[];
}> {
  const organization = await getDefaultOrganization();

  const [customers, assets, activeAssignmentsCount, availableAssets, activeAssignments] = await Promise.all([
    db.customer.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE"
      }
    }),
    db.asset.count({
      where: {
        organizationId: organization.id
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
        status: "AVAILABLE"
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
    })
  ]);

  return {
    organization,
    counts: {
      customers,
      assets,
      activeAssignments: activeAssignmentsCount,
      availableAssets
    },
    activeAssignments: activeAssignments.map((assignment) => ({
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
      }
    }
  });

  return sortCustomers(
    records.map((record) => ({
      ...serializeCustomer(record),
      href: getCustomerRoute(record.id),
      activeAssignmentCount: record.assignments.length
    }))
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

  const assignments = await db.assignment.findMany({
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
          assetCode: true,
          name: true
        }
      }
    }
  });

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
    )
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
            customerName: record.assignments[0].customer.name
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
    asset: serializeAsset(assignment.asset)
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
    throw new Error("Assignments must be created inside the default organization.");
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
          throw new Error("Asset not found in the default organization.");
        }

        if (input.status === "active") {
          assertAssetCanBeActivated(prismaStatusToAssetStatus(asset.status));
          const existingActiveAssignment = await findActiveAssignmentForAsset(
            transaction,
            organization.id,
            input.assetId
          );

          if (existingActiveAssignment) {
            throw new Error("That asset already has an active assignment.");
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
      throw new Error("That asset already has an active assignment.");
    }

    throw error;
  }
}

export async function transitionAssignmentStatus(
  input: TransitionAssignmentStatusRequest
): Promise<AssignmentLifecycleResult> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Assignments must be updated inside the default organization.");
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
          throw new Error("Assignment not found in the default organization.");
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
            throw new Error("That asset already has an active assignment.");
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
      throw new Error("That asset already has an active assignment.");
    }

    throw error;
  }
}
