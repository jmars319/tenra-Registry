# Developer Guide

## First Run

1. Install Node `22+` and pnpm `10+`.
2. Copy `.env.example` to `.env`.
3. Run `pnpm bootstrap`.
4. Run `pnpm dev:web`.

`bootstrap` installs dependencies, validates the environment, and checks the workspace shape.

## Run Apps

- Web: `pnpm dev:web`
- Desktop: `pnpm dev:desktop`
- Mobile: `pnpm dev:mobile`
- Web + desktop shell: `pnpm dev:both`

The web app is the primary surface even in the scaffold phase.

## Verify The Repo

- `pnpm check:env`: validate Node, pnpm, and optional native toolchains
- `pnpm check:packages`: confirm required workspaces exist
- `pnpm lint`: run ESLint across the monorepo
- `pnpm typecheck`: run TypeScript across the monorepo
- `pnpm verify:web`: lint, typecheck, and build the web app scaffold
- `pnpm verify:desktop`: lint, typecheck, and build the desktop placeholder shell
- `pnpm verify:mobile`: lint, typecheck, and export the mobile placeholder shell
- `pnpm verify:all`: run every app verification sequence
- `pnpm doctor`: run the full repository health sequence

## Add More Functionality Later

1. Keep shared logic in packages and keep apps thin.
2. Prefer extending the existing web app before introducing another active surface.
3. Add persistence only once the first vertical slice is ready to be made real.
4. Update the docs when the repo stops being scaffold-only.
