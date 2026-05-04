"use server";

import type { PostRentRunRequest } from "@registry/api-contracts";
import { getAssignmentRoute, getCustomerRoute, registryWebRoutes } from "@registry/config";
import { postRentRunSchema } from "@registry/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getDefaultOrganization,
  postRentRun
} from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getIntegerFormValue,
  getRequiredFormValue
} from "../../src/server/form-state";

function getAssignmentIds(formData: FormData): string[] {
  return formData
    .getAll("assignmentId")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());
}

export async function postRentRunAction(formData: FormData): Promise<void> {
  const organization = await getDefaultOrganization();
  const period = getRequiredFormValue(formData, "period");
  const dueDate = getRequiredFormValue(formData, "dueDate");
  const payload: PostRentRunRequest = {
    organizationId: organization.id,
    period,
    dueDate,
    billingDay: getIntegerFormValue(formData, "billingDay"),
    assignmentIds: getAssignmentIds(formData)
  };
  const result = postRentRunSchema.safeParse(payload);

  if (!result.success) {
    const fieldErrors = flattenFieldErrors(result.error.flatten().fieldErrors);
    const message = encodeURIComponent(Object.values(fieldErrors ?? {})[0] ?? "Rent run details need attention.");
    redirect(`${registryWebRoutes.rentRun}?period=${period}&dueDate=${dueDate}&billingDay=${payload.billingDay}&error=${message}`);
  }

  let postedCount = 0;
  let skippedCount = 0;

  try {
    const postResult = await postRentRun(result.data);
    postedCount = postResult.postedCount;
    skippedCount = postResult.skippedCount;
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "Rent run could not be posted.");
    redirect(`${registryWebRoutes.rentRun}?period=${period}&dueDate=${dueDate}&billingDay=${payload.billingDay}&error=${message}`);
  }

  revalidatePath(registryWebRoutes.dashboard);
  revalidatePath(registryWebRoutes.receivables);
  revalidatePath(registryWebRoutes.rentRun);
  revalidatePath(registryWebRoutes.reports);
  for (const assignmentId of result.data.assignmentIds) {
    revalidatePath(getAssignmentRoute(assignmentId));
  }
  for (const customerId of new Set(formData.getAll("customerId").filter((value): value is string => typeof value === "string"))) {
    revalidatePath(getCustomerRoute(customerId));
  }

  redirect(
    `${registryWebRoutes.rentRun}?period=${period}&dueDate=${dueDate}&billingDay=${payload.billingDay}&posted=${postedCount}&skipped=${skippedCount}`
  );
}
