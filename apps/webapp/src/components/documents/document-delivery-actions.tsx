"use client";

import { useTransition } from "react";
import {
  markGeneratedDocumentEmailedAction,
  markGeneratedDocumentPrintedAction
} from "../../../app/documents/actions";

interface DocumentDeliveryActionsProps {
  body: string;
  documentId: string;
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

export function DocumentDeliveryActions({ body, documentId, recipientEmail, subject }: DocumentDeliveryActionsProps) {
  const [isPending, startTransition] = useTransition();
  const mailtoHref = createMailtoHref(recipientEmail, subject, body);

  function handlePrint(): void {
    startTransition(() => {
      void markGeneratedDocumentPrintedAction(documentId).finally(() => {
        window.print();
      });
    });
  }

  function handleEmail(): void {
    startTransition(() => {
      void markGeneratedDocumentEmailedAction(documentId).finally(() => {
        window.location.href = mailtoHref;
      });
    });
  }

  return (
    <div className="document-actions no-print">
      <button className="button-primary" disabled={isPending} onClick={handlePrint} type="button">
        {isPending ? "Working..." : "Print"}
      </button>
      <button className="button-secondary" disabled={isPending} onClick={handleEmail} type="button">
        Email draft
      </button>
    </div>
  );
}
