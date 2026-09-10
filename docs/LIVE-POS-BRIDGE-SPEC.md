# Live POS Bridge — Canonical Product Specification

## Status

This document preserves the non-negotiable architecture for Orderline's live restaurant bridge. It is the authority for this workflow even where the current code is still simulated.

The current repository contains the order-intelligence core, per-location POS URL, selector mapper, bridge UI, structured order records, browser-agent SDK concept, call transcripts, and agent logs. Real browser control, screen recording, ticket readback, automated review, and fail-closed submission remain implementation work.

## Product principle

Orderline does not replace a restaurant's POS and does not process payment. It converts a caller's spoken order into a verified structured order and enters it into the restaurant's own authorized online-ordering workflow.

The restaurant's existing online-order URL is configured per location. That URL may normally appear on the restaurant's website, social pages, packaging, or other customer-facing channels. Orderline uses the same restaurant-authorized ordering surface inside a controlled browser session.

## Required end-to-end workflow

1. An incoming caller chooses automated pickup ordering or the restaurant's configured alternative.
2. A dedicated voice experience speaks with the caller.
3. A separate transcription component produces an exact transcript. The voice conversation and POS-entry worker must remain separate responsibilities.
4. Orderline parses the transcript into a canonical JSON order containing:
   - restaurant and location;
   - customer name and telephone number where authorized;
   - pickup or delivery intent;
   - requested pickup time;
   - line items;
   - quantities;
   - modifier groups and selections;
   - special instructions;
   - expected prices and totals where available.
5. The canonical JSON is displayed in Orderline's owned pane and persisted before POS entry begins.
6. A separate deterministic browser worker opens the restaurant's configured online-order URL in an authorized Chrome extension or Playwright-controlled session.
7. The worker uses the location's approved, versioned selector map and menu snapshot to enter every item, quantity, modifier, and instruction.
8. The worker reads the resulting ticket back from the restaurant ordering page.
9. A verifier compares the observed ticket with the canonical JSON.
10. If every required field matches, the order may proceed to the restaurant's configured non-payment completion boundary.
11. If any required field is missing, ambiguous, duplicated, repriced outside tolerance, or otherwise different, processing stops and the order is routed for human review.
12. The result, comparison, timestamps, selector-map version, and audit evidence are attached to the order.

## Browser architecture

Displaying an external ordering page in an iframe or browser pane is useful for the operator experience, but it does not by itself grant DOM access. Same-origin rules and frame restrictions must never be bypassed.

Production interaction must use one of these restaurant-authorized mechanisms:

- a Chrome extension installed in the restaurant-controlled browser profile; or
- an isolated Playwright browser session created for that restaurant/location.

The browser worker receives only a validated order manifest and location configuration. It must not make menu, modifier, price, or substitution decisions on its own.

## Selector-map lifecycle

Selector discovery may use AI during onboarding, but live order entry must be deterministic.

Each location configuration must retain:

- POS vendor and observed version;
- online-order URL and allowed hostnames;
- primary selectors and ordered fallbacks;
- category, item, item-name, item-price, quantity, modifier-group, modifier-option, special-instruction, ticket-line, subtotal, tax, total, and completion selectors;
- expected match counts and element states;
- captured menu identifiers and normalized Orderline mappings;
- map version, creation time, last verification time, and approver;
- certification results against the restaurant's regression suite.

A changed DOM, unknown selector-map version, unexpected hostname, or failed selector check must stop automation before an order is submitted.

## Verification contract

The ticket readback must compare at least:

- item identity;
- quantity;
- size;
- crust or preparation choice;
- required and optional modifiers;
- removals and substitutions;
- special instructions;
- pickup/delivery mode;
- requested time;
- customer identity fields approved for use;
- subtotal, tax, fees, and total against configured tolerances.

Verification must be fail-closed. Partial success is not success. Orderline must not label an order “entered” merely because clicks were dispatched.

## Recording and review

Every pilot browser-entry session should produce review evidence sufficient to reconstruct what happened:

- browser video or an equivalent ordered screenshot trace;
- canonical input JSON;
- exact transcript reference;
- selector-map and menu-snapshot versions;
- browser events and observed ticket readback;
- comparison result and any human correction;
- timestamps and final disposition.

Recordings must exclude or redact credentials, authentication tokens, unrelated browser tabs, and payment information. Retention, consent, access, and deletion rules must be defined before live use.

A review module must be able to compare the recording/readback evidence to the canonical order and flag discrepancies. Early pilots should receive human review until measured performance supports sampling.

## Payment boundary

The initial product must not collect, store, transmit, tokenize, or automate card information.

The preferred pilot path is pay at pickup. Orderline should stop at the restaurant's approved order-entry or send-to-kitchen boundary. If an external ordering page requires payment, the workflow must either:

- hand the customer to that provider's own payment experience; or
- stop and route the order to restaurant staff.

Cash, card, tender, refund, void-payment, and stored-payment controls are outside the initial automation scope.

## Large-order safeguards

Each location must configure thresholds for:

- maximum order value;
- maximum item quantity;
- unusually large duplicate quantities;
- catering or advance-order classification;
- lead-time requirements;
- deposit/payment requirements handled outside Orderline.

Orders beyond a threshold must be routed to staff rather than submitted automatically.

## Pilot certification

The normal telecommunications and onboarding lead time should be used as a private certification period.

Before a restaurant goes live:

1. Import its actual menu and online-order URL.
2. Build and approve its selector map.
3. Ask the restaurant to provide difficult historical orders, including ambiguous language, substitutions, half-and-half items, modifier conflicts, large quantities, and special instructions.
4. Convert those examples into anonymized, repeatable fixtures.
5. Run them through parsing, browser entry, ticket readback, and verification.
6. Require a documented pass threshold and human sign-off.
7. Re-run the suite whenever prompts, menus, mappings, selectors, browser code, or POS behavior changes.

The 28 difficult restaurant orders already exercised successfully in the sandbox must be preserved as the first regression suite when their inputs and expected outputs are available.

## Required state machine

A bridge order should move only through explicit states:

`received -> parsed -> awaiting_confirmation -> certified_for_entry -> entering -> verifying -> verified -> submitted`

Failure states:

`needs_clarification | selector_invalid | entry_failed | verification_failed | staff_review | cancelled`

Only a verified order may become submitted. Retrying must be idempotent and must not create duplicate tickets.

## Security and commercial guardrails

- Obtain written authorization from each restaurant/location.
- Use restaurant-controlled accounts and least-privilege browser profiles.
- Maintain strict tenant and location isolation.
- Restrict allowed ordering domains per location.
- Never attempt to defeat access controls, anti-bot systems, or technical restrictions.
- Review applicable POS/ordering-provider terms before each integration.
- Do not expose selector maps, credentials, customer data, transcripts, or recordings across restaurants.
- Maintain an immutable audit trail for live actions and human overrides.

## Definition of done

The live bridge is not complete until a real authorized restaurant can place a complex test call and the system can, without simulated clicks:

1. transcribe the call;
2. create the correct canonical JSON;
3. enter the complete order into that restaurant's online-ordering page;
4. read the resulting ticket back;
5. prove an exact permitted match;
6. stop before payment;
7. preserve review evidence;
8. avoid duplicate submission during retries; and
9. route every mismatch safely to a human.

Until all nine conditions are demonstrated, UI animations and internal ticket simulations must be labeled as simulations.
