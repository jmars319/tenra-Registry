import type { AssetStatus, BillingCadence, ReceivableEntryType } from "@registry/domain";
import {
  addRequiredIssue,
  normalizeCell,
  parseCurrency,
  validateUniqueCodes
} from "./csv";
import { allowedAssetStatuses, allowedCadences, allowedEntryTypes, datePattern } from "./types";
import type {
  CustomerImportRow,
  ImportIssue,
  OpeningBalanceImportRow,
  PaymentHistoryImportRow,
  RentalImportRow,
  UnitImportRow
} from "./types";

// Customer CSV boundary
export function parseCustomers(rows: Array<Record<string, string>>, issues: ImportIssue[]): CustomerImportRow[] {
  validateUniqueCodes(issues, "customers", rows, "customer_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const customerCode = normalizeCell(row.customer_code);
    const name = normalizeCell(row.name);

    if (!customerCode) {
      addRequiredIssue(issues, "customers", rowNumber, "customer_code");
    }
    if (!name) {
      addRequiredIssue(issues, "customers", rowNumber, "name");
    }
    if (!customerCode || !name) {
      return [];
    }

    return [{
      customerCode,
      name,
      companyName: normalizeCell(row.company_name),
      email: normalizeCell(row.email),
      phone: normalizeCell(row.phone),
      billingStreet1: normalizeCell(row.billing_street_1),
      billingStreet2: normalizeCell(row.billing_street_2),
      billingCity: normalizeCell(row.billing_city),
      billingState: normalizeCell(row.billing_state),
      billingPostalCode: normalizeCell(row.billing_postal_code),
      notes: normalizeCell(row.notes)
    }];
  });
}

// Unit CSV boundary
export function parseUnits(rows: Array<Record<string, string>>, issues: ImportIssue[]): UnitImportRow[] {
  validateUniqueCodes(issues, "units", rows, "unit_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const unitCode = normalizeCell(row.unit_code);
    const name = normalizeCell(row.name);
    const status = (normalizeCell(row.status) ?? "available").toLowerCase() as AssetStatus;

    if (!unitCode) {
      addRequiredIssue(issues, "units", rowNumber, "unit_code");
    }
    if (!name) {
      addRequiredIssue(issues, "units", rowNumber, "name");
    }
    if (!allowedAssetStatuses.has(status)) {
      issues.push({
        dataset: "units",
        field: "status",
        row: rowNumber,
        message: "status must be available, assigned, maintenance, or archived."
      });
    }
    if (!unitCode || !name || !allowedAssetStatuses.has(status)) {
      return [];
    }

    return [{
      unitCode,
      name,
      sizeLabel: normalizeCell(row.size_label),
      unitType: normalizeCell(row.unit_type),
      condition: normalizeCell(row.condition),
      homeLocation: normalizeCell(row.home_location),
      currentLocation: normalizeCell(row.current_location),
      status,
      notes: normalizeCell(row.notes)
    }];
  });
}

// Rental CSV boundary
export function parseRentals(rows: Array<Record<string, string>>, issues: ImportIssue[]): RentalImportRow[] {
  validateUniqueCodes(issues, "rentals", rows, "rental_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const rentalCode = normalizeCell(row.rental_code);
    const customerCode = normalizeCell(row.customer_code);
    const unitCode = normalizeCell(row.unit_code);
    const startDate = normalizeCell(row.start_date);
    const billingCadence = (normalizeCell(row.billing_cadence) ?? "").toLowerCase() as BillingCadence;
    const rateInCents = parseCurrency(row.rate);

    for (const field of ["rental_code", "customer_code", "unit_code", "start_date", "billing_cadence", "rate"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "rentals", rowNumber, field);
      }
    }
    if (startDate && !datePattern.test(startDate)) {
      issues.push({
        dataset: "rentals",
        field: "start_date",
        row: rowNumber,
        message: "start_date must be YYYY-MM-DD."
      });
    }
    if (!allowedCadences.has(billingCadence)) {
      issues.push({
        dataset: "rentals",
        field: "billing_cadence",
        row: rowNumber,
        message: "billing_cadence must be daily, weekly, monthly, or custom."
      });
    }
    if (rateInCents === null) {
      issues.push({
        dataset: "rentals",
        field: "rate",
        row: rowNumber,
        message: "rate must be a dollar amount."
      });
    }
    if (!rentalCode || !customerCode || !unitCode || !startDate || !datePattern.test(startDate) || !allowedCadences.has(billingCadence) || rateInCents === null) {
      return [];
    }

    return [{
      rentalCode,
      customerCode,
      unitCode,
      startDate,
      billingCadence,
      rateInCents,
      siteName: normalizeCell(row.site_name),
      siteStreet1: normalizeCell(row.site_street_1),
      siteStreet2: normalizeCell(row.site_street_2),
      siteCity: normalizeCell(row.site_city),
      siteState: normalizeCell(row.site_state),
      sitePostalCode: normalizeCell(row.site_postal_code),
      deliveredOn: normalizeCell(row.delivered_on),
      placementNotes: normalizeCell(row.placement_notes)
    }];
  });
}

// Balance CSV boundary
export function parseOpeningBalances(rows: Array<Record<string, string>>, issues: ImportIssue[]): OpeningBalanceImportRow[] {
  validateUniqueCodes(issues, "opening-balances", rows, "entry_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const entryCode = normalizeCell(row.entry_code);
    const customerCode = normalizeCell(row.customer_code);
    const type = (normalizeCell(row.type) ?? "").toLowerCase() as ReceivableEntryType;
    const description = normalizeCell(row.description);
    const effectiveDate = normalizeCell(row.effective_date);
    const dueDate = normalizeCell(row.due_date);
    const amountInCents = parseCurrency(row.amount);

    for (const field of ["entry_code", "customer_code", "type", "description", "effective_date", "amount"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "opening-balances", rowNumber, field);
      }
    }
    if (!allowedEntryTypes.has(type)) {
      issues.push({
        dataset: "opening-balances",
        field: "type",
        row: rowNumber,
        message: "type must be charge, payment, credit, adjustment, deposit, or refund."
      });
    }
    if (effectiveDate && !datePattern.test(effectiveDate)) {
      issues.push({
        dataset: "opening-balances",
        field: "effective_date",
        row: rowNumber,
        message: "effective_date must be YYYY-MM-DD."
      });
    }
    if (dueDate && !datePattern.test(dueDate)) {
      issues.push({
        dataset: "opening-balances",
        field: "due_date",
        row: rowNumber,
        message: "due_date must be YYYY-MM-DD."
      });
    }
    if (amountInCents === null) {
      issues.push({
        dataset: "opening-balances",
        field: "amount",
        row: rowNumber,
        message: "amount must be a dollar amount."
      });
    }
    if (!entryCode || !customerCode || !description || !effectiveDate || !allowedEntryTypes.has(type) || !datePattern.test(effectiveDate) || (dueDate && !datePattern.test(dueDate)) || amountInCents === null) {
      return [];
    }

    return [{
      entryCode,
      customerCode,
      rentalCode: normalizeCell(row.rental_code),
      unitCode: normalizeCell(row.unit_code),
      type,
      description,
      effectiveDate,
      dueDate,
      amountInCents,
      paymentMethod: normalizeCell(row.payment_method),
      reference: normalizeCell(row.reference),
      notes: normalizeCell(row.notes)
    }];
  });
}

// Payment CSV boundary
export function parsePaymentHistory(rows: Array<Record<string, string>>, issues: ImportIssue[]): PaymentHistoryImportRow[] {
  validateUniqueCodes(issues, "payment-history", rows, "payment_code");

  return rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const paymentCode = normalizeCell(row.payment_code);
    const customerCode = normalizeCell(row.customer_code);
    const receivedDate = normalizeCell(row.received_date);
    const amountInCents = parseCurrency(row.amount);

    for (const field of ["payment_code", "customer_code", "received_date", "amount"]) {
      if (!normalizeCell(row[field])) {
        addRequiredIssue(issues, "payment-history", rowNumber, field);
      }
    }
    if (receivedDate && !datePattern.test(receivedDate)) {
      issues.push({
        dataset: "payment-history",
        field: "received_date",
        row: rowNumber,
        message: "received_date must be YYYY-MM-DD."
      });
    }
    if (amountInCents === null) {
      issues.push({
        dataset: "payment-history",
        field: "amount",
        row: rowNumber,
        message: "amount must be a dollar amount."
      });
    }
    if (!paymentCode || !customerCode || !receivedDate || !datePattern.test(receivedDate) || amountInCents === null) {
      return [];
    }

    return [{
      paymentCode,
      customerCode,
      rentalCode: normalizeCell(row.rental_code),
      unitCode: normalizeCell(row.unit_code),
      receivedDate,
      amountInCents,
      paymentMethod: normalizeCell(row.payment_method),
      reference: normalizeCell(row.reference),
      description: normalizeCell(row.description) ?? "Payment received",
      notes: normalizeCell(row.notes)
    }];
  });
}
