# Cross-App Handoffs

Registry interoperates with the business suite through explicit exported records or local APIs. Its Registry-owned handoffs are intentionally limited to Ledger bookkeeping exports and Assembly document requests.

## Registry to Ledger

Purpose: move posted financial activity into a bookkeeping system.

Canonical envelope: `tenra-registry.ledger-export.v1`.

```json
{
  "schema": "tenra-registry.ledger-export.v1",
  "exportedAt": "2026-05-06T17:30:00.000Z",
  "organizationId": "organization-id",
  "sourceApp": "registry",
  "rows": [
    {
      "externalId": "receivable-entry-id",
      "customerCode": "customer-id",
      "customerName": "Customer name",
      "entryType": "charge",
      "effectiveDate": "YYYY-MM-DD",
      "description": "Readable ledger description",
      "amountMinor": 10000
    }
  ]
}
```

## Registry to Assembly

Purpose: create documents, notices, or content from approved operational context.

Canonical envelope: `tenra-registry.assembly-document-request.v1`.

```json
{
  "schema": "tenra-registry.assembly-document-request.v1",
  "exportedAt": "2026-05-06T17:30:00.000Z",
  "sourceApp": "registry",
  "organizationId": "organization-id",
  "customerId": "customer-id",
  "documentType": "notice",
  "title": "Customer notice",
  "contextMarkdown": "Approved facts to use",
  "desiredOutput": "notice"
}
```

## Future Review

Scout, Align, Proxy, and Guardrail may become useful later, but Registry should not imply ownership of those flows until a real Registry workflow requires them. Hub owns the broader suite catalog.
