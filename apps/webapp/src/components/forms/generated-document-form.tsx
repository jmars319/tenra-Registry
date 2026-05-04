"use client";

import { getDocumentTemplateTypeLabel } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import {
  previewGeneratedDocumentAction,
  saveGeneratedDocumentDraftAction,
  type GeneratedDocumentFormActionState
} from "../../../app/documents/actions";
import type {
  DocumentRentalOption,
  ReceivableCustomerOption
} from "../../server/registry-data";
import type { DocumentTemplate } from "@registry/domain";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

interface GeneratedDocumentFormProps {
  customers: ReceivableCustomerOption[];
  rentals: DocumentRentalOption[];
  templates: DocumentTemplate[];
}

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

export function GeneratedDocumentForm({ customers, rentals, templates }: GeneratedDocumentFormProps) {
  const [state, previewFormAction] = useActionState<GeneratedDocumentFormActionState, FormData>(
    previewGeneratedDocumentAction,
    initialFormActionState
  );
  const [saveState, saveFormAction] = useActionState<GeneratedDocumentFormActionState, FormData>(
    saveGeneratedDocumentDraftAction,
    initialFormActionState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (saveState.status === "success") {
      formRef.current?.reset();
    }
  }, [saveState.status]);

  return (
    <article className="panel-card document-create-card">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Make A Document</p>
          <h2>Pick, fill, print or email</h2>
        </div>
      </div>

      <form action={previewFormAction} className="form-stack" ref={formRef}>
        <label className="form-field">
          <span>Document</span>
          <select className="form-select" name="templateId" required>
            <option value="">Choose a document</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {getDocumentTemplateTypeLabel(template.type)}
              </option>
            ))}
          </select>
          <small className="field-error">{getFieldError(state.fieldErrors, "templateId")}</small>
        </label>

        <label className="form-field">
          <span>Customer</span>
          <select className="form-select" name="customerId">
            <option value="">Choose a customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.label}
              </option>
            ))}
          </select>
          <small className="field-error">{getFieldError(state.fieldErrors, "customerId")}</small>
        </label>

        <label className="form-field">
          <span>Rental</span>
          <select className="form-select" name="assignmentId">
            <option value="">No specific rental</option>
            {rentals.map((rental) => (
              <option key={rental.id} value={rental.id}>
                {rental.label}
              </option>
            ))}
          </select>
          <small className="field-error">{getFieldError(state.fieldErrors, "assignmentId")}</small>
        </label>

        <label className="form-field">
          <span>Document title</span>
          <input className="form-input" name="title" placeholder="Optional custom title" type="text" />
          <small className="field-error">{getFieldError(state.fieldErrors, "title")}</small>
        </label>

        <div className="form-actions">
          <div className="form-feedback">
            {state.message ? (
              <p className={state.status === "error" ? "form-message form-message--error" : "form-message"}>
                {state.message}
              </p>
            ) : null}
          </div>
          <FormSubmitButton idleLabel="Preview document" pendingLabel="Preparing..." />
        </div>
      </form>

      {state.preview ? (
        <form action={saveFormAction} className="form-stack document-draft-form">
          <input name="templateId" type="hidden" value={state.preview.templateId ?? ""} />
          <input name="customerId" type="hidden" value={state.preview.customerId} />
          <input name="assignmentId" type="hidden" value={state.preview.assignmentId ?? ""} />
          <input name="assetId" type="hidden" value={state.preview.assetId ?? ""} />
          <input name="type" type="hidden" value={state.preview.type} />
          <input name="recipientEmail" type="hidden" value={state.preview.recipientEmail ?? ""} />

          <div className="section-heading section-heading--compact">
            <div>
              <p className="eyebrow">Review</p>
              <h2>Edit before saving</h2>
            </div>
          </div>

          <label className="form-field">
            <span>Title</span>
            <input className="form-input" defaultValue={state.preview.title} name="title" required type="text" />
            <small className="field-error">{getFieldError(saveState.fieldErrors, "title")}</small>
          </label>

          <label className="form-field">
            <span>Email subject</span>
            <input className="form-input" defaultValue={state.preview.subject ?? ""} name="subject" type="text" />
            <small className="field-error">{getFieldError(saveState.fieldErrors, "subject")}</small>
          </label>

          <label className="form-field">
            <span>Document wording</span>
            <textarea className="form-textarea" defaultValue={state.preview.body} name="body" required rows={12} />
            <small className="field-error">{getFieldError(saveState.fieldErrors, "body")}</small>
          </label>

          <p className="table-subcopy">
            {state.preview.customerName}
            {state.preview.assetCode ? ` · ${state.preview.assetCode}` : ""}
          </p>

          <div className="form-actions">
            <div className="form-feedback">
              {saveState.message ? (
                <p className={saveState.status === "error" ? "form-message form-message--error" : "form-message"}>
                  {saveState.message}
                </p>
              ) : null}
            </div>
            <FormSubmitButton idleLabel="Save document" pendingLabel="Saving..." />
          </div>
        </form>
      ) : null}
    </article>
  );
}
