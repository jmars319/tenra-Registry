import type { CreateCustomerRequest } from "@registry/api-contracts";
import { getAssetRoute, getAssignmentRoute, getCustomerRoute } from "@registry/config";
import { summarizeReceivableEntries } from "@registry/domain";
import type { Customer } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import {
  serializeAssignment,
  serializeCustomer,
  serializeReceivableEntry,
  sortAssignments,
  sortCustomers,
  sortReceivableEntries
} from "./mappers";
import { getTodayIsoDate, normalizeNullableString } from "./shared";
import type { CustomerDetail, CustomerListItem } from "./types";

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
