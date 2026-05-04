import type { EntityId, ISODateTimeString } from "@registry/shared-types";

export const registryRoles = ["owner", "manager", "operator", "viewer"] as const;

export type RegistryRole = (typeof registryRoles)[number];

export const registryCapabilities = [
  "customers:read",
  "customers:write",
  "assets:read",
  "assets:write",
  "assignments:read",
  "assignments:write",
  "receivables:read",
  "receivables:write",
  "documents:read",
  "documents:write",
  "invoices:read",
  "invoices:write",
  "reports:read",
  "settings:write"
] as const;

export type RegistryCapability = (typeof registryCapabilities)[number];

export interface SessionActor {
  userId: EntityId;
  organizationId: EntityId;
  email: string;
  displayName: string;
  role: RegistryRole;
}

export interface RegistrySession {
  actor: SessionActor;
  issuedAt: ISODateTimeString;
  expiresAt: ISODateTimeString;
}

const capabilityMap: Record<RegistryRole, readonly RegistryCapability[]> = {
  owner: registryCapabilities,
  manager: [
    "customers:read",
    "customers:write",
    "assets:read",
    "assets:write",
    "assignments:read",
    "assignments:write",
    "receivables:read",
    "receivables:write",
    "documents:read",
    "documents:write",
    "invoices:read",
    "invoices:write",
    "reports:read",
    "settings:write"
  ],
  operator: [
    "customers:read",
    "assets:read",
    "assets:write",
    "assignments:read",
    "assignments:write",
    "receivables:read",
    "receivables:write",
    "documents:read",
    "invoices:read"
  ],
  viewer: ["customers:read", "assets:read", "assignments:read", "receivables:read", "documents:read", "invoices:read", "reports:read"]
};

export function canAccess(role: RegistryRole, capability: RegistryCapability): boolean {
  return capabilityMap[role].includes(capability);
}
