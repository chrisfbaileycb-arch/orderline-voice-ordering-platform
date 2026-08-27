import { query } from "./_generated/server";
import { v } from "convex/values";

// ─── Paginated call log for a location ───────────────────────────────────────

export const listCallLogs = query({
  args: {
    locationId: v.string(),
    outcome: v.optional(v.string()), // filter by outcome
    sinceMs: v.optional(v.number()),  // filter by start time
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 100, 200);
    let q = ctx.db
      .query("callLogs")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .order("desc");

    const results = await q.take(limit);

    // Apply optional client-side filters (log table is small enough per location)
    return results.filter((log) => {
      if (args.outcome && log.outcome !== args.outcome) return false;
      if (args.sinceMs && log.startedAt < args.sinceMs) return false;
      return true;
    });
  },
});

// ─── Single call log detail ───────────────────────────────────────────────────

export const getCallLog = query({
  args: { callSid: v.string() },
  handler: async (ctx, args) => {
    const log = await ctx.db
      .query("callLogs")
      .withIndex("by_location", (q) => q.eq("locationId", "charlies-demo"))
      .filter((q) => q.eq(q.field("callSid"), args.callSid))
      .first();
    // Fallback: scan all logs for this callSid
    if (!log) {
      const allLogs = await ctx.db
        .query("callLogs")
        .order("desc")
        .take(500);
      return allLogs.find((l) => l.callSid === args.callSid) ?? null;
    }
    return log;
  },
});

// ─── Daily/weekly summary stats ───────────────────────────────────────────────

export const getSummaryStats = query({
  args: {
    locationId: v.string(),
    windowMs: v.number(), // e.g. 86400000 = 1 day, 604800000 = 7 days
  },
  handler: async (ctx, args): Promise<{
    totalCalls: number;
    ordersPlaced: number;
    holdsConverted: number;
    smsSent: number;
    droppedCalls: number;
    avgDurationSeconds: number;
  }> => {
    const since = Date.now() - args.windowMs;
    const logs = await ctx.db
      .query("callLogs")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .order("desc")
      .take(500);

    const inWindow = logs.filter((l) => l.startedAt >= since);

    const ordersPlaced = inWindow.filter((l) => l.outcome === "order_placed").length;
    const holdsConverted = inWindow.filter((l) => l.outcome === "forwarded_to_staff").length;
    const smsSent = inWindow.filter((l) => l.outcome === "sms_sent").length;
    const dropped = inWindow.filter((l) => l.outcome === "dropped").length;

    const durations = inWindow.map((l) => l.durationSeconds ?? 0).filter((d) => d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalCalls: inWindow.length,
      ordersPlaced,
      holdsConverted,
      smsSent,
      droppedCalls: dropped,
      avgDurationSeconds: Math.round(avgDuration),
    };
  },
});

// ─── Hourly call volume for chart (last 24 hrs) ──────────────────────────────

export const getHourlyVolume = query({
  args: { locationId: v.string() },
  handler: async (ctx, args): Promise<{ hour: string; calls: number; orders: number }[]> => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const logs = await ctx.db
      .query("callLogs")
      .withIndex("by_location", (q) => q.eq("locationId", args.locationId))
      .order("desc")
      .take(500);

    const inWindow = logs.filter((l) => l.startedAt >= since);

    // Build 24-bucket map
    const buckets: Record<number, { calls: number; orders: number }> = {};
    for (let i = 0; i < 24; i++) buckets[i] = { calls: 0, orders: 0 };

    for (const log of inWindow) {
      const h = new Date(log.startedAt).getHours();
      buckets[h].calls++;
      if (log.outcome === "order_placed") buckets[h].orders++;
    }

    return Object.entries(buckets).map(([h, v]) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      calls: v.calls,
      orders: v.orders,
    }));
  },
});
