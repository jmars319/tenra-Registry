import type { CreateAssignmentRequest, TransitionAssignmentStatusRequest } from "@registry/api-contracts";
import { getAssetRoute, getAssignmentRoute, getCustomerRoute } from "@registry/config";
import type { Assignment, Organization } from "@registry/domain";
import { canTransitionAssignmentStatus, summarizeReceivableEntries } from "@registry/domain";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import {
  assertAssetCanBeActivated,
  findActiveAssignmentForAsset,
  serializeAsset,
  serializeAssignment,
  serializeCustomer,
  serializeReceivableEntry,
  sortAssignments,
  sortReceivableEntries
} from "./mappers";
import {
  domainAssignmentStatusToPrisma,
  domainCadenceToPrisma,
  getAssignmentTransitionErrorMessage,
  getTodayIsoDate,
  normalizeNullableString,
  parseDateOnly,
  prismaStatusToAssetStatus,
  prismaStatusToAssignmentStatus
} from "./shared";
import type {
  AssignmentDetail,
  AssignmentFormOption,
  AssignmentLifecycleResult,
  AssignmentListItem
} from "./types";

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
