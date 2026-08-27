import { v, ConvexError } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

// ── Helpers ────────────────────────────────────────────────────────────────────

const LOYALTY_PTS_PER_ORDER = 10;
const TIER_THRESHOLDS = { bronze: 0, silver: 50, gold: 150, platinum: 400 } as const;

export type LoyaltyTier = keyof typeof TIER_THRESHOLDS;

export function loyaltyTier(points: number): LoyaltyTier {
  if (points >= TIER_THRESHOLDS.platinum) return "platinum";
  if (points >= TIER_THRESHOLDS.gold) return "gold";
  if (points >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
}

// Internal helper — upsert customer from a phone number (called on call events)
export async function ensureCustomer(
  ctx: MutationCtx,
  phone: string,
  options?: { name?: string; locationId?: string }
) {
  const normalized = phone.replace(/\D/g, "");
  if (!normalized) return null;
  const existing = await ctx.db
    .query("customers")
    .withIndex("by_phone", (q) => q.eq("phone", normalized))
    .unique();
  if (existing) {
    // Backfill name/location if not set
    const patch: Record<string, string> = {};
    if (options?.name && !existing.name) patch.name = options.name;
    if (options?.locationId && !existing.locationId) patch.locationId = options.locationId;
    if (Object.keys(patch).length > 0) await ctx.db.patch(existing._id, patch);
    return existing._id;
  }
  return await ctx.db.insert("customers", {
    phone: normalized,
    name: options?.name,
    locationId: options?.locationId,
    loyaltyPoints: 0,
    orderCount: 0,
  });
}

// ── Queries ────────────────────────────────────────────────────────────────────

export const lookupByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.phone.replace(/\D/g, "");
    if (!normalized) return null;
    return await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("customers").order("desc").take(100);
  },
});

export const listByLocation = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .order("desc")
      .take(50);
  },
});

export const getCallHistory = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.phone.replace(/\D/g, "");
    if (!normalized) return [];
    return await ctx.db
      .query("callLogs")
      .withIndex("by_caller_number", (q) => q.eq("callerNumber", normalized))
      .order("desc")
      .take(20);
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    phone: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    locationId: v.optional(v.string()),
    paymentTokenHint: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalized = args.phone.replace(/\D/g, "");
    if (!normalized) {
      throw new ConvexError({ message: "Invalid phone number", code: "BAD_REQUEST" });
    }
    const existing = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.name !== undefined ? { name: args.name } : {}),
        ...(args.email !== undefined ? { email: args.email } : {}),
        ...(args.locationId !== undefined ? { locationId: args.locationId } : {}),
        ...(args.paymentTokenHint !== undefined ? { paymentTokenHint: args.paymentTokenHint } : {}),
        ...(args.notes !== undefined ? { notes: args.notes } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("customers", {
      phone: normalized,
      name: args.name,
      email: args.email,
      locationId: args.locationId,
      loyaltyPoints: 0,
      orderCount: 0,
      paymentTokenHint: args.paymentTokenHint,
      notes: args.notes,
    });
  },
});

export const recordOrderAndAwardPoints = internalMutation({
  args: {
    phone: v.string(),
    locationId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ensureCustomer(ctx, args.phone, {
      name: args.callerName,
      locationId: args.locationId,
    });
    if (!id) return;
    const customer = await ctx.db.get(id);
    if (!customer) return;
    await ctx.db.patch(id, {
      orderCount: customer.orderCount + 1,
      loyaltyPoints: customer.loyaltyPoints + LOYALTY_PTS_PER_ORDER,
      lastOrderAt: Date.now(),
    });
  },
});

export const touchProfile = internalMutation({
  args: {
    phone: v.string(),
    locationId: v.optional(v.string()),
    callerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ensureCustomer(ctx, args.phone, {
      name: args.callerName,
      locationId: args.locationId,
    });
  },
});

export const incrementOrderCount = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.phone.replace(/\D/g, "");
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (!customer) return;
    await ctx.db.patch(customer._id, {
      orderCount: customer.orderCount + 1,
      loyaltyPoints: customer.loyaltyPoints + LOYALTY_PTS_PER_ORDER,
      lastOrderAt: Date.now(),
    });
  },
});

export const deleteCustomer = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.phone.replace(/\D/g, "");
    const customer = await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("phone", normalized))
      .unique();
    if (!customer) {
      throw new ConvexError({ message: "Customer not found", code: "NOT_FOUND" });
    }
    await ctx.db.delete(customer._id);
  },
});
