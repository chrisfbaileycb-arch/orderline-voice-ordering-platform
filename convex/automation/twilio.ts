"use node";

/**
 * AUTOMATION STEP 2 — Provision Twilio phone number
 *
 * Goal: Buy a local phone number for the restaurant and configure the
 * webhook so all inbound calls are handled by this location's bridge.
 *
 * ─── To wire this up ────────────────────────────────────────────────────────
 * 1. Install the Twilio Node SDK:
 *      pnpm add twilio
 *    Then add "twilio" to `node.externalPackages` in convex.json.
 *
 * 2. Set these secrets in Advanced → Secrets:
 *      TWILIO_ACCOUNT_SID    — from console.twilio.com → Account Info
 *      TWILIO_AUTH_TOKEN     — from console.twilio.com → Account Info
 *      ORDERLINE_BASE_URL    — your deployed app URL, e.g. https://orderline.onhercules.app
 *
 * 3. The webhook URL format for each location is:
 *      {ORDERLINE_BASE_URL}/api/twilio/{locationId}
 *    Make sure you have an HTTP Action registered at that path in convex/http.ts.
 *
 * 4. Area code is parsed from the restaurant's phone number (first 3 digits after country code).
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { StepResult } from "./types.ts";

export const provisionTwilioNumber = internalAction({
  args: {
    signupId: v.id("signups"),
    restaurantName: v.string(),
    restaurantPhone: v.string(), // used to derive target area code
    locationId: v.string(),      // the linked location ID for the webhook URL
  },
  handler: async (_ctx, args): Promise<StepResult> => {
    // ─── REPLACE THIS STUB ───────────────────────────────────────────────────
    // const twilio = require("twilio");
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const baseUrl = process.env.ORDERLINE_BASE_URL;
    //
    // // Parse area code from restaurant phone, e.g. "3125550100" → "312"
    // const digits = args.restaurantPhone.replace(/\D/g, "");
    // const areaCode = digits.length === 11 ? digits.slice(1, 4) : digits.slice(0, 3);
    //
    // // Search for an available local number in that area code
    // const available = await client.availablePhoneNumbers("US").local.list({
    //   areaCode,
    //   limit: 1,
    // });
    // if (!available.length) return { ok: false, error: `No numbers available in area code ${areaCode}` };
    //
    // // Buy the number and set the voice webhook
    // const webhookUrl = `${baseUrl}/api/twilio/${args.locationId}`;
    // const purchased = await client.incomingPhoneNumbers.create({
    //   phoneNumber: available[0].phoneNumber,
    //   voiceUrl: webhookUrl,
    //   voiceMethod: "POST",
    //   friendlyName: args.restaurantName,
    // });
    //
    // return { ok: true, detail: purchased.phoneNumber };
    // ────────────────────────────────────────────────────────────────────────

    console.log("[STUB] provisionTwilioNumber — not yet implemented", {
      restaurant: args.restaurantName,
      phone: args.restaurantPhone,
      locationId: args.locationId,
    });
    return { ok: false, error: "Not implemented — see convex/automation/twilio.ts for wiring instructions." };
  },
});
