import type { Assignment, AssetStatus, CustomerBalanceSummary, Organization } from "@registry/domain";
import { summarizeReceivableEntries } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeReceivableEntry } from "./mappers";
import { getTodayIsoDate, prismaStatusToAssetStatus, prismaStatusToAssignmentStatus } from "./shared";

export async function getReportsSnapshot(): Promise<{
  organization: Organization;
  unitCounts: Array<{ label: string; count: number }>;
  rentalCounts: Array<{ label: string; count: number }>;
  balances: CustomerBalanceSummary[];
  monthlyPaymentsInCents: number;
  openBalanceInCents: number;
  pastDueInCents: number;
}> {
  const organization = await getDefaultOrganization();
  const today = getTodayIsoDate();
  const monthStart = today.slice(0, 8) + "01";

  const [assets, assignments, customers] = await Promise.all([
    db.asset.findMany({
      where: {
        organizationId: organization.id
      }
    }),
    db.assignment.findMany({
      where: {
        organizationId: organization.id
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
      },
      orderBy: {
        name: "asc"
      }
    })
  ]);

  const unitStatusCounts = new Map<AssetStatus, number>();
  for (const asset of assets) {
    const status = prismaStatusToAssetStatus(asset.status);
    unitStatusCounts.set(status, (unitStatusCounts.get(status) ?? 0) + 1);
  }

  const rentalStatusCounts = new Map<Assignment["status"], number>();
  for (const assignment of assignments) {
    const status = prismaStatusToAssignmentStatus(assignment.status);
    rentalStatusCounts.set(status, (rentalStatusCounts.get(status) ?? 0) + 1);
  }

  const balances = customers
    .map((customer) => ({
      customerId: customer.id,
      customerName: customer.name,
      ...summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today)
    }))
    .sort((left, right) => right.balanceInCents - left.balanceInCents || left.customerName.localeCompare(right.customerName));
  const monthlyPaymentsInCents = balances.reduce((total, balance) => {
    const customer = customers.find((record) => record.id === balance.customerId);

    if (!customer) {
      return total;
    }

    return (
      total +
      customer.receivableEntries
        .map(serializeReceivableEntry)
        .filter((entry) => entry.amountInCents < 0 && entry.effectiveDate >= monthStart)
        .reduce((entryTotal, entry) => entryTotal + Math.abs(entry.amountInCents), 0)
    );
  }, 0);

  return {
    organization,
    unitCounts: Array.from(unitStatusCounts.entries()).map(([label, count]) => ({ label, count })),
    rentalCounts: Array.from(rentalStatusCounts.entries()).map(([label, count]) => ({ label, count })),
    balances,
    monthlyPaymentsInCents,
    openBalanceInCents: balances.reduce((total, balance) => total + balance.balanceInCents, 0),
    pastDueInCents: balances.reduce((total, balance) => total + balance.pastDueInCents, 0)
  };
}
