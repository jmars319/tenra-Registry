import { getCsvHeader, registryImportSpecs } from "../../src/server/import-specs";

export const dynamic = "force-dynamic";

export default function ImportsPage() {
  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Imports</p>
        <h1>Total Recall cutover prep</h1>
        <p className="hero-card__summary">
          Registry is prepared for real customer, unit, active-rental, and opening-balance imports. These blank CSV
          layouts define the expected fields without adding sample business records.
        </p>
      </div>

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
