import { getDocumentTemplateTypeLabel } from "@registry/domain";
import { DocumentTemplateForm } from "../../src/components/forms/document-template-form";
import { StatusPill } from "../../src/components/registry/status-pill";
import { listDocumentTemplates } from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

const standardDocumentTypes = [
  "Container rental agreement",
  "Delivery ticket / proof of delivery",
  "Pickup ticket / proof of return",
  "Condition report",
  "Payment receipt",
  "Account statement",
  "Past-due notice",
  "Deposit receipt",
  "General customer letter"
] as const;

export default async function DocumentsPage() {
  const templates = await listDocumentTemplates();

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact">
        <p className="eyebrow">Documents</p>
        <h1>Customizable rental documents</h1>
        <p className="hero-card__summary">
          Maintain templates for printable and email-ready paperwork. Templates can use merge fields from customers,
          units, rentals, balances, delivery sites, and payment records.
        </p>
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <DocumentTemplateForm />
          <article className="panel-card panel-card--soft">
            <h2>Document boundary</h2>
            <p>
              Registry should render business-approved templates. It can merge data, track template versions, print,
              export, and prepare email delivery, but legal wording should remain reviewed and intentional.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Template Library</p>
              <h2>Available templates</h2>
            </div>
            <span className="pill">{templates.length} templates</span>
          </div>

          {templates.length === 0 ? (
            <div className="empty-state">
              <h3>No templates yet</h3>
              <p>Create templates for agreements, tickets, receipts, statements, and notices.</p>
            </div>
          ) : (
            <div className="document-grid">
              {templates.map((template) => (
                <article className="document-card" key={template.id}>
                  <div className="activity-item__heading">
                    <div>
                      <h3>{template.name}</h3>
                      <p className="table-subcopy">{getDocumentTemplateTypeLabel(template.type)}</p>
                    </div>
                    <StatusPill status={template.active ? "active" : "inactive"} />
                  </div>
                  <p>{template.subject ?? "No email subject"}</p>
                  <div className="tag-list">
                    {template.printEnabled ? <span className="tag">Print</span> : null}
                    {template.emailEnabled ? <span className="tag">Email</span> : null}
                    {template.mergeFields.slice(0, 4).map((field) => (
                      <span className="tag" key={field}>
                        {field}
                      </span>
                    ))}
                  </div>
                  <pre className="document-preview">{template.body}</pre>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Coverage</p>
            <h2>Standard document set</h2>
          </div>
        </div>
        <div className="tag-list">
          {standardDocumentTypes.map((documentType) => (
            <span className="tag" key={documentType}>
              {documentType}
            </span>
          ))}
        </div>
      </article>
    </section>
  );
}
