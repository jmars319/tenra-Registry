"use server";

import type { CreateAssignmentRequest, TransitionAssignmentStatusRequest } from "@registry/api-contracts";
import {
  getAssetRoute,
  getAssignmentRoute,
  getCustomerRoute,
  registryWebRoutes
} from "@registry/config";
import { createAssignmentSchema, transitionAssignmentStatusSchema } from "@registry/validation";
import { revalidatePath } from "next/cache";
import {
  createAssignment,
  getDefaultOrganization,
  transitionAssignmentStatus
} from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getCurrencyCentsFromDollars,
  getOptionalFormValue,
  getRequiredFormValue,
  type FormActionState
} from "../../src/server/form-state";

export async function createAssignmentAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateAssignmentRequest = {
    organizationId: organization.id,
    customerId: getRequiredFormValue(formData, "customerId"),
    assetId: getRequiredFormValue(formData, "assetId"),
    startDate: getRequiredFormValue(formData, "startDate"),
    endDate: getOptionalFormValue(formData, "endDate"),
    billingCadence: getRequiredFormValue(formData, "billingCadence") as CreateAssignmentRequest["billingCadence"],
    rateInCents: getCurrencyCentsFromDollars(formData, "rateDollars"),
    status: getRequiredFormValue(formData, "status") as CreateAssignmentRequest["status"],
    notes: getOptionalFormValue(formData, "notes")
  };

  const result = createAssignmentSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Assignment details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    await createAssignment(result.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Assignment could not be created."
    };
  }

  revalidatePath(registryWebRoutes.dashboard);
  revalidatePath(registryWebRoutes.customers);
  revalidatePath(registryWebRoutes.assets);
  revalidatePath(registryWebRoutes.assignments);

  return {
    status: "success",
    message: "Assignment created."
  };
}

const transitionSuccessMessages: Record<
  TransitionAssignmentStatusRequest["nextStatus"],
  string
> = {
  active: "Assignment activated.",
  completed: "Assignment completed.",
  cancelled: "Assignment cancelled."
};

export async function transitionAssignmentStatusAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: TransitionAssignmentStatusRequest = {
    organizationId: organization.id,
    assignmentId: getRequiredFormValue(formData, "assignmentId"),
    nextStatus: getRequiredFormValue(formData, "nextStatus") as TransitionAssignmentStatusRequest["nextStatus"]
  };

  const result = transitionAssignmentStatusSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Assignment lifecycle details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    const transitionResult = await transitionAssignmentStatus(result.data);

    revalidatePath(registryWebRoutes.dashboard);
    revalidatePath(registryWebRoutes.customers);
    revalidatePath(getCustomerRoute(transitionResult.customerId));
    revalidatePath(registryWebRoutes.assets);
    revalidatePath(getAssetRoute(transitionResult.asset.id));
    revalidatePath(registryWebRoutes.assignments);
    revalidatePath(getAssignmentRoute(transitionResult.assignment.id));
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Assignment status could not be updated."
    };
  }

  return {
    status: "success",
    message: transitionSuccessMessages[result.data.nextStatus]
  };
}
