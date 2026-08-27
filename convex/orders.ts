import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const place = mutation({
  args: {
    sessionId: v.string(),
    customerName: v.string(),
    tableNumber: v.string(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const totalCents = args.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const orderId = await ctx.db.insert("orders", {
      sessionId: args.sessionId,
      customerName: args.customerName,
      tableNumber: args.tableNumber,
      items: args.items,
      status: "new",
      notes: args.notes,
      totalCents,
    });
    return orderId;
  },
});

export const getBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("orders").order("desc").take(100);
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("new"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("done")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { status: args.status });
  },
});

export const sendStaffMessage = mutation({
  args: {
    orderId: v.id("orders"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { staffMessage: args.message });
  },
});
