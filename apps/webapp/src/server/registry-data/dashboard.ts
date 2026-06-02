import { getAssignmentRoute } from "@registry/config";
import type { CustomerBalanceSummary, Organization } from "@registry/domain";
import { summarizeReceivableEntries } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeAssignment, serializeReceivableEntry } from "./mappers";
import { getTodayIsoDate } from "./shared";
import type { DashboardAssignmentItem } from "./types";

export async function getDashboardSnapshot(): Promise<{
  organization: Organization;
  counts: {
    customers: number;
    units: number;
    activeRentals: number;
    availableUnits: number;
    balanceDueInCents: number;
    pastDueInCents: number;
    paymentsThisMonthInCents: number;
  };
  activeAssignments: DashboardAssignmentItem[];
  priorityBalances: CustomerBalanceSummary[];
  pickupQueue: DashboardAssignmentItem[];
}> {
  const organization = await getDefaultOrganization();
  const today = getTodayIsoDate();
  const monthStart = today.slice(0, 8) + "01";

  const [
    customers,
    units,
    activeRentals,
    availableUnits,
    activeAssignments,
    pickupQueue,
    receivableEntries,
    customersWithEntries
  ] = await Promise.all([
    db.customer.count({
      where: {
        organizationId: organization.id,
        status: "ACTIVE"
      }
    }),
    db.asset.count({
      where: {
        organizationId: organization.id,
        category: "UNIT"
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
        status: "AVAILABLE",
        category: "UNIT"
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
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        pickupRequestedOn: {
          not: null
        },
        pickedUpOn: null
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
        pickupRequestedOn: "asc"
      },
      take: 5
    }),
    db.receivableEntry.findMany({
      where: {
        organizationId: organization.id,
        status: "POSTED"
      }
    }),
    db.customer.findMany({
      where: {
        organizationId: organization.id
      },
      include: {
        receivableEntries: {
          where: {
            status: "POSTED"
          }
        }
      }
    })
  ]);

  const receivableSummary = summarizeReceivableEntries(receivableEntries.map(serializeReceivableEntry), today);
  const priorityBalances = customersWithEntries
    .map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      ...summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today)
    }))
    .filter((balance) => balance.balanceInCents > 0 || balance.pastDueInCents > 0)
    .sort((left, right) => right.pastDueInCents - left.pastDueInCents || right.balanceInCents - left.balanceInCents)
    .slice(0, 5);
  const paymentsThisMonthInCents = receivableEntries
    .map(serializeReceivableEntry)
    .filter((entry) => entry.amountInCents < 0 && entry.effectiveDate >= monthStart)
    .reduce((total, entry) => total + Math.abs(entry.amountInCents), 0);

  return {
    organization,
    counts: {
      customers,
      units,
      activeRentals,
      availableUnits,
      balanceDueInCents: receivableSummary.balanceInCents,
      pastDueInCents: receivableSummary.pastDueInCents,
      paymentsThisMonthInCents
    },
    activeAssignments: activeAssignments.map((assignment) => ({
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name
    })),
    priorityBalances,
    pickupQueue: pickupQueue.map((assignment) => ({
      ...serializeAssignment(assignment),
      href: getAssignmentRoute(assignment.id),
      customerName: assignment.customer.name,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name
    }))
  };
}
