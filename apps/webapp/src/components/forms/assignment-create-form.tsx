"use client";

import { assignmentStatuses, billingCadences } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import { createAssignmentAction } from "../../../app/assignments/actions";
import type { AssignmentFormOption } from "../../server/registry-data";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

interface AssignmentCreateFormProps {
  assets: AssignmentFormOption[];
  customers: Array<{
    id: string;
    label: string;
  }>;
}

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

function getTodayDate(): string {
  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() - currentDate.getTimezoneOffset());
  return currentDate.toISOString().slice(0, 10);
}

function getAssetOptionLabel(asset: AssignmentFormOption): string {
  if (asset.status === "available" && !asset.occupiedByActiveAssignment) {
    return asset.label;
  }

  if (asset.status === "assigned" || asset.occupiedByActiveAssignment) {
    return `${asset.label} · assigned`;
  }

  return `${asset.label} · ${asset.status}`;
}

export function AssignmentCreateForm({ assets, customers }: AssignmentCreateFormProps) {
  const [state, formAction] = useActionState(createAssignmentAction, initialFormActionState);
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
          <p className="eyebrow">Create Assignment</p>
          <h2>Link a customer to an asset</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <p className="table-subcopy">Activating an assignment requires the selected asset to be currently available.</p>

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
            <span>Asset</span>
            <select className="form-select" name="assetId" required>
              <option value="">Select an asset</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {getAssetOptionLabel(asset)}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "assetId")}</small>
          </label>
        </div>

        <div className="field-grid field-grid--thirds">
          <label className="form-field">
            <span>Start date</span>
            <input className="form-input" defaultValue={getTodayDate()} name="startDate" required type="date" />
            <small className="field-error">{getFieldError(state.fieldErrors, "startDate")}</small>
          </label>

          <label className="form-field">
            <span>End date</span>
            <input className="form-input" name="endDate" type="date" />
            <small className="field-error">{getFieldError(state.fieldErrors, "endDate")}</small>
          </label>

          <label className="form-field">
            <span>Status</span>
            <select className="form-select" defaultValue="active" name="status">
              {assignmentStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "status")}</small>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>Billing cadence</span>
            <select className="form-select" defaultValue="monthly" name="billingCadence">
              {billingCadences.map((cadence) => (
                <option key={cadence} value={cadence}>
                  {cadence}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "billingCadence")}</small>
          </label>

          <label className="form-field">
            <span>Rate (USD)</span>
            <input className="form-input" min="0" name="rateDollars" placeholder="1850.00" required step="0.01" type="number" />
            <small className="field-error">{getFieldError(state.fieldErrors, "rateInCents")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Notes</span>
          <textarea className="form-textarea" name="notes" rows={4} />
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
          <FormSubmitButton idleLabel="Create assignment" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
