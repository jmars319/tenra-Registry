# tenra Registry

tenra Registry is a stable operating desk for portable storage-container rentals. It tracks organizations, customers, container units, rental site logistics, receivable entries, document templates, and practical reports.

This repository is now past the pure scaffold stage. Registry is desktop-first: the macOS app is the user-facing operating desk. It launches the real local Next/Postgres workflow, while the web app remains the shared runtime/admin surface and mobile remains a light placeholder.

## What Works Now

- single-organization operational workflow through the desktop-launched local app
- seeded default organization
- customer list, create, detail, rental history, and account-balance flow
- container unit list, create, and detail flow with size, type, condition, home yard, and current location fields
- rental list, create, and detail flow with customer site, delivery, pickup, placement, cadence, and rate fields
- rental lifecycle actions for activate, complete, and cancel
- active-rental protection at the application layer and database layer
- automatic unit release back to available when active rentals are completed or cancelled
- receivable ledger entries for charges, deposits, payments, credits, adjustments, and refunds
- hardened rent-run screen for billing-day controls, non-monthly cadence calculation, prorated month starts, selected-rental exclusions, posted-history review, and duplicate-charge skipping
- customer balance summaries, past-due visibility, and receivables reporting
- customizable document template library for rental agreements, delivery/pickup tickets, condition reports, receipts, statements, notices, and letters
- generated document records with review-before-save editing, PDF download, print/email-draft actions, and status timestamps
- account statement generation from posted charges, payments, credits, and balances
- blank CSV import layouts plus dry-run validation, import execution, import batch audit records, and rollback support for customers, container units, active rentals, and opening balances
- print-oriented CSS baseline for document/report output
- macOS Applications launcher that starts the production Next app locally and opens the Postgres-backed dashboard in a desktop window

The target flow for this pass is real:

```bash
available container -> create active rental -> post charges/payments -> complete or cancel rental -> unit available again
```

## Monorepo Layout

- `apps/desktopapp`: primary Electron desktop launcher for the production local Next/Postgres workflow
- `apps/webapp`: secondary Next.js full-stack runtime with Prisma, server actions, and the first operational slice
- `apps/mobileapp`: third-surface placeholder Expo + React Native shell
- `packages/*`: shared domain, contracts, validation, auth, UI tokens, and config
- `scripts`: root environment and health scripts
- `docs`: repo documentation
- `archive`: reserved for legacy imports and migration material

## Common Commands

```bash
cp .env.example .env
pnpm bootstrap
pnpm db:prepare
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
- existing local Postgres instance via `DATABASE_URL`, or the default `postgresql:///registry?schema=public` after `pnpm db:prepare`
- Prisma 7 with the Postgres driver adapter
- local desktop launcher loads repo-root `.env` / `.env.local`, defaults to `postgresql:///registry?schema=public` when `DATABASE_URL` is not set, and depends on this repo path, pnpm, the built Next app, and the same local Postgres database
- strict TypeScript across the monorepo

## Notes

- The UI is intentionally single-organization for this pass, but the schema remains organization-aware.
- Billing now uses a receivable ledger. Positive entries increase customer balance; payments and credits reduce it.
- Unit lifecycle automation only moves units between `available` and `assigned`. `maintenance` and `archived` remain manual states.
- Documents now create generated records, track print/email actions, and generate simple downloadable PDFs. Direct email sending and immutable delivery history are still future work.
- Imports now support dry-run validation, execution, batch audit records, and rollback for newly imported records. A real source export should still be reviewed before the field mapping is considered final.
- Auth provider integration and a separate backend service are intentionally deferred.
- The desktop app is a local launcher, not a standalone distributable yet. Distribution should later bundle or provision the server/database path instead of depending on this repo checkout.

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) and [docs/REPO_MAP.md](docs/REPO_MAP.md) for the working details.
