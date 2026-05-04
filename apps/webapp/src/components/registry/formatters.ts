import { formatUsdCents } from "@registry/domain";
import type { Assignment, Customer } from "@registry/domain";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

export function formatDateLabel(value: string): string {
  return dateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

export function formatDateRangeLabel(startDate: string, endDate?: string): string {
  const startLabel = formatDateLabel(startDate);

  if (!endDate) {
    return `${startLabel} onward`;
  }

  return `${startLabel} to ${formatDateLabel(endDate)}`;
}

export function formatRateLabel(rateInCents: number): string {
  return formatUsdCents(rateInCents);
}

export function formatSignedUsdCents(amountInCents: number): string {
  if (amountInCents < 0) {
    return `-${formatUsdCents(Math.abs(amountInCents))}`;
  }

  return formatUsdCents(amountInCents);
}

export function formatBalanceLabel(amountInCents: number): string {
  if (amountInCents < 0) {
    return `${formatUsdCents(Math.abs(amountInCents))} credit`;
  }

  return formatUsdCents(amountInCents);
}

export function formatBillingAddressLines(
  customer: Pick<
    Customer,
    "billingStreet1" | "billingStreet2" | "billingCity" | "billingState" | "billingPostalCode" | "billingCountry"
  >
): string[] {
  const cityStatePostal = [customer.billingCity, customer.billingState, customer.billingPostalCode]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  return [
    customer.billingStreet1,
    customer.billingStreet2,
    cityStatePostal || undefined,
    customer.billingCountry
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function formatSiteAddressLines(
  assignment: Pick<
    Assignment,
    "siteName" | "siteStreet1" | "siteStreet2" | "siteCity" | "siteState" | "sitePostalCode"
  >
): string[] {
  const cityStatePostal = [assignment.siteCity, assignment.siteState, assignment.sitePostalCode]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  return [
    assignment.siteName,
    assignment.siteStreet1,
    assignment.siteStreet2,
    cityStatePostal || undefined
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}
