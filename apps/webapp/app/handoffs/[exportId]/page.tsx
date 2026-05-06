import {
  buildRegistryAssemblyDocumentRequest,
  buildRegistryLedgerExport
} from "@registry/api-contracts";
import {
  registryAssemblyDocumentRequestSchema,
  registryLedgerExportSchema
} from "@registry/validation";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getDefaultOrganization,
  getHandoffAuditByExportId,
  listAssets,
  listAssignments,
  listCustomers,
  listReceivableEntries
} from "../../../src/server/registry-data";

interface Params {
  params: Promise<{
    exportId: string;
  }>;
}

type ReplayPreview = {
  payload: unknown | null;
  currentSummary: Record<string, unknown>;
  differences: string[];
  error?: string | undefined;
};

export const dynamic = "force-dynamic";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function diffSummary(original: unknown, current: Record<string, unknown>): string[] {
  const originalSummary = asRecord(original);
  const keys = [...new Set([...Object.keys(originalSummary), ...Object.keys(current)])].sort();

  return keys
    .filter((key) => JSON.stringify(originalSummary[key]) !== JSON.stringify(current[key]))
    .map((key) => `${key}: ${JSON.stringify(originalSummary[key] ?? null)} -> ${JSON.stringify(current[key] ?? null)}`);
}

async function buildReplayPreview(exportId: string): Promise<ReplayPreview> {
  const audit = await getHandoffAuditByExportId(exportId);
  if (!audit) {
    return { payload: null, currentSummary: {}, differences: ["Audit record is no longer available."] };
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
    const currentSummary = {
      rowCount: payload.rows.length,
      totalMinor: payload.rows.reduce((sum, row) => sum + row.amountMinor, 0),
      exportedAt: payload.exportedAt
    };

    return {
      payload,
      currentSummary,
      differences: diffSummary(audit.payloadSummary, currentSummary)
    };
  }

  if (audit.schema === "tenra-registry.assembly-document-request.v1" && audit.subjectId) {
    const customer = customers.find((candidate) => candidate.id === audit.subjectId);
    if (!customer) {
      return {
        payload: null,
        currentSummary: {},
        differences: ["Replay customer is no longer available."],
        error: "Replay customer is no longer available."
      };
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
    const currentSummary = {
      customerName: customer.name,
      documentType: payload.documentType,
      desiredOutput: payload.desiredOutput,
      exportedAt: payload.exportedAt
    };

    return {
      payload,
      currentSummary,
      differences: diffSummary(audit.payloadSummary, currentSummary)
    };
  }

  return {
    payload: null,
    currentSummary: {},
    differences: ["This handoff schema cannot be replayed from current Registry data."],
    error: "This handoff schema cannot be replayed from current Registry data."
  };
}

export default async function HandoffDetailPage({ params }: Params) {
  const { exportId } = await params;
  const audit = await getHandoffAuditByExportId(exportId);

  if (!audit) {
    notFound();
  }

  const replay = await buildReplayPreview(exportId);

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Handoff detail</p>
        <h1>{audit.exportId}</h1>
        <p className="hero-card__summary">
          Replay payload preview and summary drift check for the current Registry source records.
        </p>
        <div className="actions-row">
          <Link className="button-secondary button-link no-print" href="/handoffs">
            Back to audit
          </Link>
          <Link className="button-secondary button-link no-print" href={`/api/handoffs/replay/${encodeURIComponent(audit.exportId)}`}>
            Replay JSON
          </Link>
        </div>
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit</p>
            <h2>Recorded delivery state</h2>
          </div>
          <span className="pill">{audit.lastDeliveryStatus}</span>
        </div>
        <div className="detail-grid">
          <div>
            <span>Target</span>
            <strong>{audit.targetApp}</strong>
          </div>
          <div>
            <span>Schema</span>
            <strong>{audit.schema}</strong>
          </div>
          <div>
            <span>Rows</span>
            <strong>{audit.rowCount}</strong>
          </div>
          <div>
            <span>Downloads</span>
            <strong>{audit.downloadCount}</strong>
          </div>
          <div>
            <span>First exported</span>
            <strong>{formatDateTime(audit.firstExportedAt)}</strong>
          </div>
          <div>
            <span>Last exported</span>
            <strong>{formatDateTime(audit.lastExportedAt)}</strong>
          </div>
        </div>
      </article>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Replay delivery</p>
            <h2>Post current payload to {audit.targetApp}</h2>
          </div>
          <span className="pill">direct POST</span>
        </div>
        <p className="table-subcopy">
          Paste a local Ledger or Assembly intake endpoint to replay this handoff through an explicit API call. Leaving
          the endpoint blank returns the regenerated JSON fallback.
        </p>
        <form
          action={`/api/handoffs/replay/${encodeURIComponent(audit.exportId)}`}
          className="form-grid two"
          method="post"
        >
          <label className="field-stack">
            <span>{audit.targetApp === "ledger" ? "Ledger import endpoint" : "Assembly import endpoint"}</span>
            <input
              className="form-input"
              name="endpoint"
              placeholder={
                audit.targetApp === "ledger"
                  ? "http://localhost:4174/api/handoffs/registry-ledger"
                  : "http://localhost:3000/api/handoffs/registry-document"
              }
            />
          </label>
          <label className="field-stack">
            <span>Delivery note</span>
            <input
              className="form-input"
              name="message"
              placeholder={`Replay delivered to ${audit.targetApp}`}
            />
          </label>
          <div className="actions-row">
            <button className="button-secondary" type="submit">
              Replay POST
            </button>
          </div>
        </form>
      </article>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Diff</p>
            <h2>Recorded summary vs current replay</h2>
          </div>
          <span className="pill">{replay.differences.length} change(s)</span>
        </div>
        {replay.error ? <p className="table-subcopy">{replay.error}</p> : null}
        {replay.differences.length ? (
          <ul className="inline-issues">
            {replay.differences.map((difference) => (
              <li key={difference}>{difference}</li>
            ))}
          </ul>
        ) : (
          <p className="table-subcopy">The replay summary matches the original recorded summary.</p>
        )}
        <div className="form-grid two">
          <label className="field-stack">
            <span>Recorded summary</span>
            <pre className="code-block">{JSON.stringify(audit.payloadSummary, null, 2)}</pre>
          </label>
          <label className="field-stack">
            <span>Current summary</span>
            <pre className="code-block">{JSON.stringify(replay.currentSummary, null, 2)}</pre>
          </label>
        </div>
      </article>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Replay payload</p>
            <h2>Preview</h2>
          </div>
        </div>
        <pre className="code-block">{JSON.stringify(replay.payload ?? { error: replay.error }, null, 2)}</pre>
      </article>
    </section>
  );
}
