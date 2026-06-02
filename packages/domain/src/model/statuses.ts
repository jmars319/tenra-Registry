export const organizationStatuses = ["active", "inactive"] as const;
export const customerStatuses = ["active", "inactive", "archived"] as const;
export const assetStatuses = ["available", "assigned", "maintenance", "archived"] as const;
export const assignmentStatuses = ["draft", "active", "completed", "cancelled"] as const;
export const assignmentTransitionTargets = ["active", "completed", "cancelled"] as const;
export const billingCadences = ["daily", "weekly", "monthly", "custom"] as const;
export const invoiceStatuses = ["draft", "open", "paid", "void"] as const;
export const balanceStates = ["current", "past-due", "settled", "credit"] as const;
export const assetCategories = ["unit", "vehicle", "equipment", "other"] as const;
export const receivableEntryTypes = ["charge", "payment", "credit", "adjustment", "deposit", "refund"] as const;
export const receivableEntryStatuses = ["posted", "void"] as const;
export const documentTemplateTypes = [
  "rental-agreement",
  "delivery-ticket",
  "pickup-ticket",
  "condition-report",
  "payment-receipt",
  "account-statement",
  "past-due-notice",
  "deposit-receipt",
  "general-letter"
] as const;
export const generatedDocumentStatuses = ["draft", "printed", "emailed", "archived"] as const;

export type OrganizationStatus = (typeof organizationStatuses)[number];
export type CustomerStatus = (typeof customerStatuses)[number];
export type AssetStatus = (typeof assetStatuses)[number];
export type AssignmentStatus = (typeof assignmentStatuses)[number];
export type AssignmentTransitionTarget = (typeof assignmentTransitionTargets)[number];
export type BillingCadence = (typeof billingCadences)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type BalanceState = (typeof balanceStates)[number];
export type AssetCategory = (typeof assetCategories)[number];
export type ReceivableEntryType = (typeof receivableEntryTypes)[number];
export type ReceivableEntryStatus = (typeof receivableEntryStatuses)[number];
export type DocumentTemplateType = (typeof documentTemplateTypes)[number];
export type GeneratedDocumentStatus = (typeof generatedDocumentStatuses)[number];
