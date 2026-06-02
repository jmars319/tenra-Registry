import type { Assignment, CustomerBalanceSummary, Invoice, ReceivableEntry } from "./entities";
import type { AssignmentStatus, AssignmentTransitionTarget, BalanceState, DocumentTemplateType, OrganizationStatus, ReceivableEntryType } from "./statuses";
import type { ISODateString } from "@registry/shared-types";

export function getInvoiceOutstandingAmount(invoice: Invoice): number {
  return invoice.total.amountInCents - invoice.paidAmount.amountInCents;
}

export function deriveBalanceState(invoice: Invoice): BalanceState {
  const outstanding = getInvoiceOutstandingAmount(invoice);

  if (outstanding < 0) {
    return "credit";
  }

  if (outstanding === 0) {
    return "settled";
  }

  return invoice.status === "open" ? "current" : invoice.balanceState;
}

export function getReceivableEntryTypeLabel(type: ReceivableEntryType): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getDocumentTemplateTypeLabel(type: DocumentTemplateType): string {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isReceivableCreditType(type: ReceivableEntryType): boolean {
  return type === "payment" || type === "credit";
}

export function normalizeReceivableAmount(type: ReceivableEntryType, amountInCents: number): number {
  const absoluteAmount = Math.abs(amountInCents);
  return isReceivableCreditType(type) ? -absoluteAmount : absoluteAmount;
}

export function summarizeReceivableEntries(
  entries: Pick<ReceivableEntry, "amountInCents" | "dueDate" | "effectiveDate" | "status">[],
  today: ISODateString
): Omit<CustomerBalanceSummary, "customerId" | "customerName"> {
  let totalChargesInCents = 0;
  let totalCreditsInCents = 0;
  let pastDueChargesInCents = 0;
  let lastPaymentDate: ISODateString | undefined;

  for (const entry of entries) {
    if (entry.status !== "posted") {
      continue;
    }

    if (entry.amountInCents >= 0) {
      totalChargesInCents += entry.amountInCents;

      if (entry.dueDate && entry.dueDate < today) {
        pastDueChargesInCents += entry.amountInCents;
      }
    } else {
      totalCreditsInCents += Math.abs(entry.amountInCents);

      if (!lastPaymentDate || entry.effectiveDate > lastPaymentDate) {
        lastPaymentDate = entry.effectiveDate;
      }
    }
  }

  const balanceInCents = totalChargesInCents - totalCreditsInCents;
  const pastDueInCents = Math.max(0, pastDueChargesInCents - totalCreditsInCents);

  return {
    totalChargesInCents,
    totalCreditsInCents,
    balanceInCents,
    pastDueInCents,
    ...(lastPaymentDate ? { lastPaymentDate } : {})
  };
}

export function isAssignmentActive(assignment: Assignment): boolean {
  return assignment.status === "active";
}

const assignmentLifecycleMap: Record<AssignmentStatus, AssignmentTransitionTarget[]> = {
  draft: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: []
};

export function getAllowedAssignmentTransitions(status: AssignmentStatus): AssignmentTransitionTarget[] {
  return [...assignmentLifecycleMap[status]];
}

export function canTransitionAssignmentStatus(
  currentStatus: AssignmentStatus,
  nextStatus: AssignmentTransitionTarget
): boolean {
  return assignmentLifecycleMap[currentStatus].includes(nextStatus);
}

export function isOrganizationOperational(status: OrganizationStatus): boolean {
  return status === "active";
}

export function formatUsdCents(amountInCents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amountInCents / 100);
}
