import { getDocumentTemplateTypeLabel } from "@registry/domain";
import Link from "next/link";
import { AccountStatementForm } from "../../src/components/forms/account-statement-form";
import { DocumentTemplateForm } from "../../src/components/forms/document-template-form";
import { GeneratedDocumentForm } from "../../src/components/forms/generated-document-form";
import { formatDateLabel } from "../../src/components/registry/formatters";
import { StatusPill } from "../../src/components/registry/status-pill";
import {
  getDocumentFormOptions,
  listGeneratedDocuments
} from "../../src/server/registry-data";

export const dynamic = "force-dynamic";

const quickSteps = [
  "Choose the paperwork",
  "Pick the customer or rental",
  "Review the filled document",
  "Print or open an email draft"
] as const;

export default async function DocumentsPage() {
  const [options, documents] = await Promise.all([getDocumentFormOptions(), listGeneratedDocuments()]);

  return (
    <section className="stack">
      <div className="hero-card hero-card--compact document-hero">
        <p className="eyebrow">Documents</p>
        <h1>Paperwork without retyping</h1>
        <p className="hero-card__summary">
          Pick a document, choose who it is for, and Registry fills in the customer, unit, site, rate, and balance
          details. The result is ready to read, print, or email.
        </p>
      </div>

      <div className="document-step-grid">
        {quickSteps.map((step, index) => (
          <article className="document-step" key={step}>
            <strong>{index + 1}</strong>
            <span>{step}</span>
          </article>
        ))}
      </div>

      <div className="workspace-grid">
        <div className="panel-stack">
          <GeneratedDocumentForm
            customers={options.customers}
            rentals={options.rentals}
            templates={options.templates}
          />
          <AccountStatementForm customers={options.customers} />
          <article className="panel-card panel-card--soft">
            <h2>Document records</h2>
            <p>
              Saved templates turn customer, unit, rental, site, and balance details into a ready document for review,
              printing, or email. Account statements are generated directly from posted charges and payments.
            </p>
          </article>
        </div>

        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Ready Documents</p>
              <h2>Created paperwork</h2>
            </div>
            <span className="pill">{documents.length} documents</span>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <h3>No documents yet</h3>
              <p>Create the first document from a saved template.</p>
            </div>
          ) : (
            <div className="document-list">
              {documents.map((document) => (
                <article className="document-list-item" key={document.id}>
                  <div>
                    <div className="activity-item__heading">
                      <Link className="inline-link" href={`/documents/${document.id}`}>
                        {document.title}
                      </Link>
                      <StatusPill status={document.status} />
                    </div>
                    <p>
                      {[document.customerName, document.assetCode].filter(Boolean).join(" · ") || "General document"}
                    </p>
                    <p className="activity-item__meta">{formatDateLabel(document.createdAt.slice(0, 10))}</p>
                  </div>
                  <Link className="button-secondary button-link" href={`/documents/${document.id}`}>
                    Review
                  </Link>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Saved Forms</p>
            <h2>Reusable templates</h2>
          </div>
          <span className="pill">{options.templates.length} active</span>
        </div>

        <div className="document-template-grid">
          {options.templates.map((template) => (
            <article className="document-template-card" key={template.id}>
              <h3>{template.name}</h3>
              <p>{getDocumentTemplateTypeLabel(template.type)}</p>
              <div className="tag-list">
                {template.printEnabled ? <span className="tag">Print</span> : null}
                {template.emailEnabled ? <span className="tag">Email</span> : null}
              </div>
            </article>
          ))}
        </div>
      </article>

      <details className="document-template-details">
        <summary>Customize document wording</summary>
        <DocumentTemplateForm />
      </details>
    </section>
  );
}
