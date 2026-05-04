"use client";

import { assetCategories } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import { createAssetAction } from "../../../app/assets/actions";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

export function AssetCreateForm() {
  const [state, formAction] = useActionState(createAssetAction, initialFormActionState);
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
          <p className="eyebrow">Create Unit</p>
          <h2>New container unit</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <div className="field-grid">
          <label className="form-field">
            <span>Asset code</span>
            <input className="form-input" name="assetCode" placeholder="CTR-3001" required type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "assetCode")}</small>
          </label>

          <label className="form-field">
            <span>Name</span>
            <input className="form-input" name="name" placeholder="20 ft storage container" required type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "name")}</small>
          </label>
        </div>

        <div className="field-grid">
          <label className="form-field">
            <span>Category</span>
            <select className="form-select" defaultValue="unit" name="category">
              {assetCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "category")}</small>
          </label>

          <label className="form-field">
            <span>Current location</span>
            <input className="form-input" name="currentLocation" placeholder="Yard A or customer site" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "currentLocation")}</small>
          </label>
        </div>

        <div className="field-grid field-grid--thirds">
          <label className="form-field">
            <span>Size</span>
            <input className="form-input" name="sizeLabel" placeholder="20 ft" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "sizeLabel")}</small>
          </label>

          <label className="form-field">
            <span>Unit type</span>
            <input className="form-input" name="unitType" placeholder="standard, high cube" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "unitType")}</small>
          </label>

          <label className="form-field">
            <span>Condition</span>
            <input className="form-input" name="condition" placeholder="rent-ready" type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "condition")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Home yard location</span>
          <input className="form-input" name="homeLocation" placeholder="North yard row 2" type="text" />
          <small className="field-error">{getFieldError(state.fieldErrors, "homeLocation")}</small>
        </label>

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
          <FormSubmitButton idleLabel="Create unit" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
