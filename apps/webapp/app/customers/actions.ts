"use server";

import type { CreateCustomerRequest } from "@registry/api-contracts";
import { registryWebRoutes } from "@registry/config";
import { createCustomerSchema } from "@registry/validation";
import { revalidatePath } from "next/cache";
import { createCustomer, getDefaultOrganization } from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getOptionalFormValue,
  getRequiredFormValue,
  type FormActionState
} from "../../src/server/form-state";

export async function createCustomerAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateCustomerRequest = {
    organizationId: organization.id,
    name: getRequiredFormValue(formData, "name"),
    companyName: getOptionalFormValue(formData, "companyName"),
    email: getOptionalFormValue(formData, "email"),
    phone: getOptionalFormValue(formData, "phone"),
    billingStreet1: getOptionalFormValue(formData, "billingStreet1"),
    billingStreet2: getOptionalFormValue(formData, "billingStreet2"),
    billingCity: getOptionalFormValue(formData, "billingCity"),
    billingState: getOptionalFormValue(formData, "billingState"),
    billingPostalCode: getOptionalFormValue(formData, "billingPostalCode"),
    billingCountry: getOptionalFormValue(formData, "billingCountry") ?? "US",
    notes: getOptionalFormValue(formData, "notes")
  };

  const result = createCustomerSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Customer details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    await createCustomer(result.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Customer could not be created."
    };
  }

  revalidatePath(registryWebRoutes.dashboard);
  revalidatePath(registryWebRoutes.customers);
  revalidatePath(registryWebRoutes.assignments);
  revalidatePath(registryWebRoutes.receivables);
  revalidatePath(registryWebRoutes.reports);

  return {
    status: "success",
    message: "Customer created."
  };
}
