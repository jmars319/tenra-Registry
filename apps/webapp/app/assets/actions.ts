"use server";

import type { CreateAssetRequest } from "@registry/api-contracts";
import { registryWebRoutes } from "@registry/config";
import { createAssetSchema } from "@registry/validation";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { createAsset, getDefaultOrganization } from "../../src/server/registry-data";
import {
  flattenFieldErrors,
  getOptionalFormValue,
  getRequiredFormValue,
  type FormActionState
} from "../../src/server/form-state";

export async function createAssetAction(
  _previousState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const organization = await getDefaultOrganization();

  const payload: CreateAssetRequest = {
    organizationId: organization.id,
    assetCode: getRequiredFormValue(formData, "assetCode"),
    name: getRequiredFormValue(formData, "name"),
    category: getRequiredFormValue(formData, "category") as CreateAssetRequest["category"],
    currentLocation: getOptionalFormValue(formData, "currentLocation"),
    homeLocation: getOptionalFormValue(formData, "homeLocation"),
    sizeLabel: getOptionalFormValue(formData, "sizeLabel"),
    unitType: getOptionalFormValue(formData, "unitType"),
    condition: getOptionalFormValue(formData, "condition"),
    notes: getOptionalFormValue(formData, "notes")
  };

  const result = createAssetSchema.safeParse(payload);

  if (!result.success) {
    return {
      status: "error",
      message: "Unit details need attention.",
      fieldErrors: flattenFieldErrors(result.error.flatten().fieldErrors)
    };
  }

  try {
    await createAsset(result.data);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: "That unit code already exists.",
        fieldErrors: {
          assetCode: "Use a unique unit code within the organization."
        }
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unit could not be created."
    };
  }

  revalidatePath(registryWebRoutes.dashboard);
  revalidatePath(registryWebRoutes.assets);
  revalidatePath(registryWebRoutes.assignments);
  revalidatePath(registryWebRoutes.reports);

  return {
    status: "success",
    message: "Unit created."
  };
}
