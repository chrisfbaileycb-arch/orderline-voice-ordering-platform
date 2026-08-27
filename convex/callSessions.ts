import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

export const create = mutation({
  args: {
    locationId: v.string(),
    callSid: v.string(),
    callerNumber: v.string(),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"callSessions">> => {
    const id = await ctx.db.insert("callSessions", {
      locationId: args.locationId,
      callSid: args.callSid,
      callerNumber: args.callerNumber,
      callerName: args.callerName,
      flowStep: "greeting",
      flowPath: ["greeting"],
      status: "active",
      notificationCount: 0,
      startedAt: Date.now(),
    });
    // Auto-create / touch customer profile
    await ctx.scheduler.runAfter(0, internal.customers.touchProfile, {
      phone: args.callerNumber,
      locationId: args.locationId,
      callerName: args.callerName,
    });
    return id;
  },
});

export const advance = mutation({
  args: {
    callSid: v.string(),
    flowStep: v.string(),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("holding"),
        v.literal("ai_ordering"),
        v.literal("forwarding"),
        v.literal("completed"),
        v.literal("dropped")
      )
    ),
    orderType: v.optional(
      v.union(v.literal("pickup"), v.literal("delivery"), v.literal("hold"))
    ),
    smsSent: v.optional(v.string()),
    orderCaptured: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("callSessions")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
    if (!session) return null;
    await ctx.db.patch(session._id, {
      flowStep: args.flowStep,
      flowPath: [...session.flowPath, args.flowStep],
      ...(args.status ? { status: args.status } : {}),
      ...(args.orderType ? { orderType: args.orderType } : {}),
      ...(args.smsSent ? { smsSent: args.smsSent } : {}),
      ...(args.orderCaptured ? { orderCaptured: args.orderCaptured } : {}),
    });
    return session._id;
  },
});

export const acknowledge = mutation({
  args: { callSid: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("callSessions")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, {
      acknowledgedAt: Date.now(),
      status: "forwarding",
      flowStep: "forwarding_to_staff",
      flowPath: [...session.flowPath, "forwarding_to_staff"],
    });
  },
});

export const incrementNotification = mutation({
  args: { callSid: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("callSessions")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, {
      notificationCount: session.notificationCount + 1,
    });
  },
});

export const complete = mutation({
  args: {
    callSid: v.string(),
    outcome: v.union(
      v.literal("sms_sent"),
      v.literal("order_placed"),
      v.literal("forwarded_to_staff"),
      v.literal("dropped"),
      v.literal("voicemail")
    ),
    durationSeconds: v.optional(v.number()),
    recordingUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("callSessions")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, {
      status: "completed",
      endedAt: Date.now(),
    });
    // Write call log
    await ctx.db.insert("callLogs", {
      locationId: session.locationId,
      callSid: session.callSid,
      callerNumber: session.callerNumber,
      durationSeconds: args.durationSeconds,
      flowPath: session.flowPath,
      orderType: session.orderType,
      orderCaptured: session.orderCaptured,
      smsSent: session.smsSent,
      outcome: args.outcome,
      recordingUrl: args.recordingUrl,
      transcript: args.transcript,
      startedAt: session.startedAt,
    });
    // Award loyalty points if an order was placed
    if (args.outcome === "order_placed") {
      await ctx.scheduler.runAfter(0, internal.customers.recordOrderAndAwardPoints, {
        phone: session.callerNumber,
        locationId: session.locationId,
        callerName: session.callerName,
      });
    } else {
      // Still touch profile to ensure it exists
      await ctx.scheduler.runAfter(0, internal.customers.touchProfile, {
        phone: session.callerNumber,
        locationId: session.locationId,
        callerName: session.callerName,
      });
    }
  },
});

export const listActive = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("callSessions")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "holding"),
          q.eq(q.field("status"), "ai_ordering"),
          q.eq(q.field("status"), "forwarding")
        )
      )
      .order("asc")
      .collect();
  },
});

export const listRecent = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return await ctx.db
      .query("callSessions")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "completed"),
          q.gte(q.field("startedAt"), twoHoursAgo)
        )
      )
      .order("desc")
      .take(20);
  },
});

export const getByCallSid = query({
  args: { callSid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("callSessions")
      .withIndex("by_call_sid", (q) => q.eq("callSid", args.callSid))
      .first();
  },
});

// Simulate an incoming call for demo/testing
export const simulateCall = mutation({
  args: {
    locationId: v.string(),
    callerNumber: v.string(),
    callerName: v.optional(v.string()),
    scenario: v.union(
      v.literal("pickup_ai"),
      v.literal("delivery_sms"),
      v.literal("hold_queue"),
      v.literal("specials_then_ai")
    ),
  },
  handler: async (ctx, args): Promise<Id<"callSessions">> => {
    const callSid = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const isDelivery = args.scenario === "delivery_sms";
    const isHold = args.scenario === "hold_queue";

    const id = await ctx.db.insert("callSessions", {
      locationId: args.locationId,
      callSid,
      callerNumber: args.callerNumber,
      callerName: args.callerName,
      flowStep: isHold ? "holding" : isDelivery ? "delivery_sms_sent" : "ai_ordering",
      flowPath: isHold
        ? ["greeting", "pickup_or_delivery", "pickup", "automated_or_hold", "holding"]
        : isDelivery
        ? ["greeting", "pickup_or_delivery", "delivery", "sms_offer", "delivery_sms_sent"]
        : ["greeting", "pickup_or_delivery", "pickup", "specials", "automated_or_hold", "automated", "ai_ordering"],
      orderType: isDelivery ? "delivery" : isHold ? "hold" : "pickup",
      status: isHold ? "holding" : isDelivery ? "completed" : "ai_ordering",
      smsSent: isDelivery ? "https://doordash.com/store/charlies" : undefined,
      notificationCount: isHold ? 1 : 0,
      startedAt: Date.now(),
    });

    // Auto-link customer profile from call
    const outcome = isDelivery ? "sms_sent" : null;
    if (outcome) {
      await ctx.db.insert("callLogs", {
        locationId: args.locationId,
        callSid,
        callerNumber: args.callerNumber,
        flowPath: ["greeting", "pickup_or_delivery", "delivery", "sms_offer", "delivery_sms_sent"],
        orderType: "delivery",
        smsSent: "https://doordash.com/store/charlies",
        outcome: "sms_sent",
        startedAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.customers.touchProfile, {
        phone: args.callerNumber,
        locationId: args.locationId,
        callerName: args.callerName,
      });
    } else if (!isHold) {
      // pickup_ai / specials_then_ai — treat as order placed
      await ctx.scheduler.runAfter(0, internal.customers.recordOrderAndAwardPoints, {
        phone: args.callerNumber,
        locationId: args.locationId,
        callerName: args.callerName,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.customers.touchProfile, {
        phone: args.callerNumber,
        locationId: args.locationId,
        callerName: args.callerName,
      });
    }

    return id;
  },
});
