import { buildRegistryAssemblyDocumentRequest } from "@registry/api-contracts";
import { registryAssemblyDocumentRequestSchema } from "@registry/validation";
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedCustomerId = url.searchParams.get("customerId");
    const [organization, customers, assignments, assets, entries] = await Promise.all([
      getDefaultOrganization(),
      listCustomers(),
      listAssignments(),
      listAssets(),
      listReceivableEntries()
    ]);
    const customer = requestedCustomerId
      ? customers.find((candidate) => candidate.id === requestedCustomerId)
      : customers.find((candidate) => candidate.pastDueInCents > 0) ?? customers[0];

    if (!customer) {
      return NextResponse.json({ error: "No customer is available for an Assembly document request." }, { status: 404 });
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
        exportedAt: payload.exportedAt,
        customerName: customer.name,
        documentType: payload.documentType,
        desiredOutput: payload.desiredOutput
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
    const message = error instanceof Error ? error.message : "Registry Assembly document request failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
