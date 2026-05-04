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
          <p className="eyebrow">Create Rental</p>
          <h2>Rent a container to a customer</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <p className="table-subcopy">Activating a rental requires the selected container to be currently available.</p>

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
            <span>Container unit</span>
            <select className="form-select" name="assetId" required>
              <option value="">Select a unit</option>
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
            <span>Rental status</span>
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

        <div className="field-grid">
          <label className="form-field">
            <span>Customer site name</span>
            <input className="form-input" name="siteName" placeholder="Main job site" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "siteName")}</small>
          </label>

          <label className="form-field">
            <span>Delivery scheduled</span>
            <input className="form-input" name="deliveryScheduledFor" type="date" />
            <small className="field-error">{getFieldError(state.fieldErrors, "deliveryScheduledFor")}</small>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>Site street 1</span>
            <input className="form-input" name="siteStreet1" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "siteStreet1")}</small>
          </label>

          <label className="form-field">
            <span>Site street 2</span>
            <input className="form-input" name="siteStreet2" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "siteStreet2")}</small>
          </label>
        </div>

        <div className="field-grid field-grid--thirds">
          <label className="form-field">
            <span>Site city</span>
            <input className="form-input" name="siteCity" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "siteCity")}</small>
          </label>

          <label className="form-field">
            <span>Site state</span>
            <input className="form-input" name="siteState" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "siteState")}</small>
          </label>

          <label className="form-field">
            <span>Site postal code</span>
            <input className="form-input" name="sitePostalCode" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "sitePostalCode")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Placement notes</span>
          <textarea className="form-textarea" name="placementNotes" placeholder="Gate code, drop location, access notes" rows={3} />
          <small className="field-error">{getFieldError(state.fieldErrors, "placementNotes")}</small>
        </label>

        <label className="form-field">
          <span>Internal notes</span>
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
          <FormSubmitButton idleLabel="Create rental" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
