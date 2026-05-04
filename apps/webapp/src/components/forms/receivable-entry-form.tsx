"use client";

import { getReceivableEntryTypeLabel, receivableEntryTypes } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import { createReceivableEntryAction } from "../../../app/receivables/actions";
import type {
  ReceivableAssignmentOption,
  ReceivableCustomerOption
} from "../../server/registry-data";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

interface ReceivableEntryFormProps {
  assignments: ReceivableAssignmentOption[];
  customers: ReceivableCustomerOption[];
}

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

function getTodayDate(): string {
  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() - currentDate.getTimezoneOffset());
  return currentDate.toISOString().slice(0, 10);
}

export function ReceivableEntryForm({ assignments, customers }: ReceivableEntryFormProps) {
  const [state, formAction] = useActionState(createReceivableEntryAction, initialFormActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <article className="panel-card">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Post Entry</p>
          <h2>Charge, payment, or credit</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <div className="field-grid">
          <label className="form-field">
            <span>Customer</span>
            <select className="form-select" name="customerId" required>
              <option value="">Select a customer</option>
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
              {assignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.label}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "assignmentId")}</small>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>Type</span>
            <select className="form-select" defaultValue="charge" name="type">
              {receivableEntryTypes.map((type) => (
                <option key={type} value={type}>
                  {getReceivableEntryTypeLabel(type)}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "type")}</small>
          </label>

          <label className="form-field">
            <span>Amount</span>
            <input className="form-input" min="0.01" name="amountDollars" placeholder="185.00" required step="0.01" type="number" />
            <small className="field-error">{getFieldError(state.fieldErrors, "amountInCents")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Description</span>
          <input className="form-input" name="description" placeholder="Monthly container rent" required type="text" />
          <small className="field-error">{getFieldError(state.fieldErrors, "description")}</small>
        </label>

        <div className="field-grid">
          <label className="form-field">
            <span>Effective date</span>
            <input className="form-input" defaultValue={getTodayDate()} name="effectiveDate" required type="date" />
            <small className="field-error">{getFieldError(state.fieldErrors, "effectiveDate")}</small>
          </label>

          <label className="form-field">
            <span>Due date</span>
            <input className="form-input" name="dueDate" type="date" />
            <small className="field-error">{getFieldError(state.fieldErrors, "dueDate")}</small>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>Payment method</span>
            <input className="form-input" name="paymentMethod" placeholder="cash, check, card, ACH" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "paymentMethod")}</small>
          </label>

          <label className="form-field">
            <span>Reference</span>
            <input className="form-input" name="reference" placeholder="check #, receipt #, note" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "reference")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Notes</span>
          <textarea className="form-textarea" name="notes" rows={3} />
          <small className="field-error">{getFieldError(state.fieldErrors, "notes")}</small>
        </label>

        <div className="form-actions">
          <div className="form-feedback">
            {state.message ? (
              <p className={state.status === "error" ? "form-message form-message--error" : "form-message"}>
                {state.message}
              </p>
            ) : null}
          </div>
          <FormSubmitButton idleLabel="Post entry" pendingLabel="Posting..." />
        </div>
      </form>
    </article>
  );
}
