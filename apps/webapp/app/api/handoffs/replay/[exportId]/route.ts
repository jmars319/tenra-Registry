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
  recordHandoffAudit,
  updateHandoffDeliveryStatus
} from "../../../../../src/server/registry-data";

interface Params {
  params: Promise<{
    exportId: string;
  }>;
}

export const dynamic = "force-dynamic";

type ReplayPayloadResult = {
  audit: NonNullable<Awaited<ReturnType<typeof getHandoffAuditByExportId>>>;
  organizationId: string;
  payload: unknown;
  targetApp: "ledger" | "assembly";
  rowCount: number;
  subjectId?: string | undefined;
  payloadSummary: Record<string, unknown>;
};

// Replay payload boundary
async function buildReplayPayload(exportId: string): Promise<ReplayPayloadResult | { error: string; status: number }> {
  const audit = await getHandoffAuditByExportId(exportId);

  if (!audit) {
    return { error: "Handoff audit not found.", status: 404 };
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

    return {
      audit,
      organizationId: organization.id,
      payload,
      targetApp: "ledger",
      rowCount: payload.rows.length,
      payloadSummary: {
        replayedFrom: audit.exportId,
        exportedAt: payload.exportedAt,
        totalMinor: payload.rows.reduce((sum, row) => sum + row.amountMinor, 0)
      }
    };
  }

  if (audit.schema === "tenra-registry.assembly-document-request.v1" && audit.subjectId) {
    const customer = customers.find((candidate) => candidate.id === audit.subjectId);
    if (!customer) {
      return { error: "Replay customer is no longer available.", status: 404 };
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

    return {
      audit,
      organizationId: organization.id,
      payload,
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
    };
  }

  return { error: "This handoff cannot be replayed.", status: 400 };
}

// Replay audit boundary
async function recordReplay(result: ReplayPayloadResult) {
  const replayPayload = result.payload as { exportId: string; schema: string };
  return recordHandoffAudit({
    organizationId: result.organizationId,
    exportId: `${result.audit.exportId}:replay:${Date.now()}`,
    schema: replayPayload.schema,
    targetApp: result.targetApp,
    subjectId: result.subjectId,
    rowCount: result.rowCount,
    payloadSummary: {
      ...result.payloadSummary,
      replayedPayloadExportId: replayPayload.exportId
    } as never
  });
}

// Replay error boundary
function isReplayError(
  result: ReplayPayloadResult | { error: string; status: number }
): result is { error: string; status: number } {
  return "error" in result;
}

// JSON replay boundary
export async function GET(_request: Request, { params }: Params) {
  try {
    const { exportId } = await params;
    const result = await buildReplayPayload(exportId);

    if (isReplayError(result)) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await recordReplay(result);
    return NextResponse.json(result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff replay failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Direct delivery boundary
export async function POST(request: Request, { params }: Params) {
  try {
    const { exportId } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    const body = (contentType.includes("application/json")
      ? await request.json().catch(() => ({}))
      : Object.fromEntries((await request.formData()).entries())) as {
      endpoint?: string;
      message?: string;
    };
    const result = await buildReplayPayload(exportId);

    if (isReplayError(result)) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }

    const replayAudit = await recordReplay(result);

    const endpoint = body.endpoint?.trim();
    if (!endpoint) {
      await updateHandoffDeliveryStatus({
        exportId: replayAudit.exportId,
        status: "downloaded",
        message: "Replay returned JSON fallback without direct delivery."
      });
      return NextResponse.json({
        ok: true,
        delivered: false,
        deliveryMode: "json-fallback",
        targetApp: result.targetApp,
        payload: result.payload
      });
    }

    const downstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.payload)
    });

    if (!downstream.ok) {
      const message = await downstream.text();
      await updateHandoffDeliveryStatus({
        exportId: result.audit.exportId,
        status: "failed",
        message: `Replay delivery to ${result.targetApp} failed: ${message.slice(0, 240)}`
      });
      await updateHandoffDeliveryStatus({
        exportId: replayAudit.exportId,
        status: "failed",
        message: `Direct replay POST failed: ${message.slice(0, 240)}`
      });
      return NextResponse.json(
        {
          ok: true,
          delivered: false,
          deliveryMode: "json-fallback",
          targetApp: result.targetApp,
          error: message,
          payload: result.payload
        },
        { status: 502 }
      );
    }

    await updateHandoffDeliveryStatus({
      exportId: result.audit.exportId,
      status: "sent",
      message: body.message ?? `Replay delivered to ${result.targetApp}.`
    });
    await updateHandoffDeliveryStatus({
      exportId: replayAudit.exportId,
      status: "sent",
      message: body.message ?? `Replay delivered to ${result.targetApp}.`
    });

    return NextResponse.json({
      ok: true,
      delivered: true,
      deliveryMode: "direct-post",
      targetApp: result.targetApp,
      message: body.message ?? `Replay delivered to ${result.targetApp}.`,
      response: await downstream.json().catch(() => ({}))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Handoff replay delivery failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
