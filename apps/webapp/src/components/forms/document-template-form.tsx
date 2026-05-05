"use client";

import {
  documentTemplateTypes,
  getDocumentTemplateTypeLabel,
  type DocumentTemplateType
} from "@registry/domain";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createDocumentTemplateAction } from "../../../app/documents/actions";
import { initialFormActionState } from "../../server/form-state";
import { FormSubmitButton } from "./form-submit-button";

interface TemplatePreset {
  id: string;
  label: string;
  type: DocumentTemplateType;
  name: string;
  subject: string;
  mergeFields: string;
  body: string;
}

const defaultTemplatePreset: TemplatePreset = {
    id: "rental-agreement",
    label: "Container rental agreement",
    type: "rental-agreement",
    name: "Standard container rental agreement",
    subject: "Container rental agreement for {{customer.name}}",
    mergeFields:
      "organization.name, customer.name, customer.phone, unit.assetCode, unit.size, rental.startDate, rental.rate, rental.siteAddress, rental.placementNotes",
    body:
      "{{organization.name}}\n\nRental agreement\n\nCustomer: {{customer.name}}\nPhone: {{customer.phone}}\nUnit: {{unit.assetCode}} {{unit.size}}\nStart date: {{rental.startDate}}\nRate: {{rental.rate}}\nRental site:\n{{rental.siteAddress}}\n\nPlacement notes:\n{{rental.placementNotes}}\n\nThe customer agrees to rent the listed portable storage container at the stated rate. The customer is responsible for access to the site, ordinary care of the unit while rented, and payment of posted charges. Any special terms can be added here before printing or emailing.\n\nCustomer signature: ______________________________\nDate: ____________________"
  };

const templatePresets: TemplatePreset[] = [
  defaultTemplatePreset,
  {
    id: "delivery-ticket",
    label: "Delivery ticket",
    type: "delivery-ticket",
    name: "Container delivery ticket",
    subject: "Delivery ticket for {{unit.assetCode}}",
    mergeFields: "customer.name, unit.assetCode, unit.size, rental.siteAddress, rental.placementNotes",
    body:
      "Delivery ticket\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}} {{unit.size}}\nDelivery site:\n{{rental.siteAddress}}\n\nPlacement notes:\n{{rental.placementNotes}}\n\nDriver notes:\n\nDelivered by: ______________________________\nCustomer signature: ______________________________\nDate: ____________________"
  },
  {
    id: "pickup-ticket",
    label: "Pickup ticket",
    type: "pickup-ticket",
    name: "Container pickup ticket",
    subject: "Pickup ticket for {{unit.assetCode}}",
    mergeFields: "customer.name, unit.assetCode, rental.siteAddress, rental.placementNotes",
    body:
      "Pickup ticket\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nPickup site:\n{{rental.siteAddress}}\n\nSite and access notes:\n{{rental.placementNotes}}\n\nCondition at pickup:\n\nDriver notes:\n\nPicked up by: ______________________________\nDate: ____________________"
  },
  {
    id: "condition-report",
    label: "Condition report",
    type: "condition-report",
    name: "Container condition report",
    subject: "Condition report for {{unit.assetCode}}",
    mergeFields: "customer.name, unit.assetCode, unit.condition, rental.siteAddress",
    body:
      "Condition report\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nRecorded condition: {{unit.condition}}\nLocation:\n{{rental.siteAddress}}\n\nExterior condition:\n\nInterior condition:\n\nDoor and lock condition:\n\nPhotos attached: Yes / No\n\nReviewed by: ______________________________\nDate: ____________________"
  },
  {
    id: "past-due-notice",
    label: "Past-due notice",
    type: "past-due-notice",
    name: "Past-due balance notice",
    subject: "Past-due balance for {{customer.name}}",
    mergeFields: "organization.name, customer.name, balance.amount, balance.pastDue, unit.assetCode",
    body:
      "{{organization.name}}\n\nPast-due balance notice\n\nCustomer: {{customer.name}}\nUnit: {{unit.assetCode}}\nCurrent balance: {{balance.amount}}\nPast due: {{balance.pastDue}}\n\nPlease contact the office to bring the account current or confirm payment arrangements.\n\nOffice notes:\n\nThank you."
  },
  {
    id: "deposit-receipt",
    label: "Deposit receipt",
    type: "deposit-receipt",
    name: "Deposit receipt",
    subject: "Deposit receipt from {{organization.name}}",
    mergeFields: "organization.name, customer.name, payment.amount, payment.reference, balance.amount",
    body:
      "{{organization.name}}\n\nDeposit receipt\n\nReceived from: {{customer.name}}\nAmount: {{payment.amount}}\nReference: {{payment.reference}}\nRemaining balance: {{balance.amount}}\n\nReceived by: ______________________________\nDate: ____________________"
  },
  {
    id: "general-letter",
    label: "General customer letter",
    type: "general-letter",
    name: "Customer letter",
    subject: "Message from {{organization.name}}",
    mergeFields: "organization.name, customer.name, customer.companyName, unit.assetCode, balance.amount",
    body:
      "{{organization.name}}\n\nTo: {{customer.name}}\n{{customer.companyName}}\n\nRe: {{unit.assetCode}}\n\nWrite the office message here.\n\nCurrent balance: {{balance.amount}}\n\nThank you."
  }
];

function getFieldError(fieldErrors: Record<string, string> | undefined, field: string): string | undefined {
  return fieldErrors?.[field];
}

function getPreset(id: string): TemplatePreset {
  return templatePresets.find((preset) => preset.id === id) ?? defaultTemplatePreset;
}

export function DocumentTemplateForm() {
  const [state, formAction] = useActionState(createDocumentTemplateAction, initialFormActionState);
  const formRef = useRef<HTMLFormElement>(null);
  const [presetId, setPresetId] = useState(defaultTemplatePreset.id);
  const preset = useMemo(() => getPreset(presetId), [presetId]);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setPresetId(defaultTemplatePreset.id);
    }
  }, [state.status]);

  return (
    <article className="panel-card">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">Create Template</p>
          <h2>Save reusable wording</h2>
        </div>
      </div>

      <form action={formAction} className="form-stack" ref={formRef}>
        <label className="form-field">
          <span>Start with</span>
          <select
            className="form-select"
            onChange={(event) => setPresetId(event.target.value)}
            value={presetId}
          >
            {templatePresets.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="field-grid">
          <label className="form-field">
            <span>Kind of paperwork</span>
            <select className="form-select" key={preset.id} defaultValue={preset.type} name="type">
              {documentTemplateTypes.map((type) => (
                <option key={type} value={type}>
                  {getDocumentTemplateTypeLabel(type)}
                </option>
              ))}
            </select>
            <small className="field-error">{getFieldError(state.fieldErrors, "type")}</small>
          </label>

          <label className="form-field">
            <span>Template name</span>
            <input
              className="form-input"
              defaultValue={preset.name}
              key={`${preset.id}-name`}
              name="name"
              required
              type="text"
            />
            <small className="field-error">{getFieldError(state.fieldErrors, "name")}</small>
          </label>
        </div>

        <label className="form-field">
          <span>Email subject line</span>
          <input
            className="form-input"
            defaultValue={preset.subject}
            key={`${preset.id}-subject`}
            name="subject"
            type="text"
          />
          <small className="field-error">{getFieldError(state.fieldErrors, "subject")}</small>
        </label>

        <label className="form-field">
          <span>Available fields</span>
          <input
            className="form-input"
            defaultValue={preset.mergeFields}
            key={`${preset.id}-merge-fields`}
            name="mergeFields"
            type="text"
          />
          <small className="field-error">{getFieldError(state.fieldErrors, "mergeFields")}</small>
        </label>

        <label className="form-field">
          <span>Document wording</span>
          <textarea
            className="form-textarea"
            defaultValue={preset.body}
            key={`${preset.id}-body`}
            name="body"
            required
            rows={14}
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
