import { formatUsdCents } from "@registry/domain";
import type { Customer } from "@registry/domain";

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
