# OrderLine on Render

The full React application deploys as a Render static site. All original operational routes remain, including the call dashboard, location bridge, kitchen, customer history, onboarding, simulator, settings and analytics. SPA rewrites are provided in `render.yaml`.

## Backend and login

This source uses Convex for its backend and Hercules OIDC for login. Static hosting on Render does not replace those services. Set the real `VITE_CONVEX_URL`, `VITE_HERCULES_OIDC_AUTHORITY` and `VITE_HERCULES_OIDC_CLIENT_ID` in Render before deploying. No working values for those dependencies were found in the repository or Hatchable environment; a placeholder Convex URL in an old bundle is not a real configuration.

The Render-specific build checks the required settings, and rejects missing, localhost, example or known placeholder values. Register the new HTTPS URL plus `/auth/callback` with the login provider. Deploy the `convex/` functions and schema to the intended Convex project and configure its server-side keys there. Server-side OpenAI/Twilio/email keys must not become `VITE_` variables.

Build: `npm ci --include=dev && npm run build:render`. Publish directory: `dist`. The Vite Hercules deployment plugin is removed; the authentication libraries remain. Old `public/` prebuilt Hatchable bundles are excluded, so the published app is built from current source and does not accidentally carry the older public RPC implementation. Backend backups are not public assets.

## Full migration versus frontend hosting

This branch moves hosting of the full frontend to Render, while retaining Convex and OIDC dependencies. It is not an all-Render backend replacement. To move the backend infrastructure too, plan a separate Convex self-hosting or backend migration with persistent storage, authentication, realtime behavior and compatibility tests. Do not replace this with the small Hatchable RPC subset and describe it as the full original backend.

The live Hatchable database contains 18 menu items and no orders or call sessions. A complete export is kept separately. Menu IDs and schemas differ from Convex; import them with an explicit mapping rather than assuming the numeric IDs can be reused.

The repository's architecture documents identify partly scaffolded automation, including Twilio provisioning and test calls. Verify those integrations before accepting customer calls or claiming live POS support.

## Verification

TypeScript and production build passed. The existing test command exits successfully but finds no tests; it is not evidence of workflow coverage. Backend connectivity, login and full live-call workflow await configuration and authenticated testing.
