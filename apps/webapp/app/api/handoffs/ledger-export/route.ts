import { buildRegistryLedgerExport } from "@registry/api-contracts";
import { registryLedgerExportSchema } from "@registry/validation";
import { NextResponse } from "next/server";
import {
  getDefaultOrganization,
  listAssets,
  listAssignments,
  listCustomers,
  listReceivableEntries,
  recordHandoffAudit
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
    await recordHandoffAudit({
      organizationId: organization.id,
      exportId: payload.exportId,
      schema: payload.schema,
      targetApp: "ledger",
      rowCount: payload.rows.length,
      payloadSummary: {
        exportedAt: payload.exportedAt,
        totalMinor: payload.rows.reduce((sum, row) => sum + row.amountMinor, 0)
      }
    });

    return NextResponse.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="${payload.exportId}-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Registry ledger export failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
