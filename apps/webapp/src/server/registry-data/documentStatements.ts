import type { CreateAccountStatementDocumentRequest, UpdateGeneratedDocumentStatusRequest } from "@registry/api-contracts";
import type { GeneratedDocument } from "@registry/domain";
import { formatUsdCents, summarizeReceivableEntries } from "@registry/domain";
import { db } from "../db";
import { getDefaultOrganization } from "./handoffs";
import { serializeGeneratedDocument, serializeReceivableEntry } from "./mappers";
import { dateToIsoDate, getTodayIsoDate } from "./shared";

function formatCustomerBillingAddress(customer: {
  billingStreet1: string | null;
  billingStreet2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingPostalCode: string | null;
  billingCountry: string | null;
}): string {
  const cityStatePostal = [customer.billingCity, customer.billingState, customer.billingPostalCode]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(", ");

  return [
    customer.billingStreet1,
    customer.billingStreet2,
    cityStatePostal,
    customer.billingCountry
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

function formatStatementEntryLine(entry: {
  effectiveDate: Date;
  dueDate: Date | null;
  description: string;
  amountInCents: number;
  asset: {
    assetCode: string;
  } | null;
}): string {
  const dueLabel = entry.dueDate ? `Due ${dateToIsoDate(entry.dueDate)}` : "No due date";
  const unitLabel = entry.asset?.assetCode ?? "Account";

  return `${dateToIsoDate(entry.effectiveDate)} | ${unitLabel} | ${entry.description} | ${dueLabel} | ${formatUsdCents(
    entry.amountInCents
  )}`;
}

export async function createAccountStatementDocument(
  input: CreateAccountStatementDocumentRequest
): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Account statements must be created inside the default organization.");
  }

  const customer = await db.customer.findFirst({
    where: {
      id: input.customerId,
      organizationId: organization.id
    },
    include: {
      receivableEntries: {
        where: {
          status: "POSTED"
        },
        include: {
          asset: {
            select: {
              assetCode: true
            }
          }
        },
        orderBy: [
          {
            effectiveDate: "asc"
          },
          {
            createdAt: "asc"
          }
        ]
      }
    }
  });

  if (!customer) {
    throw new Error("Customer not found.");
  }

  const today = getTodayIsoDate();
  const balance = summarizeReceivableEntries(customer.receivableEntries.map(serializeReceivableEntry), today);
  const statementLines = customer.receivableEntries.map(formatStatementEntryLine);
  const billingAddress = formatCustomerBillingAddress(customer);
  const body = [
    `${organization.name}`,
    "",
    `Account statement for ${customer.name}`,
    customer.companyName ? `Company: ${customer.companyName}` : undefined,
    customer.email ? `Email: ${customer.email}` : undefined,
    customer.phone ? `Phone: ${customer.phone}` : undefined,
    billingAddress ? `Billing address:\n${billingAddress}` : undefined,
    "",
    "Account activity",
    statementLines.length > 0 ? statementLines.join("\n") : "No posted charges or payments yet.",
    "",
    `Total charges: ${formatUsdCents(balance.totalChargesInCents)}`,
    `Payments and credits: ${formatUsdCents(balance.totalCreditsInCents)}`,
    `Balance due: ${formatUsdCents(balance.balanceInCents)}`,
    `Past due: ${formatUsdCents(balance.pastDueInCents)}`,
    balance.lastPaymentDate ? `Last payment or credit: ${balance.lastPaymentDate}` : undefined
  ]
    .filter((line): line is string => typeof line === "string")
    .join("\n");
  const title = input.title?.trim() || `Account statement - ${customer.name} - ${today}`;

  const document = await db.generatedDocument.create({
    data: {
      organizationId: organization.id,
      templateId: null,
      customerId: customer.id,
      assignmentId: null,
      assetId: null,
      type: "ACCOUNT_STATEMENT",
      title,
      subject: `Account statement from ${organization.name}`,
      body,
      recipientEmail: customer.email
    }
  });

  return serializeGeneratedDocument(document);
}

export async function updateGeneratedDocumentStatus(
  input: UpdateGeneratedDocumentStatusRequest
): Promise<GeneratedDocument> {
  const organization = await getDefaultOrganization();

  if (input.organizationId !== organization.id) {
    throw new Error("Documents must be updated inside the default organization.");
  }

  const document = await db.generatedDocument.findFirst({
    where: {
      id: input.documentId,
      organizationId: organization.id
    }
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const now = new Date();
  const updatedDocument = await db.generatedDocument.update({
    where: {
      id: document.id
    },
    data:
      input.status === "printed"
        ? {
            status: "PRINTED",
            printedAt: now
          }
        : {
            status: "EMAILED",
            emailedAt: now
          }
  });

  return serializeGeneratedDocument(updatedDocument);
}
