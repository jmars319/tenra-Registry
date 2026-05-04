import type { RegistryRole } from "@registry/auth";

export const REGISTRY_APP_NAME = "tenra Registry";
export const REGISTRY_DEFAULT_ORGANIZATION_NAME = "tenra Registry Operations";
export const REGISTRY_DEFAULT_ORGANIZATION_SLUG = "registry-ops";

export const registryWebRoutes = {
  dashboard: "/",
  customers: "/customers",
  assets: "/assets",
  assignments: "/assignments",
  receivables: "/receivables",
  documents: "/documents",
  invoices: "/invoices",
  reports: "/reports",
  settings: "/settings"
} as const;

export function getCustomerRoute(customerId: string): string {
  return `${registryWebRoutes.customers}/${customerId}`;
}

export function getAssetRoute(assetId: string): string {
  return `${registryWebRoutes.assets}/${assetId}`;
}

export function getAssignmentRoute(assignmentId: string): string {
  return `${registryWebRoutes.assignments}/${assignmentId}`;
}

export const registryModules = [
  {
    key: "customers",
    title: "Customers",
    description: "Customer accounts, billing contacts, balances, and rental history.",
    href: registryWebRoutes.customers
  },
  {
    key: "assets",
    title: "Units",
    description: "Portable shipping containers, yard inventory, condition, and location state.",
    href: registryWebRoutes.assets
  },
  {
    key: "assignments",
    title: "Rentals",
    description: "Customer-to-container rentals, delivery sites, pickup state, and rates.",
    href: registryWebRoutes.assignments
  },
  {
    key: "receivables",
    title: "Receivables",
    description: "Charges, deposits, payments, credits, balances, and overdue accounts.",
    href: registryWebRoutes.receivables
  },
  {
    key: "documents",
    title: "Documents",
    description: "Customizable rental, delivery, pickup, receipt, statement, and notice templates.",
    href: registryWebRoutes.documents
  },
  {
    key: "reports",
    title: "Reports",
    description: "Operational visibility across usage, billing, and status.",
    href: registryWebRoutes.reports
  },
  {
    key: "settings",
    title: "Settings",
    description: "Operator access, organization defaults, and future integrations.",
    href: registryWebRoutes.settings
  }
] as const;

export const requiredEnvVars = ["DATABASE_URL"] as const;

export const defaultRoleLandingRoute: Record<RegistryRole, string> = {
  owner: registryWebRoutes.dashboard,
  manager: registryWebRoutes.dashboard,
  operator: registryWebRoutes.assignments,
  viewer: registryWebRoutes.reports
};

export function getAppName(override?: string): string {
  return override?.trim() || REGISTRY_APP_NAME;
}
