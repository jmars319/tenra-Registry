# Registry

Registry is a JAMARQ side project for building a stable operational source of truth around customers, assets, assignments, and later invoicing.

This repository starts as a predictable pnpm monorepo scaffold. The web app is the primary surface. Desktop and mobile exist as light placeholders so the development shape is standardized without pretending those surfaces are active yet.

## Current State

- monorepo scaffold with web, desktop, and mobile apps
- shared packages for domain language, contracts, validation, auth, UI tokens, and config
- root bootstrap, dev, verify, and doctor scripts
- placeholder web modules for customers, assets, assignments, invoices, reports, and settings

## Common Commands

```bash
cp .env.example .env
pnpm bootstrap
pnpm dev:web
pnpm verify:web
pnpm doctor
```

## Notes

- The repo is intentionally boring, explicit, and easy to verify.
- The web app is the active surface for early product work.
- Real persistence and operator workflows land after this scaffold baseline.

See [docs/DEVELOPER_GUIDE.md](/Users/jason_marshall/JAMARQ/Side%20Projects/Registry/docs/DEVELOPER_GUIDE.md) and [docs/REPO_MAP.md](/Users/jason_marshall/JAMARQ/Side%20Projects/Registry/docs/REPO_MAP.md) for the working layout.
