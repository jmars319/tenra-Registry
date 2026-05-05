# Cross-App Handoffs

Registry should interoperate with the rest of the tenra suite through explicit exported records or local APIs. The first implementation should be file-based and easy to inspect before any background automation is introduced.

## Registry to Ledger

Purpose: move posted financial activity into a bookkeeping system.

Minimum record:

```json
{
  "schema": "tenra.registry.ledger-entry.v1",
  "customerId": "customer-id",
  "customerName": "Customer name",
  "sourceEntryId": "receivable-entry-id",
  "type": "charge | payment | credit | adjustment | deposit | refund",
  "effectiveDate": "YYYY-MM-DD",
  "description": "Readable ledger description",
  "amountInCents": 0,
  "assignmentId": "optional-rental-id",
  "assetCode": "optional-unit-code",
  "reference": "optional-reference"
}
```

## Scout to Registry

Purpose: turn a qualified opportunity into a customer or prospect record.

Minimum record:

```json
{
  "schema": "tenra.scout.registry-lead.v1",
  "businessName": "Business name",
  "contactName": "optional-contact",
  "email": "optional-email",
  "phone": "optional-phone",
  "websiteUrl": "optional-url",
  "evidence": [
    {
      "kind": "screenshot | audit | search-result | note",
      "title": "Evidence title",
      "source": "source path or URL"
    }
  ],
  "recommendedNextStep": "Human-readable next action"
}
```

## Registry to Assembly

Purpose: create documents, notices, or content from approved operational context.

Minimum record:

```json
{
  "schema": "tenra.registry.assembly-brief.v1",
  "requestKind": "document | notice | internal-note | customer-message",
  "customerId": "customer-id",
  "customerName": "Customer name",
  "assignmentId": "optional-rental-id",
  "assetCode": "optional-unit-code",
  "context": "Approved facts to use",
  "constraints": ["Do not send automatically", "Keep office review required"]
}
```

## Align to Registry

Purpose: attach public profile and location state to an organization/customer location.

Minimum record:

```json
{
  "schema": "tenra.align.registry-location-state.v1",
  "source": "google-business-profile",
  "providerLocationId": "locations/123",
  "displayName": "Public profile name",
  "address": "Public address",
  "profileHealthScore": 0,
  "reviewNeedsReplyCount": 0,
  "syncIssues": [
    {
      "severity": "info | warning | critical",
      "title": "Issue title",
      "recommendedAction": "Action to review"
    }
  ]
}
```

## Guardrail and Proxy

Guardrail should approve or deny any AI-capable write, send, file, or network action before it runs. Proxy should shape outgoing customer-visible wording after a human has chosen the content goal and before the final review step.
