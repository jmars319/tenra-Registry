"use client";

import { useActionState, useEffect, useRef } from "react";
import { createAccountStatementDocumentAction } from "../../../app/documents/actions";
import type { ReceivableCustomerOption } from "../../server/registry-data";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

interface AccountStatementFormProps {
  customers: ReceivableCustomerOption[];
}

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

export function AccountStatementForm({ customers }: AccountStatementFormProps) {
  const [state, formAction] = useActionState(createAccountStatementDocumentAction, initialFormActionState);
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
          <p className="eyebrow">Statements</p>
          <h2>Create account statement</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <label className="form-field">
          <span>Customer account</span>
          <select className="form-select" name="customerId" required>
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
          <span>Statement title</span>
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
          <FormSubmitButton idleLabel="Create statement" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
