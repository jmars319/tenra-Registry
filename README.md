# tenra Registry

tenra Registry is the rentals, sales/customer, unit, receivables, document, and Registry-owned handoff management app for the Tenra business suite.

Registry is not the suite hub. Suite-wide catalog, contract matrix, and smoke-check ownership now belongs in `tenra Hub`.

## Operational Purpose

- Track customers, sales prospects, billing contacts, and account history.
- Track portable storage units, yard inventory, condition, location, and assignment state.
- Manage rentals, delivery/pickup status, recurring rent runs, rates, and customer balances.
- Review receivables, payments, deposits, credits, refunds, and adjustments.
- Prepare documents and template-backed customer paperwork.
- Audit Registry-owned Ledger and Assembly handoff downloads.

## Business Handoffs

Registry preserves these app-owned handoff schemas:

- `tenra-registry.ledger-export.v1`
- `tenra-registry.assembly-document-request.v1`

Ledger and Assembly are optional integrations. Registry must remain usable as a complete rental/sales desk without Hub, Ledger, Assembly, Scout, or any other app running.

## Architecture

```text
apps/
  webapp/       Next.js rental/sales management runtime
  desktopapp/   Electron desktop launcher for the local web app
  mobileapp/    Expo scaffold for future mobile workflows

packages/
  domain/        Registry customer, unit, rental, receivable, and document models
  api-contracts/ Registry request, response, and handoff contracts
  validation/    Runtime schemas for Registry inputs and exports
  auth/          Local/session placeholders
  ui/            Shared interface primitives
  config/        Registry identity, routes, and environment helpers

docs/            Registry setup, handoff, import, and repo documentation
fixtures/        Registry-owned handoff fixtures
```

## Working Locally

```bash
pnpm run bootstrap
pnpm run dev:web
pnpm run dev:desktop
pnpm run verify:handoffs
pnpm run verify:replay
pnpm run verify:all
pnpm run doctor
```

## Related Documentation

- [Registry Handoffs](docs/HANDOFFS.md)
- [Cross-App Handoffs](docs/cross-app-handoffs.md)
- [Import Guide](docs/IMPORT_GUIDE.md)
- [Developer Guide](docs/DEVELOPER_GUIDE.md)
- [Repo Map](docs/REPO_MAP.md)
