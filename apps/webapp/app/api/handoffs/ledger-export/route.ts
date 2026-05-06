import { buildRegistryLedgerExport } from "@registry/api-contracts";
import { registryLedgerExportSchema } from "@registry/validation";
import { NextResponse } from "next/server";
import {
  getDefaultOrganization,
  listAssets,
  listAssignments,
  listCustomers,
  listReceivableEntries
} from "../../../../src/server/registry-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [organization, entries, customers, assignments, assets] = await Promise.all([
      getDefaultOrganization(),
      listReceivableEntries(),
      listCustomers(),
      listAssignments(),
      listAssets()
    ]);
    const payload = registryLedgerExportSchema.parse(
      buildRegistryLedgerExport({
        organizationId: organization.id,
        entries,
        customers,
        assignments,
        assets
      })
    );

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="registry-ledger-export-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registry ledger export failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
