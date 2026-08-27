"use node";

/**
 * AUTOMATION STEP 1 — Send Zoom invite
 *
 * Goal: Book the onboarding call with the restaurant contact.
 *
 * ─── To wire this up ────────────────────────────────────────────────────────
 * Option A – Calendly (recommended, no auth required for basic links)
 *   No API key needed. You can simply generate a Calendly link with pre-filled
 *   name/email params and email it to the contact. The `sendWelcomeEmail`
 *   action in convex/emails.ts is the right place to embed this link.
 *
 * Option B – Google Calendar API
 *   1. Create a Google Cloud service account and enable the Calendar API.
 *   2. Share your calendar with the service account email.
 *   3. Install `googleapis` (add to convex.json `node.externalPackages`).
 *   4. Set these secrets in Advanced → Secrets:
 *        GOOGLE_CLIENT_EMAIL   — service account email
 *        GOOGLE_PRIVATE_KEY    — service account private key (JSON-escaped)
 *        GOOGLE_CALENDAR_ID    — your calendar ID (usually your Gmail address)
 *   5. Replace the stub below with a real google.calendar.events.insert() call.
 *
 * Option C – Zoom API (direct meeting creation)
 *   1. Create a Zoom Server-to-Server OAuth app at marketplace.zoom.us.
 *   2. Set secrets: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET.
 *   3. Install `axios` or use native fetch to call POST /v2/users/me/meetings.
 *   4. Replace the stub below with the real API call.
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { StepResult } from "./types.ts";

export const scheduleZoom = internalAction({
  args: {
    signupId: v.id("signups"),
    contactName: v.string(),
    restaurantName: v.string(),
    email: v.string(),
    // ISO datetime the onboarder set in the pipeline drawer
    zoomDate: v.string(),
  },
  handler: async (_ctx, args): Promise<StepResult> => {
    // ─── REPLACE THIS STUB ───────────────────────────────────────────────────
    // Example with Calendly pre-fill link (no API key):
    //
    // const calendlyBase = process.env.CALENDLY_LINK; // e.g. https://calendly.com/you/onboarding
    // const link = `${calendlyBase}?name=${encodeURIComponent(args.contactName)}&email=${encodeURIComponent(args.email)}`;
    // await sendCalendlyEmail(link, args); // use internal.emails.sendWelcomeEmail or a new action
    // return { ok: true, detail: `Calendly link sent to ${args.email}` };
    //
    // Example with Zoom API:
    //
    // const token = await getZoomToken(); // fetch OAuth token
    // const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     topic: `OrderLine onboarding — ${args.restaurantName}`,
    //     type: 2, // scheduled
    //     start_time: args.zoomDate,
    //     duration: 30,
    //     settings: { join_before_host: true },
    //   }),
    // });
    // const meeting = await res.json();
    // return { ok: true, detail: meeting.join_url };
    // ────────────────────────────────────────────────────────────────────────

    console.log("[STUB] scheduleZoom — not yet implemented", {
      restaurant: args.restaurantName,
      email: args.email,
      zoomDate: args.zoomDate,
    });
    return { ok: false, error: "Not implemented — see convex/automation/zoom.ts for wiring instructions." };
  },
});
