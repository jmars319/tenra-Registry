# Registry App Manifest

## Standalone Mode

Registry runs as the rental and sales management desk without Hub, Ledger, Assembly, Scout, or any other app. Integrations are explicit exports and document requests.

## Repository Path

`business/core/Registry by Tenra`

## Optional Integrations

- tenra Ledger: export reviewed charges, payments, credits, deposits, refunds, and adjustments for bookkeeping.
- tenra Assembly: request approved rental paperwork, statements, notices, and customer documents from Registry context.

## Provides

- Customer and account records.
- Unit and asset inventory.
- Rental and sales assignment records.
- Receivables and balance summaries.
- Ledger export payloads.
- Assembly document request payloads.
- Registry-owned handoff audit records.

## Consumes

- None for core rental/sales management.

## App-Owned Contracts

- `tenra-registry.ledger-export.v1`
- `tenra-registry.assembly-document-request.v1`
