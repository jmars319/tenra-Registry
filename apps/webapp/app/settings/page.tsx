import { requiredEnvVars } from "@registry/config";

const settingsSections = [
  {
    title: "Organization defaults",
    items: [
      "Business name and default document sender",
      "Default billing country and office contact details",
      "Default rent cadence labels and unit naming conventions"
    ]
  },
  {
    title: "Data and backups",
    items: [
      "Postgres connection through DATABASE_URL",
      "CSV import dry runs before writes",
      "Import batch audit trail and rollback for imported records",
      "Document PDF export and printable document views"
    ]
  },
  {
    title: "Desktop behavior",
    items: [
      "Settings, Close Window, and Quit are present in the macOS app menu",
      "Close Window hides the window without changing the local database",
      "Quit stops the Registry desktop wrapper and app-owned server process"
    ]
  },
  {
    title: "Future integrations",
    items: [
      "Ledger handoff for posted charges, payments, deposits, refunds, and adjustments",
      "Align handoff for public location/profile state",
      "Assembly handoff for approved document and content requests",
      "Proxy handoff for reviewed outgoing wording"
    ]
  }
] as const;

export default function SettingsPage() {
  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Settings</p>
        <h1>Registry operating setup</h1>
        <p className="hero-card__summary">
          Current settings focus on local data readiness, import safety, desktop lifecycle, and the integration points
          that should stay explicit as Registry grows.
        </p>
      </div>

      <div className="overview-grid">
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Environment</p>
              <h2>Required local configuration</h2>
            </div>
          </div>
          <div className="tag-list">
            {requiredEnvVars.map((name) => (
              <span className="tag" key={name}>
                {name}
              </span>
            ))}
          </div>
          <p className="table-subcopy">
            Registry uses the local production web app and Postgres database. The desktop launcher checks startup
            readiness and reports database or migration problems clearly.
          </p>
        </article>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operator Access</p>
              <h2>Role model ready</h2>
            </div>
          </div>
          <p>
            The shared auth package defines owner, manager, operator, and viewer roles. Provider selection and sign-in
            can be added later without changing the rental records.
          </p>
        </article>
      </div>

      <div className="settings-grid">
        {settingsSections.map((section) => (
          <article className="panel-card" key={section.title}>
            <h2>{section.title}</h2>
            <ul className="settings-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
