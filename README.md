# Registry

Registry is a JAMARQ side project for running a stable operational source of truth around organizations, customers, assets, assignments, and later invoicing.

This repository is now past the pure scaffold stage. The web app is a real full-stack vertical slice backed by Postgres and Prisma. Desktop and mobile remain light placeholders so the repo structure stays standardized without pretending those surfaces are production-ready yet.

## What Works Now

- single-organization operational workflow in the web app
- seeded default organization
- customer list, create, and detail flow
- asset list, create, and detail flow
- assignment list, create, and detail flow
- assignment lifecycle actions for activate, complete, and cancel
- active-assignment protection at the application layer and database layer
- automatic asset release back to available when active assignments are completed or cancelled

The target flow for this pass is real:

```bash
available asset -> create active assignment -> complete or cancel assignment -> asset available again -> create a new active assignment
```

## Monorepo Layout

- `apps/webapp`: active Next.js full-stack surface with Prisma, server actions, and the first operational slice
- `apps/desktopapp`: placeholder Vite + React + Tauri shell
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
pnpm verify:web
pnpm doctor
```

## Current Technical Baseline

- Node `22+`
- pnpm `10+`
- existing local Postgres instance via `DATABASE_URL`
- Prisma 7 with the Postgres driver adapter
- strict TypeScript across the monorepo

## Notes

- The UI is intentionally single-organization for this pass, but the schema remains organization-aware.
- Billing is intentionally simple: assignment cadence plus USD integer cents.
- Asset lifecycle automation only moves assets between `available` and `assigned`. `maintenance` and `archived` remain manual states.
- Invoice generation, auth provider integration, reporting, and a separate backend service are intentionally deferred.

See [docs/DEVELOPER_GUIDE.md](/Users/jason_marshall/JAMARQ/Side%20Projects/Registry/docs/DEVELOPER_GUIDE.md) and [docs/REPO_MAP.md](/Users/jason_marshall/JAMARQ/Side%20Projects/Registry/docs/REPO_MAP.md) for the working details.
