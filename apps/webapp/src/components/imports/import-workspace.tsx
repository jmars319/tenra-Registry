"use client";

import { useActionState } from "react";
import {
  dryRunImportAction,
  executeImportAction,
  type ImportActionState
} from "../../../app/imports/actions";
import type { ImportDatasetKey } from "../../server/import-processor";
import type { RegistryImportSpec } from "../../server/import-specs";
import { FormSubmitButton } from "../forms/form-submit-button";

interface ImportWorkspaceProps {
  specs: RegistryImportSpec[];
}

const initialState: ImportActionState = {
  status: "idle"
};

function getDatasetKey(key: string): ImportDatasetKey {
  return key as ImportDatasetKey;
}

export function ImportWorkspace({ specs }: ImportWorkspaceProps) {
  const [dryRunState, dryRunFormAction] = useActionState(dryRunImportAction, initialState);
  const [executeState, executeFormAction] = useActionState(executeImportAction, initialState);
  const activeState = executeState.status !== "idle" ? executeState : dryRunState;
  const payloads = dryRunState.payloads;
  const canImport = dryRunState.status === "preview" && dryRunState.preview?.ready && payloads;

  return (
    <div className="import-workspace">
      <article className="panel-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dry Run</p>
            <h2>Validate import files</h2>
          </div>
        </div>

        <form action={dryRunFormAction} className="form-stack">
          <div className="field-grid">
            {specs.map((spec) => (
              <label className="form-field" key={spec.key}>
                <span>{spec.title}</span>
                <input accept=".csv,text/csv" className="form-input" name={`${spec.key}File`} type="file" />
              </label>
            ))}
          </div>
          <div className="form-actions">
            <div className="form-feedback">
              {activeState.message ? (
                <p className={activeState.status === "error" ? "form-message form-message--error" : "form-message"}>
                  {activeState.message}
                </p>
              ) : null}
            </div>
            <FormSubmitButton idleLabel="Run dry run" pendingLabel="Checking..." />
          </div>
        </form>
      </article>

      {activeState.preview ? (
        <article className="panel-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Result</p>
              <h2>Import preview</h2>
            </div>
            <span className={activeState.preview.ready ? "pill" : "pill pill--warning"}>
              {activeState.preview.ready ? "Ready" : "Needs fixes"}
            </span>
          </div>

          {activeState.preview.datasets.length > 0 ? (
            <div className="document-template-grid">
              {activeState.preview.datasets.map((dataset) => (
                <article className="document-template-card" key={dataset.key}>
                  <h3>{dataset.title}</h3>
                  <p>{dataset.rowCount} rows</p>
                  <span className="tag">{dataset.createCount} create</span>
                </article>
              ))}
            </div>
          ) : null}

          {activeState.preview.issues.length > 0 ? (
            <div className="import-issue-list">
              {activeState.preview.issues.map((issue, index) => (
                <div className="activity-item" key={`${issue.dataset}-${issue.row ?? "file"}-${issue.field ?? "general"}-${index}`}>
                  <div className="activity-item__heading">
                    <strong>{issue.dataset}</strong>
                    {issue.row ? <span className="tag">Row {issue.row}</span> : null}
                  </div>
                  <p>{issue.message}</p>
                  {issue.field ? <p className="activity-item__meta">{issue.field}</p> : null}
                </div>
              ))}
            </div>
          ) : null}

          {canImport ? (
            <form action={executeFormAction} className="form-stack import-commit-form">
              {Object.entries(payloads).map(([dataset, text]) => (
                <textarea
                  hidden
                  key={dataset}
                  name={`${getDatasetKey(dataset)}Csv`}
                  readOnly
                  value={text}
                />
              ))}
              <div className="form-actions">
                <p className="form-message">This creates records and writes an import batch audit trail.</p>
                <FormSubmitButton idleLabel="Import records" pendingLabel="Importing..." />
              </div>
            </form>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
