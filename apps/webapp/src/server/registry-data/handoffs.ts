import { REGISTRY_DEFAULT_ORGANIZATION_SLUG } from "@registry/config";
import type { Organization } from "@registry/domain";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { serializeOrganization } from "./mappers";
import { dateToIsoDateTime, normalizeOptionalString } from "./shared";
import type { HandoffAuditSummary } from "./types";

function serializeHandoffAudit(record: {
  id: string;
  exportId: string;
  schema: string;
  targetApp: string;
  subjectId: string | null;
  rowCount: number;
  payloadSummary: Prisma.JsonValue;
  downloadCount: number;
  lastDeliveryStatus: string;
  lastDeliveryMessage: string | null;
  lastDeliveryUpdatedAt: Date | null;
  firstExportedAt: Date;
  lastExportedAt: Date;
}): HandoffAuditSummary {
  return {
    id: record.id,
    exportId: record.exportId,
    schema: record.schema,
    targetApp: record.targetApp,
    subjectId: normalizeOptionalString(record.subjectId),
    rowCount: record.rowCount,
    payloadSummary: record.payloadSummary,
    downloadCount: record.downloadCount,
    lastDeliveryStatus: record.lastDeliveryStatus,
    lastDeliveryMessage: normalizeOptionalString(record.lastDeliveryMessage),
    lastDeliveryUpdatedAt: record.lastDeliveryUpdatedAt ? dateToIsoDateTime(record.lastDeliveryUpdatedAt) : undefined,
    firstExportedAt: dateToIsoDateTime(record.firstExportedAt),
    lastExportedAt: dateToIsoDateTime(record.lastExportedAt)
  };
}

export async function getDefaultOrganization(): Promise<Organization> {
  const organization =
    (await db.organization.findUnique({
      where: {
        slug: REGISTRY_DEFAULT_ORGANIZATION_SLUG
      }
    })) ??
    (await db.organization.findFirst({
      orderBy: {
        createdAt: "asc"
      }
    }));

  if (!organization) {
    throw new Error("No organization found. Run the webapp seed step before using Registry by Tenra.");
  }

  return serializeOrganization(organization);
}

export async function recordHandoffAudit(input: {
  organizationId: string;
  exportId: string;
  schema: string;
  targetApp: "ledger" | "assembly";
  subjectId?: string | undefined;
  rowCount: number;
  payloadSummary: Prisma.InputJsonValue;
}): Promise<HandoffAuditSummary> {
  const record = await db.handoffAudit.upsert({
    where: {
      organizationId_exportId: {
        organizationId: input.organizationId,
        exportId: input.exportId
      }
    },
    create: {
      organizationId: input.organizationId,
      exportId: input.exportId,
      schema: input.schema,
      targetApp: input.targetApp,
      subjectId: input.subjectId ?? null,
      rowCount: input.rowCount,
      payloadSummary: input.payloadSummary,
      lastDeliveryStatus: "downloaded",
      lastDeliveryUpdatedAt: new Date()
    },
    update: {
      schema: input.schema,
      targetApp: input.targetApp,
      subjectId: input.subjectId ?? null,
      rowCount: input.rowCount,
      payloadSummary: input.payloadSummary,
      lastDeliveryStatus: "downloaded",
      lastDeliveryMessage: null,
      lastDeliveryUpdatedAt: new Date(),
      downloadCount: {
        increment: 1
      }
    }
  });

  return serializeHandoffAudit(record);
}

export async function updateHandoffDeliveryStatus(input: {
  exportId: string;
  status: "downloaded" | "sent" | "received" | "failed";
  message?: string | undefined;
}): Promise<HandoffAuditSummary | null> {
  const organization = await getDefaultOrganization();
  const existing = await db.handoffAudit.findUnique({
    where: {
      organizationId_exportId: {
        organizationId: organization.id,
        exportId: input.exportId
      }
    }
  });

  if (!existing) {
    return null;
  }

  const record = await db.handoffAudit.update({
    where: {
      organizationId_exportId: {
        organizationId: organization.id,
        exportId: input.exportId
      }
    },
    data: {
      lastDeliveryStatus: input.status,
      lastDeliveryMessage: input.message ?? null,
      lastDeliveryUpdatedAt: new Date()
    }
  });

  return serializeHandoffAudit(record);
}

export async function getHandoffAuditByExportId(exportId: string): Promise<HandoffAuditSummary | null> {
  const organization = await getDefaultOrganization();
  const record = await db.handoffAudit.findUnique({
    where: {
      organizationId_exportId: {
        organizationId: organization.id,
        exportId
      }
    }
  });

  return record ? serializeHandoffAudit(record) : null;
}

export async function listHandoffReplayAudits(exportId: string): Promise<HandoffAuditSummary[]> {
  const organization = await getDefaultOrganization();
  const records = await db.handoffAudit.findMany({
    where: {
      organizationId: organization.id,
      exportId: {
        startsWith: `${exportId}:replay:`
      }
    },
    orderBy: {
      lastExportedAt: "desc"
    },
    take: 25
  });

  return records.map(serializeHandoffAudit);
}

export async function listHandoffAudits(filters: {
  targetApp?: string | undefined;
  deliveryStatus?: string | undefined;
  exportId?: string | undefined;
  schema?: string | undefined;
} = {}): Promise<HandoffAuditSummary[]> {
  const organization = await getDefaultOrganization();
  const records = await db.handoffAudit.findMany({
    where: {
      organizationId: organization.id,
      ...(filters.targetApp ? { targetApp: filters.targetApp } : {}),
      ...(filters.deliveryStatus ? { lastDeliveryStatus: filters.deliveryStatus } : {}),
      ...(filters.schema ? { schema: filters.schema } : {}),
      ...(filters.exportId ? { exportId: { contains: filters.exportId } } : {})
    },
    orderBy: {
      lastExportedAt: "desc"
    },
    take: 100
  });

  return records.map(serializeHandoffAudit);
}
