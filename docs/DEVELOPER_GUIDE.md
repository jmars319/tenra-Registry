# Developer Guide

## First Run

1. Install Node `22+`, pnpm `10+`, and ensure Postgres is available locally.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the local tenra Registry database.
4. Run `pnpm bootstrap`.
5. Run `pnpm --filter @registry/webapp db:migrate`.
6. Run `pnpm --filter @registry/webapp db:seed`.
7. Run `pnpm dev:web`.
8. Run `pnpm install:desktop` when you want the local Applications launcher.

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
- Desktop rebuild/install: `pnpm install:desktop`
- Desktop launch: `pnpm launch:desktop`
- Mobile: `pnpm dev:mobile`
- Web + desktop launcher: `pnpm dev:both`

The desktop app is the primary user-facing surface. It launches the production Next app locally, so it still depends on the repo checkout, pnpm, the built `.next` output, `DATABASE_URL`, and Postgres. The web app remains the secondary runtime/admin surface.

## Verify The Repo

- `pnpm check:env`: validate Node, pnpm, `DATABASE_URL`, Postgres connectivity, and optional native toolchains
- `pnpm check:packages`: confirm required workspaces exist
- `pnpm lint`: run ESLint across the monorepo
- `pnpm typecheck`: run TypeScript across the monorepo
- `pnpm verify:web`: lint, typecheck, check Prisma/database state, run the assignment lifecycle smoke flow, and build the web app
- `pnpm verify:desktop`: lint, typecheck, and build the desktop launcher
- `pnpm verify:mobile`: lint, typecheck, and export the mobile placeholder shell
- `pnpm verify:all`: run every app verification sequence
- `pnpm doctor`: run the full repository health sequence

## Local Tooling

The shared local machine baseline is useful for Registry maintenance:

- Use `actionlint` before changing GitHub Actions workflows.
- Use `shellcheck` and `shfmt` when editing repo scripts.
- Use `osv-scanner` for dependency advisory checks across package manifests.
- Use `pa11y` and `lighthouse` against the running Registry UI when user-facing screens change.
- Use OrbStack/Docker only when local Postgres or other service parity is needed; the documented workflow still runs through the repo scripts above.

## Dependency Maintenance

- Dependabot is enabled for GitHub Actions workflow updates.
- pnpm app and package dependencies are maintained manually with `pnpm outdated -r`, targeted `pnpm update` commands, `pnpm install --lockfile-only` when needed, and the verification commands above.
- Keep npm package ranges concrete, not `latest`, so updates remain reviewable.
- Treat Expo and React Native SDK updates as planned migrations that require `pnpm verify:mobile` and a mobile smoke check.
- Keep `just security` passing after dependency changes.

## Add More Functionality Later

1. Extend the shared packages first if the new behavior changes domain language or contracts.
2. Prefer keeping the local web runtime full-stack until the current vertical slice outgrows that shape.
3. Add a separate backend app only when the current app boundary becomes a real constraint.
4. Keep mobile third and thin until it has a clear, non-placeholder workflow to support.
5. Update the docs and repo map whenever the operational path changes.

## Current Lifecycle Rules

- Only active assignments occupy an asset.
- Draft assignments can be activated or cancelled.
- Active assignments can be completed or cancelled.
- Completing or cancelling an active assignment releases an `assigned` asset back to `available`.
- Activation is allowed only when the asset is currently `available`.
- `maintenance` and `archived` are manual asset states and are never overwritten by assignment lifecycle actions.
