import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Incoming order from voice agent
export const pushOrder = mutation({
  args: {
    orderId: v.string(),
    customer: v.string(),
    type: v.union(v.literal("pickup"), v.literal("delivery"), v.literal("dine-in")),
    pickupTime: v.optional(v.string()),
    phone: v.optional(v.string()),
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        modifiers: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Upsert: replace if same orderId already exists
    const existing = await ctx.db
      .query("bridgeOrders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, status: "pending", agentLog: [] });
      return existing._id;
    }
    return await ctx.db.insert("bridgeOrders", {
      ...args,
      status: "pending",
      agentLog: [],
    });
  },
});

export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bridgeOrders").order("desc").first();
  },
});

export const getByOrderId = query({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bridgeOrders")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .first();
  },
});

export const appendLog = mutation({
  args: {
    bridgeOrderId: v.id("bridgeOrders"),
    entry: v.object({
      ts: v.number(),
      type: v.union(v.literal("info"), v.literal("success"), v.literal("warn"), v.literal("error")),
      message: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.bridgeOrderId);
    if (!doc) return;
    await ctx.db.patch(args.bridgeOrderId, {
      agentLog: [...doc.agentLog, args.entry],
    });
  },
});

export const updateStatus = mutation({
  args: {
    bridgeOrderId: v.id("bridgeOrders"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("entered"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bridgeOrderId, { status: args.status });
  },
});

export const listRecent = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bridgeOrders").order("desc").take(20);
  },
});
