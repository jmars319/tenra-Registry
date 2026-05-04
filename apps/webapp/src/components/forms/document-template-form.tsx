"use client";

import { documentTemplateTypes, getDocumentTemplateTypeLabel } from "@registry/domain";
import { useActionState, useEffect, useRef } from "react";
import { createDocumentTemplateAction } from "../../../app/documents/actions";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

export function DocumentTemplateForm() {
  const [state, formAction] = useActionState(createDocumentTemplateAction, initialFormActionState);
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
          <p className="eyebrow">Create Template</p>
          <h2>Custom document wording</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <div className="field-grid">
          <label className="form-field">
            <span>Template type</span>
            <select className="form-select" defaultValue="rental-agreement" name="type">
              {documentTemplateTypes.map((type) => (
                <option key={type} value={type}>
                  {getDocumentTemplateTypeLabel(type)}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "type")}</small>
          </label>

          <label className="form-field">
            <span>Name</span>
            <input className="form-input" name="name" placeholder="Standard container rental agreement" required type="text" />
            <small className="field-error">{getFieldError(state.fieldErrors, "name")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Email subject</span>
          <input className="form-input" name="subject" placeholder="Your container rental documents" type="text" />
          <small className="field-error">{getFieldError(state.fieldErrors, "subject")}</small>
        </label>

        <label className="form-field">
          <span>Merge fields</span>
          <input
            className="form-input"
            defaultValue="customer.name, unit.assetCode, rental.siteAddress, balance.amount"
            name="mergeFields"
            type="text"
          />
          <small className="field-error">{getFieldError(state.fieldErrors, "mergeFields")}</small>
        </label>

        <label className="form-field">
          <span>Body</span>
          <textarea
            className="form-textarea"
            name="body"
            placeholder="Use merge fields like {{customer.name}} and {{unit.assetCode}}."
            required
            rows={8}
          />
          <small className="field-error">{getFieldError(state.fieldErrors, "body")}</small>
        </label>

        <div className="checkbox-row">
          <label>
            <input defaultChecked name="printEnabled" type="checkbox" /> Print-ready
          </label>
          <label>
            <input defaultChecked name="emailEnabled" type="checkbox" /> Email-ready
          </label>
        </div>

        <div className="form-actions">
          <div className="form-feedback">
            {state.message ? (
              <p className={state.status === "error" ? "form-message form-message--error" : "form-message"}>
                {state.message}
              </p>
            ) : null}
          </div>
          <FormSubmitButton idleLabel="Create template" pendingLabel="Creating..." />
        </div>
      </form>
    </article>
  );
}
