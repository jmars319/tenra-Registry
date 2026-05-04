"use client";

interface DocumentDeliveryActionsProps {
  body: string;
  recipientEmail?: string | undefined;
  subject?: string | undefined;
}

function createMailtoHref(recipientEmail: string | undefined, subject: string | undefined, body: string): string {
  const address = recipientEmail ?? "";
  const params = new URLSearchParams({
    subject: subject ?? "Document from tenra Registry",
    body
  });

  return `mailto:${encodeURIComponent(address)}?${params.toString()}`;
}

export function DocumentDeliveryActions({ body, recipientEmail, subject }: DocumentDeliveryActionsProps) {
  return (
    <div className="document-actions no-print">
      <button className="button-primary" onClick={() => window.print()} type="button">
        Print
      </button>
      <a className="button-secondary button-link" href={createMailtoHref(recipientEmail, subject, body)}>
        Email
      </a>
    </div>
  );
}
