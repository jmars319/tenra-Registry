"use client";

import type { AssetStatus, AssignmentStatus, AssignmentTransitionTarget } from "@registry/domain";
import { getAllowedAssignmentTransitions } from "@registry/domain";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { transitionAssignmentStatusAction } from "../../../app/assignments/actions";
import { initialFormActionState } from "../../server/form-state";

interface AssignmentLifecyclePanelProps {
  assignmentId: string;
  assignmentStatus: AssignmentStatus;
  assetStatus: AssetStatus;
}

const actionLabels: Record<AssignmentTransitionTarget, string> = {
  active: "Activate rental",
  completed: "Complete rental",
  cancelled: "Cancel rental"
};

const actionDescriptions: Record<AssignmentTransitionTarget, string> = {
  active: "Marks the rental active and occupies the container unit.",
  completed: "Closes the active rental and releases the unit when appropriate.",
  cancelled: "Stops the rental and releases the unit if it was active."
};

const actionButtonClasses: Record<AssignmentTransitionTarget, string> = {
  active: "button-primary",
  completed: "button-secondary",
  cancelled: "button-secondary button-secondary--warning"
};

function getActivationBlockedMessage(assetStatus: AssetStatus): string | null {
  switch (assetStatus) {
    case "available":
      return null;
    case "assigned":
      return "Activation is blocked because the unit is already rented.";
    case "maintenance":
      return "Activation is blocked because the unit is in maintenance.";
    case "archived":
      return "Activation is blocked because the unit is archived.";
    default:
      return "Activation is currently blocked for this asset.";
  }
}

interface LifecycleActionButtonProps {
  action: AssignmentTransitionTarget;
  disabled?: boolean;
}

function LifecycleActionButton({ action, disabled = false }: LifecycleActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={actionButtonClasses[action]}
      disabled={disabled || pending}
      name="nextStatus"
      type="submit"
      value={action}
    >
      {actionLabels[action]}
    </button>
  );
}

export function AssignmentLifecyclePanel({
  assignmentId,
  assignmentStatus,
  assetStatus
}: AssignmentLifecyclePanelProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(transitionAssignmentStatusAction, initialFormActionState);
  const availableActions = getAllowedAssignmentTransitions(assignmentStatus);
  const activationBlockedMessage = assignmentStatus === "draft" ? getActivationBlockedMessage(assetStatus) : null;

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <article className="panel-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Lifecycle</p>
          <h2>Rental actions</h2>
        </div>
      </div>

      {availableActions.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <h3>No actions available</h3>
          <p>This rental is closed and cannot be changed further in the current workflow.</p>
        </div>
      ) : (
        <form action={formAction} className="form-stack">
          <input name="assignmentId" type="hidden" value={assignmentId} />

          <div className="lifecycle-action-list">
            {availableActions.map((action) => {
              const isBlocked = action === "active" && activationBlockedMessage !== null;

              return (
                <div className="lifecycle-action" key={action}>
                  <div>
                    <strong>{actionLabels[action]}</strong>
                    <p className="table-subcopy">{actionDescriptions[action]}</p>
                  </div>

                  <LifecycleActionButton action={action} disabled={isBlocked} />
                </div>
              );
            })}
          </div>

          <div className="form-feedback">
            {activationBlockedMessage ? (
              <p className="form-message form-message--error">{activationBlockedMessage}</p>
            ) : null}
            {state.message ? (
              <p className={state.status === "error" ? "form-message form-message--error" : "form-message"}>
                {state.message}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </article>
  );
}
