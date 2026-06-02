# Repo Map

## Root

- `apps`: user-facing application surfaces
- `packages`: shared TypeScript code reused by the apps
- `scripts`: root environment and health tooling
- `docs`: repository documentation
- `archive`: reserved for legacy imports and migration snapshots
- `.env.example`: root environment template for the active stack

## Apps

- `apps/desktopapp`: primary Electron desktop launcher that starts the production Next web app locally
- `apps/webapp`: secondary Next.js full-stack runtime/admin app
- `apps/webapp/app`: route tree for dashboard, customers, units, rentals, receivables, rent runs, documents, imports, reports, and settings
- `apps/webapp/prisma`: Prisma schema, migrations, and seed script
- `apps/webapp/src/server`: Prisma client setup, root env loading, and centralized operational data and lifecycle mutations
- `apps/webapp/src/components/forms`: create forms powered by server actions
- `apps/webapp/src/components/registry`: small admin UI helpers for the active slice, including assignment lifecycle actions
- `apps/mobileapp`: third-surface Expo mobile companion shell

## Packages

- `packages/shared-types`: low-level shared aliases and primitives
- `packages/domain`: Registry by Tenra entities, enums, and minimal business helpers
- `packages/api-contracts`: shared request and response contracts for the active CRUD flows
- `packages/validation`: Zod schemas for contracts and core inputs
- `packages/auth`: role and session definitions reserved for future auth work
- `packages/ui`: shared tokens and small presentation helpers
- `packages/config`: Registry by Tenra-specific constants, routes, and default organization metadata

## Support Files

- `package.json`: root scripts and shared dev tooling
- `pnpm-workspace.yaml`: workspace discovery
- `tsconfig.base.json`: shared strict TypeScript baseline
- `eslint.config.mjs`: shared ESLint config
- `pnpm-lock.yaml`: locked dependency graph for the monorepo
