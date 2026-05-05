export interface RegistryImportField {
  key: string;
  required: boolean;
  notes: string;
}

export interface RegistryImportSpec {
  key: string;
  title: string;
  fileName: string;
  purpose: string;
  fields: RegistryImportField[];
}

export const registryImportSpecs: RegistryImportSpec[] = [
  {
    key: "customers",
    title: "Customers",
    fileName: "registry-customers.csv",
    purpose: "Customer accounts, billing contacts, and mailing details.",
    fields: [
      { key: "customer_code", required: true, notes: "Stable ID from the prior system or office records." },
      { key: "name", required: true, notes: "Primary customer name." },
      { key: "company_name", required: false, notes: "Business name when different from the customer name." },
      { key: "email", required: false, notes: "Billing or document email address." },
      { key: "phone", required: false, notes: "Primary phone number." },
      { key: "billing_street_1", required: false, notes: "First billing address line." },
      { key: "billing_street_2", required: false, notes: "Second billing address line." },
      { key: "billing_city", required: false, notes: "Billing city." },
      { key: "billing_state", required: false, notes: "Billing state." },
      { key: "billing_postal_code", required: false, notes: "Billing ZIP or postal code." },
      { key: "notes", required: false, notes: "Office notes to carry forward." }
    ]
  },
  {
    key: "units",
    title: "Container Units",
    fileName: "registry-units.csv",
    purpose: "Portable storage containers, yard state, size, condition, and current location.",
    fields: [
      { key: "unit_code", required: true, notes: "Unique unit or container code." },
      { key: "name", required: true, notes: "Readable unit name." },
      { key: "size_label", required: false, notes: "Examples: 20 ft, 40 ft, 40 ft high cube." },
      { key: "unit_type", required: false, notes: "Container type or build." },
      { key: "condition", required: false, notes: "Current condition." },
      { key: "home_location", required: false, notes: "Normal yard or storage location." },
      { key: "current_location", required: false, notes: "Where the unit is now." },
      { key: "status", required: false, notes: "available, assigned, maintenance, or archived." },
      { key: "notes", required: false, notes: "Office notes to carry forward." }
    ]
  },
  {
    key: "rentals",
    title: "Active Rentals",
    fileName: "registry-active-rentals.csv",
    purpose: "Current customer-to-container rentals and delivery site details.",
    fields: [
      { key: "rental_code", required: true, notes: "Stable rental ID from the prior system or office records." },
      { key: "customer_code", required: true, notes: "Must match customers.customer_code." },
      { key: "unit_code", required: true, notes: "Must match units.unit_code." },
      { key: "start_date", required: true, notes: "YYYY-MM-DD." },
      { key: "billing_cadence", required: true, notes: "daily, weekly, monthly, or custom." },
      { key: "rate", required: true, notes: "Dollar amount for the rental cadence." },
      { key: "site_name", required: false, notes: "Customer site or placement label." },
      { key: "site_street_1", required: false, notes: "First site address line." },
      { key: "site_street_2", required: false, notes: "Second site address line." },
      { key: "site_city", required: false, notes: "Site city." },
      { key: "site_state", required: false, notes: "Site state." },
      { key: "site_postal_code", required: false, notes: "Site ZIP or postal code." },
      { key: "delivered_on", required: false, notes: "YYYY-MM-DD when known." },
      { key: "placement_notes", required: false, notes: "Door direction, access notes, and driver instructions." }
    ]
  },
  {
    key: "opening-balances",
    title: "Opening Balances",
    fileName: "registry-opening-balances.csv",
    purpose: "Starting charges, payments, credits, and balances carried over during cutover.",
    fields: [
      { key: "entry_code", required: true, notes: "Stable ledger row ID from the source export." },
      { key: "customer_code", required: true, notes: "Must match customers.customer_code." },
      { key: "rental_code", required: false, notes: "Use when the balance belongs to a specific rental." },
      { key: "unit_code", required: false, notes: "Use when the balance belongs to a specific unit." },
      { key: "type", required: true, notes: "charge, payment, credit, adjustment, deposit, or refund." },
      { key: "description", required: true, notes: "Readable ledger description." },
      { key: "effective_date", required: true, notes: "YYYY-MM-DD." },
      { key: "due_date", required: false, notes: "YYYY-MM-DD for charges that should age as past due." },
      { key: "amount", required: true, notes: "Dollar amount; sign is normalized by entry type." },
      { key: "payment_method", required: false, notes: "Cash, check, card, ACH, or office label." },
      { key: "reference", required: false, notes: "Check number, receipt number, or prior-system reference." },
      { key: "notes", required: false, notes: "Office notes to carry forward." }
    ]
  },
  {
    key: "payment-history",
    title: "Payment History",
    fileName: "registry-payment-history.csv",
    purpose: "Historical customer payments and credits that should be visible after cutover.",
    fields: [
      { key: "payment_code", required: true, notes: "Stable payment row ID from the source export." },
      { key: "customer_code", required: true, notes: "Must match customers.customer_code." },
      { key: "rental_code", required: false, notes: "Use when the payment belongs to a specific rental." },
      { key: "unit_code", required: false, notes: "Use when the payment belongs to a specific unit." },
      { key: "received_date", required: true, notes: "YYYY-MM-DD." },
      { key: "amount", required: true, notes: "Dollar amount received." },
      { key: "payment_method", required: false, notes: "Cash, check, card, ACH, or office label." },
      { key: "reference", required: false, notes: "Check number, receipt number, or prior-system reference." },
      { key: "description", required: false, notes: "Readable ledger description. Defaults to Payment received." },
      { key: "notes", required: false, notes: "Office notes to carry forward." }
    ]
  }
] as const;

export function getImportSpecByKey(key: string): RegistryImportSpec | undefined {
  return registryImportSpecs.find((spec) => spec.key === key);
}

export function getCsvHeader(spec: RegistryImportSpec): string {
  return spec.fields.map((field) => field.key).join(",");
}
