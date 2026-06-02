# Stability Checklist

- [ ] `.env.example` matches the actual runtime requirements
- [ ] repo root `.env` is present and `DATABASE_URL` is valid
- [ ] `pnpm check:env` passes, including Postgres connectivity
- [ ] `pnpm check:packages` confirms the expected workspace layout
- [ ] `pnpm --filter @registry/webapp db:migrate` applies cleanly
- [ ] `pnpm --filter @registry/webapp db:seed` runs cleanly
- [ ] `pnpm --filter @registry/webapp db:smoke` passes against the configured database
- [ ] `pnpm lint` passes across apps, packages, and scripts
- [ ] `pnpm typecheck` passes across apps and packages
- [ ] `pnpm verify:web` passes for the persistence-backed web slice
- [ ] `pnpm verify:desktop` still passes for the desktop launcher
- [ ] `pnpm install:desktop` installs one `/Applications/tenra Registry.app` copy
- [ ] `pnpm verify:mobile` still passes for the mobile companion shell
- [ ] creating a customer, asset, and assignment works end to end in the web app
- [ ] active assignments cannot double-occupy the same asset
- [ ] completing or cancelling an active assignment releases the asset back to `available`
- [ ] a released asset can be assigned again in a later active assignment
- [ ] `maintenance` and `archived` assets are never overwritten by assignment lifecycle automation
