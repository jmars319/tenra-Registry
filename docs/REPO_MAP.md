# Repo Map

## Root

- `apps`: user-facing application surfaces
- `packages`: shared TypeScript code reused by the apps
- `scripts`: root environment and health tooling
- `docs`: repository documentation
- `archive`: reserved for legacy imports and migration snapshots
- `.env.example`: root environment template for the active stack

## Apps

- `apps/webapp`: active Next.js full-stack app
- `apps/webapp/app`: route tree for dashboard, customer, asset, assignment, and placeholder modules
- `apps/webapp/prisma`: Prisma schema, migrations, and seed script
- `apps/webapp/src/server`: Prisma client setup, root env loading, and operational data access
- `apps/webapp/src/components/forms`: create forms powered by server actions
- `apps/webapp/src/components/registry`: small admin UI helpers for the active slice
- `apps/desktopapp`: placeholder desktop shell using Vite, React, and Tauri
- `apps/mobileapp`: placeholder Expo mobile shell

## Packages

- `packages/shared-types`: low-level shared aliases and primitives
- `packages/domain`: Registry entities, enums, and minimal business helpers
- `packages/api-contracts`: shared request and response contracts for the active CRUD flows
- `packages/validation`: Zod schemas for contracts and core inputs
- `packages/auth`: role and session definitions reserved for future auth work
- `packages/ui`: shared tokens and small presentation helpers
- `packages/config`: Registry-specific constants, routes, and default organization metadata

## Support Files

- `package.json`: root scripts and shared dev tooling
- `pnpm-workspace.yaml`: workspace discovery
- `tsconfig.base.json`: shared strict TypeScript baseline
- `eslint.config.mjs`: shared ESLint config
- `pnpm-lock.yaml`: locked dependency graph for the monorepo
