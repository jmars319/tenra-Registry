"use server";

import { registryWebRoutes } from "@registry/config";
import { revalidatePath } from "next/cache";
import {
  dryRunRegistryImport,
  executeRegistryImport,
  rollbackImportBatch,
  type ImportDatasetKey,
  type ImportDryRunResult,
  type ImportPayloads
} from "../../src/server/import-processor";

export interface ImportActionState {
  status: "idle" | "preview" | "success" | "error";
  message?: string | undefined;
  preview?: ImportDryRunResult | undefined;
  payloads?: ImportPayloads | undefined;
  importBatchId?: string | undefined;
}

const datasetKeys = ["customers", "units", "rentals", "opening-balances", "payment-history"] as const satisfies readonly ImportDatasetKey[];

async function readFileText(formData: FormData, dataset: ImportDatasetKey): Promise<string | undefined> {
  const file = formData.get(`${dataset}File`);

  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  return file.text();
}

function getTextPayload(formData: FormData, dataset: ImportDatasetKey): string | undefined {
  const value = formData.get(`${dataset}Csv`);

  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

async function getPayloadsFromFiles(formData: FormData): Promise<ImportPayloads> {
  const entries = await Promise.all(
    datasetKeys.map(async (dataset) => [dataset, await readFileText(formData, dataset)] as const)
  );

  return Object.fromEntries(entries.filter((entry): entry is [ImportDatasetKey, string] => Boolean(entry[1])));
}

function getPayloadsFromHiddenFields(formData: FormData): ImportPayloads {
  return Object.fromEntries(
    datasetKeys
      .map((dataset) => [dataset, getTextPayload(formData, dataset)] as const)
      .filter((entry): entry is [ImportDatasetKey, string] => Boolean(entry[1]))
  );
}

export async function dryRunImportAction(
  _previousState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const payloads = await getPayloadsFromFiles(formData);
  const preview = await dryRunRegistryImport(payloads);

  return {
    status: preview.ready ? "preview" : "error",
    message: preview.ready
      ? "Dry run passed. Review the counts before importing."
      : "Dry run found issues to fix before importing.",
    preview,
    payloads
  };
}

export async function executeImportAction(
  _previousState: ImportActionState,
  formData: FormData
): Promise<ImportActionState> {
  const payloads = getPayloadsFromHiddenFields(formData);

  try {
    const batch = await executeRegistryImport(payloads);
    revalidatePath(registryWebRoutes.dashboard);
    revalidatePath(registryWebRoutes.customers);
    revalidatePath(registryWebRoutes.assets);
    revalidatePath(registryWebRoutes.assignments);
    revalidatePath(registryWebRoutes.receivables);
    revalidatePath(registryWebRoutes.imports);
    revalidatePath(registryWebRoutes.reports);

    return {
      status: "success",
      message: `Import completed with ${batch.recordCount} traced records.`,
      importBatchId: batch.id
    };
  } catch (error) {
    const preview = await dryRunRegistryImport(payloads);

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Import could not be completed.",
      preview,
      payloads
    };
  }
}

export async function rollbackImportBatchAction(formData: FormData): Promise<void> {
  const batchId = formData.get("batchId");

  if (typeof batchId !== "string" || batchId.trim().length === 0) {
    throw new Error("Import batch is required.");
  }

  await rollbackImportBatch(batchId);
  revalidatePath(registryWebRoutes.dashboard);
  revalidatePath(registryWebRoutes.customers);
  revalidatePath(registryWebRoutes.assets);
  revalidatePath(registryWebRoutes.assignments);
  revalidatePath(registryWebRoutes.receivables);
  revalidatePath(registryWebRoutes.imports);
  revalidatePath(registryWebRoutes.reports);
}
