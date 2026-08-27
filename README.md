# Restaurant Voice Ordering Platform — Source of Truth

This private repository preserves the complete application and its matching Convex database snapshot. The working product currently uses three names in the source—**OrderLine**, **RevenuePlus**, and **RevenuePulse**. No historical name has been removed; the canonical product name should be chosen before a public launch.

## What is here

- `src/` — React/Vite web application and every current page.
- `convex/` — Convex schema, queries, mutations, HTTP/Twilio flow, AI actions, and automation scaffolding.
- `backups/convex/2026-08-27/` — the supplied Convex export, preserved as a dated recovery snapshot.
- `docs/ARCHITECTURE.md` — system boundaries and recommended direction.
- `docs/PAGE-MAP.md` — route-by-route ownership and status.
- `docs/RECOVERY.md` — backup provenance and restoration guidance.

## Safety status

Keep this repository **private**. The dated database snapshot contains user-identifying fields. No environment files or secret values are included. Use `.env.example` as the configuration inventory.

## Local verification

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm test
corepack pnpm lint
corepack pnpm prettier-check
```

The production build succeeds. There are currently no automated test files. See the architecture and page map before expanding the product.
