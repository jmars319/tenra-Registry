"use server";

import type { CreateReceivableEntryRequest } from "@registry/api-contracts";
import {
  getAssignmentRoute,
  getCustomerRoute,
  registryWebRoutes
} from "@registry/config";
import { createReceivableEntrySchema } from "@registry/validation";
import { revalidatePath } from "next/cache";
import {
  createReceivableEntry,
  getDefaultOrganization
} from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getCurrencyCentsFromDollars,
  getOptionalFormValue,
  getRequiredFormValue,
  type FormActionState
} from "../../src/server/form-state";

export async function createReceivableEntryAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateReceivableEntryRequest = {
    organizationId: organization.id,
    customerId: getRequiredFormValue(formData, "customerId"),
    assignmentId: getOptionalFormValue(formData, "assignmentId"),
    type: getRequiredFormValue(formData, "type") as CreateReceivableEntryRequest["type"],
    description: getRequiredFormValue(formData, "description"),
    effectiveDate: getRequiredFormValue(formData, "effectiveDate"),
    dueDate: getOptionalFormValue(formData, "dueDate"),
    amountInCents: getCurrencyCentsFromDollars(formData, "amountDollars"),
    paymentMethod: getOptionalFormValue(formData, "paymentMethod"),
    reference: getOptionalFormValue(formData, "reference"),
    notes: getOptionalFormValue(formData, "notes")
  };

  const result = createReceivableEntrySchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Receivable entry details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    const entry = await createReceivableEntry(result.data);

    revalidatePath(registryWebRoutes.dashboard);
    revalidatePath(registryWebRoutes.customers);
    revalidatePath(getCustomerRoute(entry.customerId));
    revalidatePath(registryWebRoutes.receivables);
    revalidatePath(registryWebRoutes.reports);

    if (entry.assignmentId) {
      revalidatePath(getAssignmentRoute(entry.assignmentId));
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Receivable entry could not be created."
    };
  }

  return {
    status: "success",
    message: "Receivable entry posted."
  };
}
