import type { CreateReceivableEntryRequest } from "@registry/api-contracts";
import { getAssetRoute, getAssignmentRoute, getCustomerRoute } from "@registry/config";
import type { Organization, ReceivableEntry } from "@registry/domain";
import { normalizeReceivableAmount } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeReceivableEntry, sortReceivableEntries } from "./mappers";
import {
  domainReceivableTypeToPrisma,
  dateToIsoDate,
  normalizeNullableString,
  parseDateOnly
} from "./shared";
import type {
  ReceivableAssignmentOption,
  ReceivableCustomerOption,
  ReceivableListItem
} from "./types";

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
