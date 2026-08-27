# Page and Route Map

| Route | Source | Purpose | Audience | Current direction |
|---|---|---|---|---|
| `/landing` | `src/pages/landing/page.tsx` | Marketing, pricing, signup | Public prospect | Preserve; canonicalize branding and legal links before launch |
| `/order` | `src/pages/order/page.tsx` | Direct web ordering | Restaurant customer | Core customer surface; connect to per-location menu/config |
| `/auth/callback` | `src/pages/auth/Callback.tsx` | OIDC completion | Any signing-in user | Infrastructure |
| `/bridge` | `src/pages/bridge/page.tsx` | Split-screen order/POS bridge | Operator | Core prototype |
| `/bridge/:locationId` | `src/pages/location-bridge/page.tsx` | Location-specific POS bridge | Operator | Core multi-location direction |
| `/dashboard` | `src/pages/dashboard/page.tsx` | Live call/session operations | Restaurant staff | Core operations surface |
| `/analytics` | `src/pages/analytics/page.tsx` | Call and outcome reporting | Manager | Keep; validate against real call logs |
| `/kitchen` | `src/pages/kitchen/page.tsx` | Kitchen order queue | Kitchen staff | Keep as downstream operational view |
| `/customers` | `src/pages/customers/page.tsx` | Customer lookup and history | Staff/manager | Keep; privacy and access controls required |
| `/settings` | `src/pages/settings/page.tsx` | Location/config management | Manager/admin | Keep; make tenant isolation explicit |
| `/onboarding` | `src/pages/onboarding/page.tsx` | Restaurant/POS setup | Onboarder/admin | Core internal workflow |
| `/pipeline` | `src/pages/pipeline/page.tsx` | Signup-to-live pipeline | Onboarder/admin | Keep; automation steps are partly scaffolded |
| `/admin` | `src/pages/admin/page.tsx` | Restaurant portfolio administration | Platform admin | Keep private; add role authorization |
| `/dev` | `src/pages/dev/page.tsx` | Test runner, mapping, telemetry | Developer | Development only; exclude from production navigation |
| `/simulator` | `src/pages/simulator/page.tsx` | Call/order simulation | Developer/onboarder | Essential pre-live testing tool |
| `/integration` | `src/pages/integration-guide/page.tsx` | Voice/order API guide and feed | Integrator | Documentation surface; verify examples against deployed endpoints |
| `/sdk` | `src/pages/sdk/page.tsx` | Browser SDK concept (`window.revenuePulse`) | Integrator/developer | Experimental; reconcile naming and actual distributable SDK |
| `/hub` | `src/pages/hub/page.tsx` | Internal system map/navigation | Internal user | Preserve as project compass |
| `*` | `src/pages/NotFound.tsx` | Not-found handling | Any user | Complete |

`src/pages/Index.tsx` redirects to the landing page but is not mounted by the current router. Preserve it until route cleanup is deliberate.
