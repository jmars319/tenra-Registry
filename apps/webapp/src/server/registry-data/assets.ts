import type { CreateAssetRequest } from "@registry/api-contracts";
import { getAssetRoute, getAssignmentRoute } from "@registry/config";
import type { Asset } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeAsset, serializeAssignment, sortAssets, sortAssignments } from "./mappers";
import { normalizeNullableString, normalizeOptionalString } from "./shared";
import type { AssetDetail, AssetListItem } from "./types";

export async function listAssets(): Promise<AssetListItem[]> {
  const organization = await getDefaultOrganization();

  const records = await db.asset.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      assignments: {
        where: {
          status: "ACTIVE"
        },
        select: {
          id: true,
          siteName: true,
          siteCity: true,
          siteState: true,
          customer: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  return sortAssets(
    records.map((record) => ({
      ...serializeAsset(record),
      href: getAssetRoute(record.id),
      activeAssignment: record.assignments[0]
        ? {
            assignmentId: record.assignments[0].id,
            customerName: record.assignments[0].customer.name,
            siteName: normalizeOptionalString(record.assignments[0].siteName),
            siteCity: normalizeOptionalString(record.assignments[0].siteCity),
            siteState: normalizeOptionalString(record.assignments[0].siteState)
          }
        : undefined
    }))
  );
}

export async function getAssetDetail(assetId: string): Promise<AssetDetail | null> {
  const organization = await getDefaultOrganization();

  const asset = await db.asset.findFirst({
    where: {
      id: assetId,
      organizationId: organization.id
    }
  });

  if (!asset) {
    return null;
  }

  const assignments = await db.assignment.findMany({
    where: {
      assetId,
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          name: true
        }
      },
      asset: {
        select: {
          assetCode: true,
          name: true
        }
      }
    }
  });

  return {
    asset: serializeAsset(asset),
    assignments: sortAssignments(
      assignments.map((assignment) => ({
        ...serializeAssignment(assignment),
        href: getAssignmentRoute(assignment.id),
        customerName: assignment.customer.name,
        assetCode: assignment.asset.assetCode,
        assetName: assignment.asset.name
      }))
    )
  };
}

export async function createAsset(input: CreateAssetRequest): Promise<Asset> {
  const asset = await db.asset.create({
    data: {
      organizationId: input.organizationId,
      assetCode: input.assetCode,
      name: input.name,
      category: input.category.toUpperCase() as "UNIT" | "VEHICLE" | "EQUIPMENT" | "OTHER",
      status: "AVAILABLE",
      currentLocation: normalizeNullableString(input.currentLocation),
      homeLocation: normalizeNullableString(input.homeLocation),
      sizeLabel: normalizeNullableString(input.sizeLabel),
      unitType: normalizeNullableString(input.unitType),
      condition: normalizeNullableString(input.condition),
      notes: normalizeNullableString(input.notes)
    }
  });

  return serializeAsset(asset);
}
