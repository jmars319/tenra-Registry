import type { PostRentRunRequest } from "@registry/api-contracts";
import { getAssetRoute, getCustomerRoute } from "@registry/config";
import type { Assignment } from "@registry/domain";
import { formatUsdCents, normalizeReceivableAmount } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import {
  clampBillingDay,
  dateToIsoDate,
  formatRentRunPeriodLabel,
  getDaysInclusive,
  getDefaultRentRunBillingDay,
  getDefaultRentRunDueDate,
  getDefaultRentRunPeriod,
  getPeriodEnd,
  getPeriodStart,
  getRentRunChargeDate,
  parseDateOnly,
  prismaCadenceToDomain
} from "./shared";
import type { RentRunHistoryItem, RentRunPreview } from "./types";

function getRentRunReference(period: string, assignmentId: string): string {
  return `rent-run:${period}:${assignmentId}`;
}

function formatAssignmentSite(assignment: {
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
}): string {
  return [
    assignment.siteName,
    assignment.siteStreet1,
    assignment.siteStreet2,
    [assignment.siteCity, assignment.siteState, assignment.sitePostalCode].filter(Boolean).join(", ")
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

function formatRentRunSiteLabel(assignment: {
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
}): string {
  return formatAssignmentSite(assignment).replace(/\n/gu, " · ") || "No rental site recorded";
}

function calculateRentRunAmount(input: {
  billingCadence: Assignment["billingCadence"];
  rateInCents: number;
  activeDays: number;
  periodDays: number;
}): {
  amountInCents: number;
  calculation: string;
} {
  if (input.activeDays <= 0) {
    return {
      amountInCents: 0,
      calculation: "No active days in period"
    };
  }

  if (input.billingCadence === "daily") {
    return {
      amountInCents: input.rateInCents * input.activeDays,
      calculation: `${input.activeDays} active day${input.activeDays === 1 ? "" : "s"} at ${formatUsdCents(input.rateInCents)} daily`
    };
  }

  if (input.billingCadence === "weekly") {
    const weeks = Math.ceil(input.activeDays / 7);

    return {
      amountInCents: input.rateInCents * weeks,
      calculation: `${weeks} billing week${weeks === 1 ? "" : "s"} from ${input.activeDays} active days`
    };
  }

  if (input.billingCadence === "monthly" && input.activeDays < input.periodDays) {
    return {
      amountInCents: Math.round((input.rateInCents * input.activeDays) / input.periodDays),
      calculation: `Prorated monthly rent: ${input.activeDays} of ${input.periodDays} days`
    };
  }

  return {
    amountInCents: input.rateInCents,
    calculation: input.billingCadence === "custom" ? "Custom cadence uses the stored rate" : "Full monthly rent"
  };
}

export async function getRentRunPreview(
  period = getDefaultRentRunPeriod(),
  dueDate = getDefaultRentRunDueDate(period),
  billingDay = getDefaultRentRunBillingDay()
): Promise<RentRunPreview> {
  const organization = await getDefaultOrganization();
  const normalizedBillingDay = clampBillingDay(billingDay);
  const periodStart = getPeriodStart(period);
  const periodEnd = getPeriodEnd(period);
  const periodDays = getDaysInclusive(periodStart, periodEnd);

  const activeAssignments = await db.assignment.findMany({
    where: {
      organizationId: organization.id,
      status: "ACTIVE",
      startDate: {
        lte: parseDateOnly(periodEnd)
      },
      OR: [
        {
          endDate: null
        },
        {
          endDate: {
            gte: parseDateOnly(periodStart)
          }
        }
      ]
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
    },
    orderBy: [
      {
        customer: {
          name: "asc"
        }
      },
      {
        startDate: "asc"
      }
    ]
  });
  const references = activeAssignments.map((assignment) => getRentRunReference(period, assignment.id));
  const existingEntries =
    references.length > 0
      ? await db.receivableEntry.findMany({
          where: {
            organizationId: organization.id,
            status: "POSTED",
            reference: {
              in: references
            }
          },
          select: {
            id: true,
            reference: true
          }
        })
      : [];
  const existingByReference = new Map(
    existingEntries
      .filter((entry): entry is { id: string; reference: string } => typeof entry.reference === "string")
      .map((entry) => [entry.reference, entry.id])
  );

  const lines = activeAssignments.map((assignment) => {
    const reference = getRentRunReference(period, assignment.id);
    const existingEntryId = existingByReference.get(reference);
    const assignmentStart = dateToIsoDate(assignment.startDate);
    const assignmentEnd = assignment.endDate ? dateToIsoDate(assignment.endDate) : periodEnd;
    const activeStart = assignmentStart > periodStart ? assignmentStart : periodStart;
    const activeEnd = assignmentEnd < periodEnd ? assignmentEnd : periodEnd;
    const activeDays = getDaysInclusive(activeStart, activeEnd);
    const billingCadence = prismaCadenceToDomain(assignment.billingCadence);
    const calculation = calculateRentRunAmount({
      billingCadence,
      rateInCents: assignment.rateInCents,
      activeDays,
      periodDays
    });

    return {
      assignmentId: assignment.id,
      customerId: assignment.customerId,
      customerName: assignment.customer.name,
      customerHref: getCustomerRoute(assignment.customer.id),
      assetId: assignment.assetId,
      assetCode: assignment.asset.assetCode,
      assetName: assignment.asset.name,
      assetHref: getAssetRoute(assignment.asset.id),
      siteLabel: formatRentRunSiteLabel(assignment),
      billingCadence,
      amountInCents: calculation.amountInCents,
      baseRateInCents: assignment.rateInCents,
      activeDays,
      periodDays,
      calculation: calculation.calculation,
      startDate: assignmentStart,
      endDate: assignment.endDate ? dateToIsoDate(assignment.endDate) : undefined,
      reference,
      alreadyPosted: Boolean(existingEntryId),
      ...(existingEntryId ? { existingEntryId } : {})
    };
  });
  const readyLines = lines.filter((line) => !line.alreadyPosted && line.amountInCents > 0);

  return {
    organization,
    period,
    billingDay: normalizedBillingDay,
    chargeDate: getRentRunChargeDate(period, normalizedBillingDay),
    dueDate,
    lines,
    readyCount: readyLines.length,
    readyTotalInCents: readyLines.reduce((total, line) => total + line.amountInCents, 0),
    postedCount: lines.length - readyLines.length
  };
}

export async function postRentRun(input: PostRentRunRequest): Promise<{
  postedCount: number;
  skippedCount: number;
  totalInCents: number;
}> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Rent runs must be posted inside the default organization.");
  }

  const preview = await getRentRunPreview(input.period, input.dueDate, input.billingDay);
  const selectedAssignmentIds = new Set(input.assignmentIds);
  const selectedLines = preview.lines.filter((line) => selectedAssignmentIds.has(line.assignmentId) && line.amountInCents > 0);

  if (selectedLines.length === 0) {
    throw new Error("Choose at least one rental to post.");
  }

  let postedCount = 0;
  let skippedCount = 0;
  let totalInCents = 0;

  await db.$transaction(async (transaction) => {
    for (const line of selectedLines) {
      const existingEntry = await transaction.receivableEntry.findFirst({
        where: {
          organizationId: organization.id,
          status: "POSTED",
          reference: line.reference
        },
        select: {
          id: true
        }
      });

      if (existingEntry) {
        skippedCount += 1;
        continue;
      }

      await transaction.receivableEntry.create({
        data: {
          organizationId: organization.id,
          customerId: line.customerId,
          assignmentId: line.assignmentId,
          assetId: line.assetId,
          type: "CHARGE",
          status: "POSTED",
          description: `${formatRentRunPeriodLabel(input.period)} rent`,
          effectiveDate: parseDateOnly(preview.chargeDate),
          dueDate: parseDateOnly(input.dueDate),
          amountInCents: normalizeReceivableAmount("charge", line.amountInCents),
          paymentMethod: null,
          reference: line.reference,
          notes: `Posted from rent run for ${formatRentRunPeriodLabel(input.period)}. ${line.calculation}. Billing day ${input.billingDay}.`
        }
      });

      postedCount += 1;
      totalInCents += line.amountInCents;
    }
  });

  return {
    postedCount,
    skippedCount,
    totalInCents
  };
}

export async function listRentRunHistory(): Promise<RentRunHistoryItem[]> {
  const organization = await getDefaultOrganization();
  const entries = await db.receivableEntry.findMany({
    where: {
      organizationId: organization.id,
      status: "POSTED",
      reference: {
        startsWith: "rent-run:"
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
  const history = new Map<string, RentRunHistoryItem>();

  for (const entry of entries) {
    const period = entry.reference?.split(":")[1];

    if (!period) {
      continue;
    }

    const existing = history.get(period);

    if (existing) {
      existing.count += 1;
      existing.totalInCents += entry.amountInCents;
      if (dateToIsoDate(entry.createdAt) > existing.postedOn) {
        existing.postedOn = dateToIsoDate(entry.createdAt);
      }
      continue;
    }

    history.set(period, {
      period,
      periodLabel: formatRentRunPeriodLabel(period),
      postedOn: dateToIsoDate(entry.createdAt),
      count: 1,
      totalInCents: entry.amountInCents
    });
  }

  return Array.from(history.values()).sort((left, right) => right.period.localeCompare(left.period));
}
