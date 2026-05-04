import { getDocumentTemplateTypeLabel } from "@registry/domain";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentDeliveryActions } from "../../../src/components/documents/document-delivery-actions";
import { formatDateLabel } from "../../../src/components/registry/formatters";
import { StatusPill } from "../../../src/components/registry/status-pill";
import { getGeneratedDocumentDetail } from "../../../src/server/registry-data";

export const dynamic = "force-dynamic";

interface DocumentDetailPageProps {
  params: Promise<{
    documentId: string;
  }>;
}

export default async function DocumentDetailPage({ params }: DocumentDetailPageProps) {
  const { documentId } = await params;
  const detail = await getGeneratedDocumentDetail(documentId);

  if (!detail) {
    notFound();
  }

  return (
    <section className="stack document-detail-page">
      <div className="hero-card hero-card--compact no-print">
        <p className="eyebrow">Document Preview</p>
        <h1>{detail.document.title}</h1>
        <p className="hero-card__summary">
          {getDocumentTemplateTypeLabel(detail.document.type)} · Created {formatDateLabel(detail.document.createdAt.slice(0, 10))}
        </p>
      </div>

      <div className="document-preview-layout">
        <aside className="document-side-panel no-print">
          <article className="panel-card">
            <div className="section-heading section-heading--compact">
              <div>
                <p className="eyebrow">Ready</p>
                <h2>Use this document</h2>
              </div>
              <StatusPill status={detail.document.status} />
            </div>
            <DocumentDeliveryActions
              body={detail.document.body}
              documentId={detail.document.id}
              recipientEmail={detail.document.recipientEmail}
              subject={detail.document.subject}
            />
            <dl className="detail-list">
              <div>
                <dt>Customer</dt>
                <dd>
                  {detail.document.customerHref ? (
                    <Link className="inline-link" href={detail.document.customerHref}>
                      {detail.document.customerName}
                    </Link>
                  ) : (
                    "No customer linked"
                  )}
                </dd>
              </div>
              <div>
                <dt>Unit</dt>
                <dd>{detail.document.assetCode ?? "No unit linked"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{detail.document.recipientEmail ?? "No email on file"}</dd>
              </div>
              <div>
                <dt>Printed</dt>
                <dd>
                  {detail.document.printedAt
                    ? formatDateLabel(detail.document.printedAt.slice(0, 10))
                    : "Not printed yet"}
                </dd>
              </div>
              <div>
                <dt>Email opened</dt>
                <dd>
                  {detail.document.emailedAt
                    ? formatDateLabel(detail.document.emailedAt.slice(0, 10))
                    : "Not emailed yet"}
                </dd>
              </div>
            </dl>
            <Link className="inline-link" href="/documents">
              Back to documents
            </Link>
          </article>
        </aside>

        <article className="document-sheet">
          <header className="document-sheet__header">
            <p>tenra Registry</p>
            <h2>{detail.document.title}</h2>
            {detail.document.subject ? <span>{detail.document.subject}</span> : null}
          </header>
          <div className="document-sheet__body">
            {detail.document.body.split("\n").map((line, index) => (
              <p key={`${line}-${index}`}>{line || "\u00a0"}</p>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
