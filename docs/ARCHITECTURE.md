# Architecture and Recommended Direction

## Canonical layers

1. **Customer acquisition**: `/landing` and the signup/waitlist workflow.
2. **Customer ordering**: `/order`, AI order parsing, menu lookup, and order persistence.
3. **Phone orchestration**: Convex HTTP routes for Twilio call branching, SMS delivery links, pickup ordering, hold/forwarding, and call logs.
4. **Restaurant operations**: `/dashboard`, `/kitchen`, `/analytics`, `/customers`, and `/settings`.
5. **POS bridge**: `/bridge`, `/bridge/:locationId`, selector mapping, menu snapshots, and bridge order state.
6. **Onboarding and internal operations**: `/onboarding`, `/pipeline`, `/admin`, `/dev`, `/simulator`, `/integration`, `/sdk`, and `/hub`.
7. **Data authority**: `convex/schema.ts` is the live schema definition. `backups/convex/<date>/` is immutable recovery evidence, not runtime source.

## Recommended path

Preserve this repository as a modular monolith until one restaurant completes a full test call. Splitting services now would make the incomplete seams harder to see. The first reliable vertical slice should be:

`incoming call -> location lookup -> customer intent -> AI order -> manager confirmation -> POS bridge -> kitchen status -> call/order analytics`

Only after that slice is repeatable should Twilio, the browser/POS bridge, or analytics be separated into independent services.

## Authority rules

- Routes are declared only in `src/App.tsx`.
- Tables and indexes are declared only in `convex/schema.ts`.
- Integration secrets live only in deployment configuration; `.env.example` records names, never values.
- Each database export goes in a new dated directory and is never edited after commit.
- `docs/PAGE-MAP.md` records page purpose, audience, and maturity so experimental pages are not mistaken for production promises.

## Important decisions before launch

1. Choose one public product name and centralize it in configuration.
2. Replace demo restaurant/menu assumptions with per-location configuration.
3. Complete or remove the currently scaffolded Twilio/Zoom automation modules.
4. Add authorization by role; the current route guard distinguishes authenticated from public users but not operator/admin permissions.
5. Add tests for the phone flow, order parsing contract, location isolation, and POS bridge state transitions.
6. Validate recording, transcript, customer-data retention, consent, and deletion policies before live calls.
7. Code-split protected tools; the current production JavaScript bundle is about 1.76 MB before gzip.
