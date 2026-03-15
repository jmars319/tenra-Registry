# Stability Checklist

- [ ] `.env.example` matches the active scaffold requirements
- [ ] `pnpm check:env` passes
- [ ] `pnpm check:packages` confirms the expected workspace layout
- [ ] `pnpm lint` passes across apps, packages, and scripts
- [ ] `pnpm typecheck` passes across apps and packages
- [ ] `pnpm verify:web` passes for the web scaffold
- [ ] `pnpm verify:desktop` still passes for the placeholder desktop shell
- [ ] `pnpm verify:mobile` still passes for the placeholder mobile shell
- [ ] the monorepo layout stays boring, explicit, and easy to verify
