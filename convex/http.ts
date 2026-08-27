import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api.js";

const http = httpRouter();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function twiml(xml: string) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${xml}</Response>`, {
    headers: { "Content-Type": "text/xml" },
  });
}

function gather(action: string, prompt: string, hints?: string) {
  return `<Gather input="speech dtmf" action="${action}" method="POST" speechTimeout="3" ${hints ? `hints="${hints}"` : ""} timeout="8"><Say voice="Polly.Joanna">${prompt}</Say></Gather><Redirect>${action}?timeout=true</Redirect>`;
}

async function parseForm(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const params: Record<string, string> = {};
  for (const part of text.split("&")) {
    const [k, v] = part.split("=");
    if (k) params[decodeURIComponent(k)] = decodeURIComponent((v ?? "").replace(/\+/g, " "));
  }
  return params;
}

function saidYes(input: string): boolean {
  const lower = input.toLowerCase();
  return /\byes\b|\byep\b|\bsure\b|\bplease\b|\byeah\b|\b1\b/.test(lower);
}

function saidNo(input: string): boolean {
  const lower = input.toLowerCase();
  return /\bno\b|\bnope\b|\bnot\b|\b2\b/.test(lower);
}

function buildThirdPartyLinks(links: { doordash?: string; grubhub?: string; ubereats?: string }): string {
  const parts: string[] = [];
  if (links.doordash) parts.push("DoorDash");
  if (links.grubhub) parts.push("GrubHub");
  if (links.ubereats) parts.push("Uber Eats");
  return parts.join(", ");
}

// ─── Voice — warm, professional, courteous tone throughout ───────────────────
// All Say elements use Polly.Joanna. Language is friendly, unhurried, helpful.

// ─── /twilio/incoming — entry point ──────────────────────────────────────────

http.route({
  path: "/twilio/incoming",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const callSid = params["CallSid"] ?? "UNKNOWN";
    const callerNumber = params["From"] ?? "Unknown";
    const locationId = new URL(request.url).searchParams.get("locationId") ?? "charlies-demo";

    const location = await ctx.runQuery(api.locations.get, { locationId });
    const name = location?.name ?? "the restaurant";

    await ctx.runMutation(api.callSessions.create, { locationId, callSid, callerNumber });

    const baseUrl = new URL(request.url).origin;
    const action = `${baseUrl}/twilio/pickup-or-delivery?locationId=${locationId}&callSid=${callSid}`;

    return twiml(
      gather(
        action,
        `Thank you so much for calling ${name}! We're happy you called. Are you looking to place a pickup order, or will this be a delivery today? You can say pickup, delivery, or press 1 for pickup and 2 for delivery.`,
        "pickup, delivery, one, two"
      )
    );
  }),
});

// ─── /twilio/pickup-or-delivery ──────────────────────────────────────────────

http.route({
  path: "/twilio/pickup-or-delivery",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "charlies-demo";
    const callSid = url.searchParams.get("callSid") ?? params["CallSid"] ?? "";
    const speech = params["SpeechResult"] ?? params["Digits"] ?? "";
    const baseUrl = url.origin;

    const location = await ctx.runQuery(api.locations.get, { locationId });
    const isDelivery = speech.toLowerCase().includes("delivery") || speech.includes("2");

    if (isDelivery) {
      await ctx.runMutation(api.callSessions.advance, {
        callSid, flowStep: "delivery", orderType: "delivery", status: "active",
      });

      const links = location?.thirdPartyLinks ?? {};
      const names = buildThirdPartyLinks(links);
      const smsEnabled = location?.smsEnabled ?? false;
      const action = `${baseUrl}/twilio/delivery-sms?locationId=${locationId}&callSid=${callSid}`;

      if (smsEnabled) {
        return twiml(
          gather(
            action,
            `Of course! Our delivery is available through ${names || "our delivery partners"}. Would you like us to send you a text message with the ordering link so you can place your delivery order online? Just say yes or no, or press 1 for yes and 2 for no.`,
            "yes, no, one, two"
          )
        );
      }

      // SMS not yet active — graceful fallback, offer pickup instead
      await ctx.runMutation(api.callSessions.advance, {
        callSid, flowStep: "delivery_sms_not_ready", orderType: "pickup",
      });
      const pickupAction = `${baseUrl}/twilio/automated-or-hold?locationId=${locationId}&callSid=${callSid}`;
      return twiml(
        `<Say voice="Polly.Joanna">Thank you for your patience! Our text messaging service is in the process of being set up and will be available very soon. In the meantime, we'd love to take your order for pickup. Would you like to place a pickup order with me now? I can take your full order and have it ready for you!</Say>` +
          gather(pickupAction, "Press 1 to place a pickup order now, or press 2 to speak with a team member.", "yes, one, two, hold")
      );
    }

    // Pickup path
    await ctx.runMutation(api.callSessions.advance, {
      callSid, flowStep: "pickup", orderType: "pickup", status: "active",
    });

    const specials = location?.specials;
    const action = `${baseUrl}/twilio/automated-or-hold?locationId=${locationId}&callSid=${callSid}`;

    if (specials) {
      return twiml(
        `<Say voice="Polly.Joanna">Wonderful! We'd love to get your order started. Before we do, I just wanted to share what's special with us today. ${specials} Now, whenever you're ready —</Say>` +
          gather(
            action,
            "Would you like to go ahead and place your order with me through our automated system? It's quick and easy! Or if you'd prefer, I can connect you with one of our team members. Press 1 to order now, or press 2 to hold for a team member.",
            "automated, order, one, hold, two, person, someone"
          )
      );
    }

    return twiml(
      gather(
        action,
        "Wonderful! We'd love to take your pickup order. Would you like to place your order with me now through our quick automated system? Or I can connect you with a team member if you prefer. Press 1 to order now, or press 2 to hold.",
        "automated, order, one, hold, two, person, someone"
      )
    );
  }),
});

// ─── /twilio/delivery-sms ────────────────────────────────────────────────────

http.route({
  path: "/twilio/delivery-sms",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "charlies-demo";
    const callSid = url.searchParams.get("callSid") ?? "";
    const speech = params["SpeechResult"] ?? params["Digits"] ?? "";

    const location = await ctx.runQuery(api.locations.get, { locationId });
    const session = await ctx.runQuery(api.callSessions.getByCallSid, { callSid });
    const links = location?.thirdPartyLinks ?? {};

    const linkLines: string[] = [];
    if (links.doordash) linkLines.push(`DoorDash: ${links.doordash}`);
    if (links.grubhub) linkLines.push(`GrubHub: ${links.grubhub}`);
    if (links.ubereats) linkLines.push(`Uber Eats: ${links.ubereats}`);
    const smsBody = `Hi! Here's your delivery link for ${location?.name ?? "us"}:\n${linkLines.join("\n")}\nEnjoy your meal!`;

    if (saidYes(speech) && session) {
      await ctx.runMutation(api.callSessions.advance, {
        callSid, flowStep: "delivery_sms_sent", status: "completed", smsSent: linkLines[0] ?? "link",
      });
      await ctx.runMutation(api.callSessions.complete, { callSid, outcome: "sms_sent" });

      return twiml(
        `<Message to="${session.callerNumber}" from="${location?.twilioNumber ?? ""}">${smsBody}</Message>` +
          `<Say voice="Polly.Joanna">Perfect! I've just sent a text message to your phone with the delivery ordering link. Thank you so much for calling ${location?.name ?? "us"} — we really appreciate your business, and we hope you enjoy your meal!</Say><Hangup/>`
      );
    }

    // Declined SMS — offer pickup
    const baseUrl = url.origin;
    const action = `${baseUrl}/twilio/automated-or-hold?locationId=${locationId}&callSid=${callSid}`;
    await ctx.runMutation(api.callSessions.advance, {
      callSid, flowStep: "delivery_no_sms", orderType: "pickup",
    });

    return twiml(
      gather(
        action,
        "No problem at all! Would you like to place a pickup order instead? I can take your full order right now and have everything ready for you. Press 1 to place a pickup order, or press 2 if you'd like to speak with a team member.",
        "yes, pickup, one, hold, two, someone"
      )
    );
  }),
});

// ─── /twilio/automated-or-hold ───────────────────────────────────────────────

http.route({
  path: "/twilio/automated-or-hold",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "charlies-demo";
    const callSid = url.searchParams.get("callSid") ?? "";
    const speech = params["SpeechResult"] ?? params["Digits"] ?? "";
    const baseUrl = url.origin;

    const wantsHold =
      speech.toLowerCase().includes("hold") ||
      speech.toLowerCase().includes("someone") ||
      speech.toLowerCase().includes("person") ||
      speech.toLowerCase().includes("team") ||
      speech.includes("2");

    if (wantsHold) {
      await ctx.runMutation(api.callSessions.advance, {
        callSid, flowStep: "holding", orderType: "hold", status: "holding",
      });
      await ctx.runMutation(api.callSessions.incrementNotification, { callSid });

      const holdAction = `${baseUrl}/twilio/hold-check?locationId=${locationId}&callSid=${callSid}`;
      return twiml(
        `<Say voice="Polly.Joanna">Of course! We're happy to connect you with our team. We have a few customers ahead of you right now, so please hold for just a moment and someone will be with you as soon as possible. Thank you so much for your patience — we truly appreciate it!</Say>` +
          `<Play loop="3">https://demo.twilio.com/docs/classic.mp3</Play>` +
          `<Redirect>${holdAction}</Redirect>`
      );
    }

    // AI ordering path
    await ctx.runMutation(api.callSessions.advance, {
      callSid, flowStep: "ai_ordering", status: "ai_ordering",
    });

    const aiAction = `${baseUrl}/twilio/ai-order?locationId=${locationId}&callSid=${callSid}`;
    return twiml(
      `<Say voice="Polly.Joanna">Excellent choice! I'll be taking your order now. Please go ahead and tell me everything you'd like, including any sizes, toppings, or special requests. Take your time — I'm here to get every detail right for you.</Say>` +
        `<Gather input="speech" action="${aiAction}" method="POST" speechTimeout="5" timeout="20">` +
        `<Say voice="Polly.Joanna">Whenever you're ready, what would you like to order today?</Say>` +
        `</Gather>` +
        `<Redirect>${aiAction}?timeout=true</Redirect>`
    );
  }),
});

// ─── /twilio/hold-check ──────────────────────────────────────────────────────

http.route({
  path: "/twilio/hold-check",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "charlies-demo";
    const callSid = url.searchParams.get("callSid") ?? "";
    const baseUrl = url.origin;

    const session = await ctx.runQuery(api.callSessions.getByCallSid, { callSid });
    const location = await ctx.runQuery(api.locations.get, { locationId });
    await ctx.runMutation(api.callSessions.incrementNotification, { callSid });

    // Staff acknowledged on tablet — forward to restaurant
    if (session?.acknowledgedAt) {
      await ctx.runMutation(api.callSessions.complete, {
        callSid, outcome: "forwarded_to_staff",
      });
      return twiml(
        `<Say voice="Polly.Joanna">Great news — a team member is ready for you! Connecting you now. Thank you so much for your patience!</Say>` +
          `<Dial>${location?.phone ?? ""}</Dial>`
      );
    }

    // Still waiting — offer the automated escape hatch
    const autoAction = `${baseUrl}/twilio/automated-or-hold?locationId=${locationId}&callSid=${callSid}`;
    return twiml(
      `<Say voice="Polly.Joanna">Thank you so much for continuing to hold — we really appreciate your patience! Our team will be with you shortly. If you'd like to skip the wait and place your order quickly through our automated system, just press 1 at any time. Otherwise, please continue to hold and we'll be right with you.</Say>` +
        `<Gather input="speech dtmf" action="${autoAction}" method="POST" timeout="12" hints="automated, one, order">` +
        `<Play loop="2">https://demo.twilio.com/docs/classic.mp3</Play>` +
        `</Gather>` +
        `<Redirect>${baseUrl}/twilio/hold-check?locationId=${locationId}&callSid=${callSid}</Redirect>`
    );
  }),
});

// ─── /twilio/ai-order ────────────────────────────────────────────────────────

http.route({
  path: "/twilio/ai-order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const url = new URL(request.url);
    const locationId = url.searchParams.get("locationId") ?? "charlies-demo";
    const callSid = url.searchParams.get("callSid") ?? "";
    const speech = params["SpeechResult"] ?? "";

    const location = await ctx.runQuery(api.locations.get, { locationId });

    await ctx.runMutation(api.callSessions.advance, {
      callSid, flowStep: "order_captured", status: "completed", orderCaptured: speech,
    });

    if (speech) {
      await ctx.runMutation(api.bridge.pushOrder, {
        orderId: `CALL-${callSid}`,
        customer: "Phone Order",
        type: "pickup",
        items: [{ name: speech, quantity: 1, modifiers: [] }],
      });
    }

    await ctx.runMutation(api.callSessions.complete, { callSid, outcome: "order_placed" });

    return twiml(
      `<Say voice="Polly.Joanna">Perfect, thank you! I've got your order and it's already being entered into our system right now. Your pickup order will be ready and waiting for you. We really appreciate your call, and we look forward to seeing you soon at ${location?.name ?? "the restaurant"}. Have a wonderful day!</Say><Hangup/>`
    );
  }),
});

// ─── /twilio/status ──────────────────────────────────────────────────────────

http.route({
  path: "/twilio/status",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const params = await parseForm(request);
    const callSid = params["CallSid"] ?? "";
    const duration = parseInt(params["CallDuration"] ?? "0");
    const status = params["CallStatus"] ?? "";

    if (status === "completed" || status === "no-answer" || status === "busy" || status === "failed") {
      const session = await ctx.runQuery(api.callSessions.getByCallSid, { callSid });
      if (session && session.status !== "completed") {
        await ctx.runMutation(api.callSessions.complete, {
          callSid,
          outcome: status === "completed" ? "order_placed" : "dropped",
          durationSeconds: duration,
        });
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

// ─── /api/order ──────────────────────────────────────────────────────────────

http.route({
  path: "/api/order",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const order = body as {
      orderId?: string;
      customer?: string;
      type?: string;
      pickupTime?: string;
      phone?: string;
      items?: { name: string; quantity: number; modifiers: string[] }[];
    };

    if (!order.customer || !Array.isArray(order.items)) {
      return new Response(JSON.stringify({ error: "Missing required fields: customer, items" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const id = await ctx.runMutation(api.bridge.pushOrder, {
      orderId: order.orderId ?? `ORD-${Date.now()}`,
      customer: order.customer,
      type: (order.type as "pickup" | "delivery" | "dine-in") ?? "pickup",
      pickupTime: order.pickupTime,
      phone: order.phone,
      items: order.items,
    });

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }),
});

http.route({
  path: "/api/order",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }),
});

export default http;
