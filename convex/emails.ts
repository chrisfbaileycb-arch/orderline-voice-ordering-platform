"use node";

import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

// The verified sender address. Must match a verified email/domain in Emails → Verify email.
// Set ORDERLINE_FROM_EMAIL in your Secrets tab to override, e.g. "hello@orderline.ai"
const FROM_EMAIL =
  process.env.ORDERLINE_FROM_EMAIL ?? "onboarding@orderline.ai";

// The onboarder's notification address. Set ONBOARDER_EMAIL in your Secrets tab.
const ONBOARDER_EMAIL = process.env.ONBOARDER_EMAIL;

// ─── Welcome email to the restaurant contact ──────────────────────────────────

export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
    contactName: v.string(),
    restaurantName: v.string(),
  },
  handler: async (_ctx, { to, contactName, restaurantName }) => {
    const name = escapeHtml(contactName);
    const restaurant = escapeHtml(restaurantName);

    await hercules.email.send({
      from: `OrderLine <${FROM_EMAIL}>`,
      to,
      subject: `We received your request — ${restaurantName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8" /></head>
          <body style="font-family: Georgia, serif; background: #f0ead8; margin: 0; padding: 40px 20px;">
            <div style="max-width: 520px; margin: 0 auto; background: #faf6ed; border: 1px solid #d8d0c0; border-radius: 16px; padding: 40px;">
              <div style="margin-bottom: 28px;">
                <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.12em; color: #9a8a72; text-transform: uppercase;">OrderLine</span>
              </div>
              <h1 style="font-size: 24px; color: #2d2010; margin: 0 0 12px; font-weight: 700; line-height: 1.2;">
                We got your request, ${name}.
              </h1>
              <p style="font-size: 15px; color: #6b5c42; line-height: 1.6; margin: 0 0 20px;">
                Thanks for signing up <strong>${restaurant}</strong> for OrderLine. Our team will reach out within <strong>1 business day</strong> to schedule a quick onboarding call.
              </p>
              <div style="background: #f0ead8; border: 1px solid #d8d0c0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 12px; font-weight: 700; color: #9a8a72; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 10px;">What happens next</p>
                <ol style="font-size: 13px; color: #6b5c42; line-height: 1.8; margin: 0; padding-left: 18px;">
                  <li>We schedule a 20-min Zoom to understand your setup</li>
                  <li>Our team configures your POS integration and AI voice agent</li>
                  <li>We run a live test call together — your go-live date is set</li>
                </ol>
              </div>
              <p style="font-size: 13px; color: #9a8a72; margin: 0;">
                Questions? Reply to this email — a real person will respond.
              </p>
              <hr style="border: none; border-top: 1px solid #d8d0c0; margin: 28px 0;" />
              <p style="font-size: 11px; color: #c8b89a; margin: 0; line-height: 1.5;">
                OrderLine · AI phone ordering for restaurants<br />
                $250 setup · $250/month per location
              </p>
            </div>
          </body>
        </html>
      `,
      text: `Hi ${contactName},

Thanks for signing up ${restaurantName} for OrderLine. Our team will reach out within 1 business day to schedule your onboarding call.

What happens next:
1. We schedule a 20-min Zoom to understand your setup
2. Our team configures your POS integration and AI voice agent
3. We run a live test call together — your go-live date is set

Questions? Reply to this email.

— The OrderLine Team`,
    });
  },
});

// ─── Onboarder notification: new signup alert ─────────────────────────────────

export const sendOnboarderAlert = internalAction({
  args: {
    contactName: v.string(),
    restaurantName: v.string(),
    email: v.string(),
    restaurantPhone: v.string(),
    posSystem: v.string(),
    locationCount: v.string(),
    voicePreference: v.string(),
  },
  handler: async (_ctx, args) => {
    if (!ONBOARDER_EMAIL) {
      console.log("[OrderLine] ONBOARDER_EMAIL not set — skipping onboarder alert. Add it in Secrets.");
      return;
    }

    const rows = [
      ["Contact", args.contactName],
      ["Restaurant", args.restaurantName],
      ["Email", args.email],
      ["Phone", args.restaurantPhone],
      ["POS System", args.posSystem],
      ["Locations", args.locationCount],
      ["Voice", args.voicePreference],
    ]
      .map(
        ([k, v]) =>
          `<tr><td style="padding:6px 12px;font-weight:700;color:#9a8a72;white-space:nowrap;font-size:12px;">${escapeHtml(k)}</td><td style="padding:6px 12px;color:#2d2010;font-size:13px;">${escapeHtml(v)}</td></tr>`
      )
      .join("");

    await hercules.email.send({
      from: `OrderLine <${FROM_EMAIL}>`,
      to: ONBOARDER_EMAIL,
      subject: `New signup: ${args.restaurantName}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head><meta charset="UTF-8" /></head>
          <body style="font-family: Georgia, serif; background: #f0ead8; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: #faf6ed; border: 1px solid #d8d0c0; border-radius: 16px; padding: 32px;">
              <p style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#9a8a72;text-transform:uppercase;margin:0 0 16px;">New OrderLine signup</p>
              <h2 style="font-size:20px;color:#2d2010;margin:0 0 20px;font-weight:700;">${escapeHtml(args.restaurantName)}</h2>
              <table style="width:100%;border-collapse:collapse;background:#f0ead8;border-radius:10px;overflow:hidden;">${rows}</table>
              <p style="margin:20px 0 0;font-size:12px;color:#9a8a72;">Open the <a href="https://orderline.onhercules.app/pipeline" style="color:#10b981;">pipeline</a> to start onboarding.</p>
            </div>
          </body>
        </html>
      `,
      text: `New OrderLine signup\n\nRestaurant: ${args.restaurantName}\nContact: ${args.contactName}\nEmail: ${args.email}\nPhone: ${args.restaurantPhone}\nPOS: ${args.posSystem}\nLocations: ${args.locationCount}\nVoice: ${args.voicePreference}\n\nOpen the pipeline to start onboarding.`,
    });
  },
});
