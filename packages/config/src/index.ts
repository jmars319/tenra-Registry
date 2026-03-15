import type { RegistryRole } from "@registry/auth";

export const REGISTRY_APP_NAME = "Registry";
export const REGISTRY_DEFAULT_ORGANIZATION_NAME = "Registry Operations";
export const REGISTRY_DEFAULT_ORGANIZATION_SLUG = "registry-ops";

export const registryWebRoutes = {
  dashboard: "/",
  customers: "/customers",
  assets: "/assets",
  assignments: "/assignments",
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
    description: "Account ownership, billing contacts, and operating notes.",
    href: registryWebRoutes.customers
  },
  {
    key: "assets",
    title: "Assets",
    description: "Units, equipment, and tracked operational inventory.",
    href: registryWebRoutes.assets
  },
  {
    key: "assignments",
    title: "Assignments",
    description: "Generalized customer-to-asset allocations with room for rental workflows.",
    href: registryWebRoutes.assignments
  },
  {
    key: "invoices",
    title: "Invoices",
    description: "Open balances, issued invoices, and payment follow-up.",
    href: registryWebRoutes.invoices
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
