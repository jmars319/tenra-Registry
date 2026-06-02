import type { Assignment, Asset, Customer, GeneratedDocument, ReceivableEntry } from "@registry/domain";
import type { EntityId } from "@registry/shared-types";
import { stableRegistryExportId } from "./ledgerHandoff";

export interface RegistryAssemblyDocumentRequest {
  schema: "tenra-registry.assembly-document-request.v1";
  exportId: EntityId;
  exportedAt: string;
  sourceApp: "registry";
  organizationId: EntityId;
  customerId: EntityId;
  assignmentId?: EntityId | undefined;
  documentType: GeneratedDocument["type"];
  title: string;
  contextMarkdown: string;
  desiredOutput: "letter" | "email" | "notice" | "agreement" | "statement";
}

export interface BuildRegistryAssemblyDocumentRequestInput {
  organizationId: EntityId;
  exportedAt?: string | undefined;
  customer: Pick<
    Customer,
    | "id"
    | "name"
    | "companyName"
    | "email"
    | "phone"
    | "billingStreet1"
    | "billingStreet2"
    | "billingCity"
    | "billingState"
    | "billingPostalCode"
    | "billingCountry"
  > & {
    balanceInCents?: number | undefined;
    pastDueInCents?: number | undefined;
  };
  assignment?:
    | (Pick<
        Assignment,
        | "id"
        | "startDate"
        | "endDate"
        | "billingCadence"
        | "rateInCents"
        | "siteName"
        | "siteStreet1"
        | "siteStreet2"
        | "siteCity"
        | "siteState"
        | "sitePostalCode"
        | "placementNotes"
      > & {
        assetCode?: string | undefined;
        assetName?: string | undefined;
      })
    | undefined;
  asset?: Pick<Asset, "id" | "assetCode" | "name" | "currentLocation" | "sizeLabel" | "unitType"> | undefined;
  entries?: Array<
    Pick<ReceivableEntry, "description" | "effectiveDate" | "dueDate" | "amountInCents" | "type" | "reference">
  > | undefined;
  documentType?: GeneratedDocument["type"] | undefined;
  desiredOutput?: RegistryAssemblyDocumentRequest["desiredOutput"] | undefined;
  title?: string | undefined;
}

function formatUsdMinor(amountInCents: number | undefined): string {
  const amount = (amountInCents ?? 0) / 100;
  return new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(amount);
}

function joinMarkdownLines(lines: Array<string | undefined>): string {
  return lines.filter((line): line is string => Boolean(line && line.trim())).join("\n");
}

export function buildRegistryAssemblyDocumentRequest(
  input: BuildRegistryAssemblyDocumentRequestInput
): RegistryAssemblyDocumentRequest {
  const customerLabel = input.customer.companyName ?? input.customer.name;
  const documentType = input.documentType ?? "past-due-notice";
  const desiredOutput = input.desiredOutput ?? (documentType === "account-statement" ? "statement" : "notice");
  const balanceLines = joinMarkdownLines([
    `Open balance: ${formatUsdMinor(input.customer.balanceInCents)}`,
    `Past due: ${formatUsdMinor(input.customer.pastDueInCents)}`
  ]);
  const address = joinMarkdownLines([
    input.customer.billingStreet1,
    input.customer.billingStreet2,
    [input.customer.billingCity, input.customer.billingState, input.customer.billingPostalCode].filter(Boolean).join(", "),
    input.customer.billingCountry
  ]);
  const assignment = input.assignment;
  const asset = input.asset;
  const entryLines = (input.entries ?? [])
    .slice(0, 8)
    .map((entry) =>
      `- ${entry.effectiveDate}: ${entry.type} ${formatUsdMinor(entry.amountInCents)} - ${entry.description}${
        entry.dueDate ? `, due ${entry.dueDate}` : ""
      }${entry.reference ? ` (${entry.reference})` : ""}`
    );

  return {
    schema: "tenra-registry.assembly-document-request.v1",
    exportId: stableRegistryExportId("registry-assembly", [
      input.organizationId,
      input.customer.id,
      assignment?.id,
      documentType,
      desiredOutput
    ]),
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    sourceApp: "registry",
    organizationId: input.organizationId,
    customerId: input.customer.id,
    assignmentId: assignment?.id,
    documentType,
    title: input.title ?? `${documentType.replaceAll("-", " ")} for ${customerLabel}`,
    desiredOutput,
    contextMarkdown: joinMarkdownLines([
      "# Customer",
      customerLabel,
      input.customer.email ? `Email: ${input.customer.email}` : undefined,
      input.customer.phone ? `Phone: ${input.customer.phone}` : undefined,
      address ? `Billing address:\n${address}` : undefined,
      "",
      "# Balance",
      balanceLines,
      "",
      assignment || asset ? "# Rental" : undefined,
      assignment ? `Assignment: ${assignment.id}` : undefined,
      assignment ? `Cadence: ${assignment.billingCadence}` : undefined,
      assignment ? `Rate: ${formatUsdMinor(assignment.rateInCents)}` : undefined,
      assignment?.siteName ? `Site: ${assignment.siteName}` : undefined,
      assignment?.siteCity || assignment?.siteState
        ? `Site area: ${[assignment.siteCity, assignment.siteState].filter(Boolean).join(", ")}`
        : undefined,
      assignment?.placementNotes ? `Placement notes: ${assignment.placementNotes}` : undefined,
      asset || assignment?.assetCode
        ? `Unit: ${asset?.assetCode ?? assignment?.assetCode} ${asset?.name ?? assignment?.assetName ?? ""}`.trim()
        : undefined,
      asset?.currentLocation ? `Current location: ${asset.currentLocation}` : undefined,
      "",
      entryLines.length ? "# Recent receivable entries" : undefined,
      ...entryLines
    ])
  };
}
