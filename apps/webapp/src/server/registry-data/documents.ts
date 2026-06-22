import type {
  CreateDocumentTemplateRequest,
  CreateGeneratedDocumentRequest,
  SaveGeneratedDocumentDraftRequest
} from "@registry/api-contracts";
import { getAssignmentRoute, getCustomerRoute } from "@registry/config";
import type { DocumentTemplate, GeneratedDocument, Organization } from "@registry/domain";
import { formatUsdCents, summarizeReceivableEntries } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeDocumentTemplate, serializeGeneratedDocument, serializeReceivableEntry } from "./mappers";
import { getReceivableFormOptions } from "./receivables";
import {
  dateToIsoDate,
  domainDocumentTemplateTypeToPrisma,
  getTodayIsoDate,
  normalizeNullableString,
  prismaDocumentTemplateTypeToDomain
} from "./shared";
import type {
  DocumentRentalOption,
  GeneratedDocumentDetail,
  GeneratedDocumentDraft,
  GeneratedDocumentListItem,
  ReceivableCustomerOption
} from "./types";

// Template library boundary
export async function listDocumentTemplates(): Promise<DocumentTemplate[]> {
  const organization = await getDefaultOrganization();

  const templates = await db.documentTemplate.findMany({
    where: {
      organizationId: organization.id
    },
    orderBy: [
      {
        active: "desc"
      },
      {
        type: "asc"
      },
      {
        name: "asc"
      }
    ]
  });

  return templates.map(serializeDocumentTemplate);
}

export async function createDocumentTemplate(input: CreateDocumentTemplateRequest): Promise<DocumentTemplate> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Document templates must be created inside the default organization.");
  }

  const template = await db.documentTemplate.create({
    data: {
      organizationId: organization.id,
      type: domainDocumentTemplateTypeToPrisma(input.type),
      name: input.name,
      subject: normalizeNullableString(input.subject),
      body: input.body,
      mergeFields: input.mergeFields,
      printEnabled: input.printEnabled,
      emailEnabled: input.emailEnabled,
      active: true
    }
  });

  return serializeDocumentTemplate(template);
}

// Merge field boundary
function renderTemplateText(templateText: string | null | undefined, values: Record<string, string>): string | null {
  if (!templateText) {
    return null;
  }

  return templateText.replace(/\{\{\s*([a-zA-Z0-9.]+)\s*\}\}/gu, (_match, key: string) => values[key] ?? "");
}

function formatAssignmentSite(assignment: {
  siteName: string | null;
  siteStreet1: string | null;
  siteStreet2: string | null;
  siteCity: string | null;
  siteState: string | null;
  sitePostalCode: string | null;
}): string {
  return [
    assignment.siteName,
    assignment.siteStreet1,
    assignment.siteStreet2,
    [assignment.siteCity, assignment.siteState, assignment.sitePostalCode].filter(Boolean).join(", ")
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

// Document option boundary
export async function getDocumentFormOptions(): Promise<{
  organization: Organization;
  templates: DocumentTemplate[];
  customers: ReceivableCustomerOption[];
  rentals: DocumentRentalOption[];
}> {
  const [organization, templates, receivableOptions] = await Promise.all([
    getDefaultOrganization(),
    listDocumentTemplates(),
    getReceivableFormOptions()
  ]);

  return {
    organization,
    templates: templates.filter((template) => template.active),
    customers: receivableOptions.customers,
    rentals: receivableOptions.assignments.map((assignment) => ({
      id: assignment.id,
      customerId: assignment.customerId,
      assetId: assignment.assetId,
      label: assignment.label
    }))
  };
}

export async function listGeneratedDocuments(): Promise<GeneratedDocumentListItem[]> {
  const organization = await getDefaultOrganization();

  const documents = await db.generatedDocument.findMany({
    where: {
      organizationId: organization.id
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          assetCode: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return documents.map((document) => ({
    ...serializeGeneratedDocument(document),
    customerName: document.customer?.name,
    customerHref: document.customer ? getCustomerRoute(document.customer.id) : undefined,
    assetCode: document.asset?.assetCode,
    assignmentHref: document.assignment ? getAssignmentRoute(document.assignment.id) : undefined
  }));
}

export async function getGeneratedDocumentDetail(documentId: string): Promise<GeneratedDocumentDetail | null> {
  const organization = await getDefaultOrganization();

  const document = await db.generatedDocument.findFirst({
    where: {
      id: documentId,
      organizationId: organization.id
    },
    include: {
      template: {
        select: {
          name: true
        }
      },
      customer: {
        select: {
          id: true,
          name: true
        }
      },
      assignment: {
        select: {
          id: true
        }
      },
      asset: {
        select: {
          assetCode: true
        }
      }
    }
  });

  if (!document) {
    return null;
  }

  return {
    document: {
      ...serializeGeneratedDocument(document),
      customerName: document.customer?.name,
      customerHref: document.customer ? getCustomerRoute(document.customer.id) : undefined,
      assetCode: document.asset?.assetCode,
      assignmentHref: document.assignment ? getAssignmentRoute(document.assignment.id) : undefined
    },
    templateName: document.template?.name
  };
}

// Document preview boundary
export async function previewGeneratedDocument(input: CreateGeneratedDocumentRequest): Promise<GeneratedDocumentDraft> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be created inside the default organization.");
  }

  const template = await db.documentTemplate.findFirst({
    where: {
      id: input.templateId,
      organizationId: organization.id,
      active: true
    }
  });

  if (!template) {
    throw new Error("Template not found.");
  }

  const assignment = input.assignmentId
    ? await db.assignment.findFirst({
        where: {
          id: input.assignmentId,
          organizationId: organization.id
        },
        include: {
          customer: {
            include: {
              receivableEntries: {
                where: {
                  status: "POSTED"
                }
              }
            }
          },
          asset: true
        }
      })
    : null;

  const customerId = assignment?.customerId ?? input.customerId;

  if (!customerId) {
    throw new Error("Choose a customer or rental.");
  }

  const customer =
    assignment?.customer ??
    (await db.customer.findFirst({
      where: {
        id: customerId,
        organizationId: organization.id
      },
      include: {
        receivableEntries: {
          where: {
            status: "POSTED"
          }
        }
      }
    }));

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const balance = summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), getTodayIsoDate());
  const asset = assignment?.asset;
  const values: Record<string, string> = {
    "organization.name": organization.name,
    "customer.name": customer.name,
    "customer.companyName": customer.companyName ?? "",
    "customer.email": customer.email ?? "",
    "customer.phone": customer.phone ?? "",
    "unit.assetCode": asset?.assetCode ?? "",
    "unit.name": asset?.name ?? "",
    "unit.size": asset?.sizeLabel ?? "",
    "unit.condition": asset?.condition ?? "",
    "rental.startDate": assignment ? dateToIsoDate(assignment.startDate) : "",
    "rental.endDate": assignment?.endDate ? dateToIsoDate(assignment.endDate) : "",
    "rental.rate": assignment ? formatUsdCents(assignment.rateInCents) : "",
    "rental.siteAddress": assignment ? formatAssignmentSite(assignment) : "",
    "rental.placementNotes": assignment?.placementNotes ?? "",
    "balance.amount": formatUsdCents(balance.balanceInCents),
    "balance.pastDue": formatUsdCents(balance.pastDueInCents),
    "payment.amount": "",
    "payment.reference": ""
  };
  const title =
    input.title?.trim() ||
    `${template.name}${customer.name ? ` - ${customer.name}` : ""}`;

  return {
    templateId: template.id,
    customerId: customer.id,
    assignmentId: assignment?.id ?? undefined,
    assetId: asset?.id ?? undefined,
    type: prismaDocumentTemplateTypeToDomain(template.type),
    title,
    subject: renderTemplateText(template.subject, values) ?? undefined,
    body: renderTemplateText(template.body, values) ?? "",
    recipientEmail: customer.email ?? undefined,
    customerName: customer.name,
    assetCode: asset?.assetCode ?? undefined
  };
}

// Draft persistence boundary
export async function createGeneratedDocument(input: CreateGeneratedDocumentRequest): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();
  const draft = await previewGeneratedDocument(input);

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: normalizeNullableString(draft.templateId),
      customerId: draft.customerId,
      assignmentId: normalizeNullableString(draft.assignmentId),
      assetId: normalizeNullableString(draft.assetId),
      type: domainDocumentTemplateTypeToPrisma(draft.type),
      title: draft.title,
      subject: normalizeNullableString(draft.subject),
      body: draft.body,
      recipientEmail: normalizeNullableString(draft.recipientEmail)
    }
  });

  return serializeGeneratedDocument(document);
}

export async function saveGeneratedDocumentDraft(input: SaveGeneratedDocumentDraftRequest): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be saved inside the default organization.");
  }

  const customer = await db.customer.findFirst({
    where: {
      id: input.customerId,
      organizationId: organization.id
    }
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: normalizeNullableString(input.templateId),
      customerId: input.customerId,
      assignmentId: normalizeNullableString(input.assignmentId),
      assetId: normalizeNullableString(input.assetId),
      type: domainDocumentTemplateTypeToPrisma(input.type),
      title: input.title,
      subject: normalizeNullableString(input.subject),
      body: input.body,
      recipientEmail: normalizeNullableString(input.recipientEmail)
    }
  });

  return serializeGeneratedDocument(document);
}
