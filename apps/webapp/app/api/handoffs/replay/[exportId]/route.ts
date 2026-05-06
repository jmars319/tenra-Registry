import {
  buildRegistryAssemblyDocumentRequest,
  buildRegistryLedgerExport
} from "@registry/api-contracts";
import {
  registryAssemblyDocumentRequestSchema,
  registryLedgerExportSchema
} from "@registry/validation";
import { NextResponse } from "next/server";
import {
  getDefaultOrganization,
  getHandoffAuditByExportId,
  listAssets,
  listAssignments,
  listCustomers,
  listReceivableEntries,
  recordHandoffAudit
} from "../../../../../src/server/registry-data";

interface Params {
  params: Promise<{
    exportId: string;
  }>;
}

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: Params) {
  try {
    const { exportId } = await params;
    const audit = await getHandoffAuditByExportId(exportId);

    if (!audit) {
      return NextResponse.json({ error: "Handoff audit not found." }, { status: 404 });
    }

    const [organization, entries, customers, assignments, assets] = await Promise.all([
      getDefaultOrganization(),
      listReceivableEntries(),
      listCustomers(),
      listAssignments(),
      listAssets()
    ]);

    if (audit.schema === "tenra-registry.ledger-export.v1") {
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
          replayedFrom: audit.exportId,
          exportedAt: payload.exportedAt,
          totalMinor: payload.rows.reduce((sum, row) => sum + row.amountMinor, 0)
        }
      });

      return NextResponse.json(payload);
    }

    if (audit.schema === "tenra-registry.assembly-document-request.v1" && audit.subjectId) {
      const customer = customers.find((candidate) => candidate.id === audit.subjectId);
      if (!customer) {
        return NextResponse.json({ error: "Replay customer is no longer available." }, { status: 404 });
      }
      const assignment =
        assignments.find((candidate) => candidate.customerId === customer.id && candidate.status === "active") ??
        assignments.find((candidate) => candidate.customerId === customer.id);
      const asset = assignment ? assets.find((candidate) => candidate.id === assignment.assetId) : undefined;
      const payload = registryAssemblyDocumentRequestSchema.parse(
        buildRegistryAssemblyDocumentRequest({
          organizationId: organization.id,
          customer,
          assignment,
          asset,
          entries: entries.filter((entry) => entry.customerId === customer.id),
          documentType: customer.pastDueInCents > 0 ? "past-due-notice" : "account-statement",
          desiredOutput: customer.pastDueInCents > 0 ? "notice" : "statement"
        })
      );

      await recordHandoffAudit({
        organizationId: organization.id,
        exportId: payload.exportId,
        schema: payload.schema,
        targetApp: "assembly",
        subjectId: customer.id,
        rowCount: 1,
        payloadSummary: {
          replayedFrom: audit.exportId,
          exportedAt: payload.exportedAt,
          customerName: customer.name,
          documentType: payload.documentType,
          desiredOutput: payload.desiredOutput
        }
      });

      return NextResponse.json(payload);
    }

    return NextResponse.json({ error: "This handoff cannot be replayed." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff replay failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
