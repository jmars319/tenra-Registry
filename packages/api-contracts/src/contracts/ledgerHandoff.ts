import type { Assignment, Asset, Customer, ReceivableEntry } from "@registry/domain";
import type { EntityId } from "@registry/shared-types";

export interface RegistryLedgerExportRow {
  externalId: EntityId;
  customerCode: EntityId;
  customerName: string;
  rentalCode?: EntityId | undefined;
  unitCode?: string | undefined;
  entryType: ReceivableEntry["type"];
  effectiveDate: ReceivableEntry["effectiveDate"];
  description: ReceivableEntry["description"];
  amountMinor: ReceivableEntry["amountInCents"];
  paymentMethod?: ReceivableEntry["paymentMethod"] | undefined;
  reference?: ReceivableEntry["reference"] | undefined;
  notes?: ReceivableEntry["notes"] | undefined;
}

export interface RegistryLedgerExport {
  schema: "tenra-registry.ledger-export.v1";
  exportId: EntityId;
  exportedAt: string;
  organizationId: EntityId;
  sourceApp: "registry";
  rows: RegistryLedgerExportRow[];
}

export interface BuildRegistryLedgerExportInput {
  organizationId: EntityId;
  exportedAt?: string | undefined;
  entries: ReceivableEntry[];
  customers: Array<Pick<Customer, "id" | "name">>;
  assignments?: Array<Pick<Assignment, "id">> | undefined;
  assets?: Array<Pick<Asset, "id" | "assetCode">> | undefined;
}

export function stableHandoffHash(value: string): string {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function stableRegistryExportId(prefix: string, parts: Array<string | undefined>): EntityId {
  const seed = parts.filter((part): part is string => Boolean(part && part.trim())).join("|");
  return `${prefix}-${stableHandoffHash(seed || prefix)}`;
}

export function buildRegistryLedgerExport(input: BuildRegistryLedgerExportInput): RegistryLedgerExport {
  const customersById = new Map(input.customers.map((customer) => [customer.id, customer]));
  const assignmentIds = new Set((input.assignments ?? []).map((assignment) => assignment.id));
  const assetsById = new Map((input.assets ?? []).map((asset) => [asset.id, asset]));
  const rows = input.entries
    .filter((entry) => entry.status === "posted")
    .map((entry) => {
      const customer = customersById.get(entry.customerId);
      const asset = entry.assetId ? assetsById.get(entry.assetId) : undefined;
      const rentalCode =
        entry.assignmentId && (assignmentIds.size === 0 || assignmentIds.has(entry.assignmentId))
          ? entry.assignmentId
          : undefined;

      return {
        externalId: entry.id,
        customerCode: entry.customerId,
        customerName: customer?.name ?? entry.customerId,
        rentalCode,
        unitCode: asset?.assetCode,
        entryType: entry.type,
        effectiveDate: entry.effectiveDate,
        description: entry.description,
        amountMinor: entry.amountInCents,
        paymentMethod: entry.paymentMethod,
        reference: entry.reference,
        notes: entry.notes
      };
    });

  return {
    schema: "tenra-registry.ledger-export.v1",
    exportId: stableRegistryExportId("registry-ledger", [
      input.organizationId,
      ...rows.map((row) => row.externalId).sort()
    ]),
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    organizationId: input.organizationId,
    sourceApp: "registry",
    rows
  };
}
