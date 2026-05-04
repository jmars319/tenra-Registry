"use client";

import { getDocumentTemplateTypeLabel } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import { createGeneratedDocumentAction } from "../../../app/documents/actions";
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
  const [state, formAction] = useActionState(createGeneratedDocumentAction, initialFormActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <article className="panel-card document-create-card">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Make A Document</p>
          <h2>Pick, fill, print or email</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
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
          <FormSubmitButton idleLabel="Create document" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
