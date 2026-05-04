# tenra Registry

tenra Registry is a stable operating desk for portable storage-container rentals. It tracks organizations, customers, container units, rental site logistics, receivable entries, document templates, and practical reports.

This repository is now past the pure scaffold stage. The web app is a real full-stack vertical slice backed by Postgres and Prisma. The desktop app is a local macOS launcher for that real web workflow. Mobile remains a light placeholder so the repo structure stays standardized without pretending that surface is production-ready yet.

## What Works Now

- single-organization operational workflow in the web app
- seeded default organization
- customer list, create, detail, rental history, and account-balance flow
- container unit list, create, and detail flow with size, type, condition, home yard, and current location fields
- rental list, create, and detail flow with customer site, delivery, pickup, placement, cadence, and rate fields
- rental lifecycle actions for activate, complete, and cancel
- active-rental protection at the application layer and database layer
- automatic unit release back to available when active rentals are completed or cancelled
- receivable ledger entries for charges, deposits, payments, credits, adjustments, and refunds
- customer balance summaries, past-due visibility, and receivables reporting
- customizable document template library for rental agreements, delivery/pickup tickets, condition reports, receipts, statements, notices, and letters
- print-oriented CSS baseline for document/report output
- macOS Applications launcher that starts the production Next app locally and opens the Postgres-backed dashboard in a desktop window

The target flow for this pass is real:

```bash
available container -> create active rental -> post charges/payments -> complete or cancel rental -> unit available again
```

## Monorepo Layout

- `apps/webapp`: active Next.js full-stack surface with Prisma, server actions, and the first operational slice
- `apps/desktopapp`: Electron desktop launcher for the production Next web app
- `apps/mobileapp`: placeholder Expo + React Native shell
- `packages/*`: shared domain, contracts, validation, auth, UI tokens, and config
- `scripts`: root environment and health scripts
- `docs`: repo documentation
- `archive`: reserved for legacy imports and migration material

## Common Commands

```bash
cp .env.example .env
pnpm bootstrap
pnpm --filter @registry/webapp db:migrate
pnpm --filter @registry/webapp db:seed
pnpm dev:web
pnpm install:desktop
pnpm verify:web
pnpm doctor
```

## Current Technical Baseline

- Node `22+`
- pnpm `10+`
- existing local Postgres instance via `DATABASE_URL`
- Prisma 7 with the Postgres driver adapter
- local desktop launcher depends on this repo path, pnpm, the built Next app, and the same Postgres database
- strict TypeScript across the monorepo

## Notes

- The UI is intentionally single-organization for this pass, but the schema remains organization-aware.
- Billing now uses a receivable ledger. Positive entries increase customer balance; payments and credits reduce it.
- Unit lifecycle automation only moves units between `available` and `assigned`. `maintenance` and `archived` remain manual states.
- Documents are currently templates, not generated/sent document records. PDF generation, email delivery, and immutable delivery history are still future work.
- Auth provider integration and a separate backend service are intentionally deferred.
- The desktop app is a local launcher, not a standalone distributable yet. Distribution should later bundle or provision the server/database path instead of depending on this repo checkout.

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) and [docs/REPO_MAP.md](docs/REPO_MAP.md) for the working details.
