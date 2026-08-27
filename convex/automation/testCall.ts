"use node";

/**
 * AUTOMATION STEP 3 — Run test call
 *
 * Goal: Programmatically place an outbound call to the newly provisioned
 * Twilio number so the AI agent is exercised end-to-end before go-live.
 *
 * ─── To wire this up ────────────────────────────────────────────────────────
 * Requirements (same as twilio.ts):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN set in Secrets.
 *   TWILIO_TEST_CALLER — the verified caller ID to originate from
 *     (a number you own in Twilio, used as the "from" number).
 *
 * The outbound call will connect to the restaurant's provisioned Twilio
 * number. Because that number already has the OrderLine webhook configured,
 * the AI agent will answer and the test begins automatically.
 *
 * You can listen in by also passing `record: "record-from-answer"` and
 * checking the recording in the Twilio console afterwards.
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import type { StepResult } from "./types.ts";

export const runTestCall = internalAction({
  args: {
    signupId: v.id("signups"),
    restaurantName: v.string(),
    twilioNumber: v.string(), // the provisioned number to call
  },
  handler: async (_ctx, args): Promise<StepResult> => {
    // ─── REPLACE THIS STUB ───────────────────────────────────────────────────
    // const twilio = require("twilio");
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // const callerNumber = process.env.TWILIO_TEST_CALLER;
    // if (!callerNumber) return { ok: false, error: "TWILIO_TEST_CALLER secret not set" };
    //
    // const call = await client.calls.create({
    //   to: args.twilioNumber,
    //   from: callerNumber,
    //   // TwiML to say a greeting then hang up — the OrderLine webhook takes over
    //   url: "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical",
    //   record: "record-from-answer",
    // });
    //
    // return { ok: true, detail: `Call SID: ${call.sid}` };
    // ────────────────────────────────────────────────────────────────────────

    console.log("[STUB] runTestCall — not yet implemented", {
      restaurant: args.restaurantName,
      twilioNumber: args.twilioNumber,
    });
    return { ok: false, error: "Not implemented — see convex/automation/testCall.ts for wiring instructions." };
  },
});
