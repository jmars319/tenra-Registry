# Developer Guide

## First Run

1. Install Node `22+`, pnpm `10+`, and ensure Postgres is available locally.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the local Registry database.
4. Run `pnpm bootstrap`.
5. Run `pnpm --filter @registry/webapp db:migrate`.
6. Run `pnpm --filter @registry/webapp db:seed`.
7. Run `pnpm dev:web`.

`bootstrap` installs dependencies, validates the environment, checks the workspace shape, and generates the Prisma client.

## Database Workflow

- `pnpm --filter @registry/webapp db:generate`: regenerate Prisma client
- `pnpm --filter @registry/webapp db:migrate`: create and apply the next local migration with the default migration name
- `pnpm --filter @registry/webapp exec prisma migrate dev --name your_name`: create a migration with an explicit custom name
- `pnpm --filter @registry/webapp db:seed`: seed the default organization and sample operational records
- `pnpm --filter @registry/webapp db:check`: validate the Prisma schema and migration state against the configured database

The current slice assumes one seeded default organization in the UI. Do not build org switching on top of this without revisiting the current web flow.

## Run Apps

- Web: `pnpm dev:web`
- Desktop: `pnpm dev:desktop`
- Mobile: `pnpm dev:mobile`
- Web + desktop shell: `pnpm dev:both`

The web app is the only active full-stack surface right now.

## Verify The Repo

- `pnpm check:env`: validate Node, pnpm, `DATABASE_URL`, Postgres connectivity, and optional native toolchains
- `pnpm check:packages`: confirm required workspaces exist
- `pnpm lint`: run ESLint across the monorepo
- `pnpm typecheck`: run TypeScript across the monorepo
- `pnpm verify:web`: lint, typecheck, check Prisma/database state, run the assignment lifecycle smoke flow, and build the web app
- `pnpm verify:desktop`: lint, typecheck, and build the desktop placeholder shell
- `pnpm verify:mobile`: lint, typecheck, and export the mobile placeholder shell
- `pnpm verify:all`: run every app verification sequence
- `pnpm doctor`: run the full repository health sequence

## Add More Functionality Later

1. Extend the shared packages first if the new behavior changes domain language or contracts.
2. Prefer keeping the web app full-stack until the current vertical slice outgrows that shape.
3. Add a separate backend app only when the current app boundary becomes a real constraint.
4. Keep desktop and mobile thin until they have clear, non-placeholder workflows to support.
5. Update the docs and repo map whenever the operational path changes.

## Current Lifecycle Rules

- Only active assignments occupy an asset.
- Draft assignments can be activated or cancelled.
- Active assignments can be completed or cancelled.
- Completing or cancelling an active assignment releases an `assigned` asset back to `available`.
- Activation is allowed only when the asset is currently `available`.
- `maintenance` and `archived` are manual asset states and are never overwritten by assignment lifecycle actions.
