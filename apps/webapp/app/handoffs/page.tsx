import Link from "next/link";
import { listHandoffAudits } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const registryHandoffSchemas = [
  "tenra-registry.ledger-export.v1",
  "tenra-registry.assembly-document-request.v1"
] as const;

export default async function HandoffsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const targetApp = getParam(params.targetApp);
  const deliveryStatus = getParam(params.deliveryStatus);
  const exportId = getParam(params.exportId);
  const schema = getParam(params.schema);
  const audits = await listHandoffAudits({ targetApp, deliveryStatus, exportId, schema });

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Handoffs</p>
        <h1>Export audit</h1>
        <p className="hero-card__summary">
          Registry records every Ledger and Assembly handoff download by stable export ID, so repeat downloads can be
          reconciled downstream without hidden filesystem coupling.
        </p>
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent exports</p>
            <h2>Ledger and Assembly downloads</h2>
          </div>
          <span className="pill">{audits.length} tracked</span>
        </div>

        <form className="form-grid two" method="get">
          <label className="field-stack">
            <span>Target</span>
            <select className="form-input" defaultValue={targetApp ?? ""} name="targetApp">
              <option value="">All targets</option>
              <option value="ledger">Ledger</option>
              <option value="assembly">Assembly</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Status</span>
            <select className="form-input" defaultValue={deliveryStatus ?? ""} name="deliveryStatus">
              <option value="">All statuses</option>
              <option value="downloaded">Downloaded</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <label className="field-stack">
            <span>Schema</span>
            <select className="form-input" defaultValue={schema ?? ""} name="schema">
              <option value="">All schemas</option>
              {registryHandoffSchemas.map((schemaId) => (
                  <option key={schemaId} value={schemaId}>
                    {schemaId}
                  </option>
                ))}
            </select>
          </label>
          <label className="field-stack">
            <span>Export ID</span>
            <input className="form-input" defaultValue={exportId ?? ""} name="exportId" />
          </label>
          <div className="actions-row">
            <button className="button-secondary" type="submit">
              Filter
            </button>
            <Link className="button-secondary button-link no-print" href="/handoffs">
              Reset
            </Link>
          </div>
        </form>

        {audits.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <h3>No handoffs downloaded yet</h3>
            <p>Export Ledger rows or an Assembly document request from Receivables to seed the audit trail.</p>
            <Link className="button-secondary button-link no-print" href="/receivables">
              Open receivables
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Export ID</th>
                  <th>Target</th>
                  <th>Schema</th>
                  <th>Rows</th>
                  <th>Downloads</th>
                  <th>Status</th>
                  <th>Last exported</th>
                  <th>Replay</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id}>
                    <td>
                      <Link href={`/handoffs/${encodeURIComponent(audit.exportId)}`}>
                        <code>{audit.exportId}</code>
                      </Link>
                      {audit.subjectId ? <div className="table-subcopy">Subject {audit.subjectId}</div> : null}
                    </td>
                    <td>{audit.targetApp}</td>
                    <td>{audit.schema}</td>
                    <td>{audit.rowCount}</td>
                    <td>{audit.downloadCount}</td>
                    <td>
                      <span className="pill">{audit.lastDeliveryStatus}</span>
                      {audit.lastDeliveryMessage ? (
                        <div className="table-subcopy">{audit.lastDeliveryMessage}</div>
                      ) : null}
                    </td>
                    <td>
                      <div>{formatDateTime(audit.lastExportedAt)}</div>
                      <div className="table-subcopy">First {formatDateTime(audit.firstExportedAt)}</div>
                    </td>
                    <td>
                      <Link
                        className="button-secondary button-link no-print"
                        href={`/api/handoffs/replay/${encodeURIComponent(audit.exportId)}`}
                      >
                        JSON
                      </Link>
                      <Link
                        className="button-secondary button-link no-print"
                        href={`/handoffs/${encodeURIComponent(audit.exportId)}`}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
