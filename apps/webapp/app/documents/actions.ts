"use server";

import type {
  CreateDocumentTemplateRequest,
  CreateGeneratedDocumentRequest
} from "@registry/api-contracts";
import { registryWebRoutes } from "@registry/config";
import {
  createDocumentTemplateSchema,
  createGeneratedDocumentSchema
} from "@registry/validation";
import { revalidatePath } from "next/cache";
import {
  createDocumentTemplate,
  createGeneratedDocument,
  getDefaultOrganization
} from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getOptionalFormValue,
  getRequiredFormValue,
  type FormActionState
} from "../../src/server/form-state";

function getBooleanFormValue(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function getMergeFields(formData: FormData): string[] {
  return getRequiredFormValue(formData, "mergeFields")
    .split(",")
    .map((field) => field.trim())
    .filter((field) => field.length > 0);
}

export async function createDocumentTemplateAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateDocumentTemplateRequest = {
    organizationId: organization.id,
    type: getRequiredFormValue(formData, "type") as CreateDocumentTemplateRequest["type"],
    name: getRequiredFormValue(formData, "name"),
    subject: getOptionalFormValue(formData, "subject"),
    body: getRequiredFormValue(formData, "body"),
    mergeFields: getMergeFields(formData),
    printEnabled: getBooleanFormValue(formData, "printEnabled"),
    emailEnabled: getBooleanFormValue(formData, "emailEnabled")
  };

  const result = createDocumentTemplateSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Document template details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    await createDocumentTemplate(result.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Document template could not be created."
    };
  }

  revalidatePath(registryWebRoutes.documents);

  return {
    status: "success",
    message: "Document template created."
  };
}

export async function createGeneratedDocumentAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateGeneratedDocumentRequest = {
    organizationId: organization.id,
    templateId: getRequiredFormValue(formData, "templateId"),
    customerId: getOptionalFormValue(formData, "customerId"),
    assignmentId: getOptionalFormValue(formData, "assignmentId"),
    title: getOptionalFormValue(formData, "title")
  };

  const result = createGeneratedDocumentSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Choose a document and who it is for.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    await createGeneratedDocument(result.data);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Document could not be created."
    };
  }

  revalidatePath(registryWebRoutes.documents);

  return {
    status: "success",
    message: "Document created."
  };
}
