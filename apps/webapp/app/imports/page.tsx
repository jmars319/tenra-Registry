import { getCsvHeader, registryImportSpecs } from "../../src/server/import-specs";
import { rollbackImportBatchAction } from "./actions";
import { ImportWorkspace } from "../../src/components/imports/import-workspace";
import { StatusPill } from "../../src/components/registry/status-pill";
import { listImportBatches } from "../../src/server/import-processor";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const batches = await listImportBatches();

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Imports</p>
        <h1>Total Recall cutover prep</h1>
        <p className="hero-card__summary">
          Registry is prepared for real customer, unit, active-rental, opening-balance, and payment-history imports.
          These blank CSV layouts define the expected fields without adding sample business records.
        </p>
      </div>

      <article className="panel-card panel-card--soft">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Cutover Order</p>
            <h2>Recommended import sequence</h2>
          </div>
        </div>
        <div className="document-step-grid">
          {["Customers", "Container units", "Active rentals", "Opening balances", "Payment history"].map((step, index) => (
            <article className="document-step" key={step}>
              <strong>{index + 1}</strong>
              <span>{step}</span>
            </article>
          ))}
        </div>
      </article>

      <ImportWorkspace specs={registryImportSpecs} />

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit</p>
            <h2>Import batches</h2>
          </div>
          <span className="pill">{batches.length} recent</span>
        </div>

        {batches.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <h3>No imports yet</h3>
            <p>Completed imports will appear here with rollback status and traced record counts.</p>
          </div>
        ) : (
          <div className="activity-list">
            {batches.map((batch) => (
              <article className="activity-item" key={batch.id}>
                <div className="activity-item__heading">
                  <strong>{batch.label}</strong>
                  <StatusPill status={batch.status} />
                </div>
                <p>{batch.recordCount} traced records</p>
                <p className="activity-item__meta">
                  Created {batch.createdAt}
                  {batch.rolledBackAt ? ` · rolled back ${batch.rolledBackAt.slice(0, 10)}` : ""}
                </p>
                <div className="tag-list">
                  {Object.entries(batch.summary).map(([key, value]) => (
                    <span className="tag" key={key}>
                      {key}: {String(value)}
                    </span>
                  ))}
                </div>
                {batch.status === "imported" ? (
                  <form action={rollbackImportBatchAction} className="form-actions no-print">
                    <input name="batchId" type="hidden" value={batch.id} />
                    <button className="button-secondary button-secondary--warning" type="submit">
                      Roll back import
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </article>

      <div className="import-spec-grid">
        {registryImportSpecs.map((spec) => (
          <article className="panel-card" key={spec.key}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{spec.fileName}</p>
                <h2>{spec.title}</h2>
              </div>
              <a className="button-secondary button-link no-print" href={`/imports/${spec.key}`}>
                Download headers
              </a>
            </div>
            <p>{spec.purpose}</p>
            <pre className="import-header-preview">{getCsvHeader(spec)}</pre>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Required</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {spec.fields.map((field) => (
                    <tr key={field.key}>
                      <td>{field.key}</td>
                      <td>{field.required ? "Yes" : "No"}</td>
                      <td>{field.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
