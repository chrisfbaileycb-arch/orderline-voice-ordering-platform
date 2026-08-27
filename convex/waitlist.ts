import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new ConvexError({ message: "Invalid email address", code: "BAD_REQUEST" });
    }
    // Check if already exists
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) {
      // Already on the list — treat as success, not an error
      return existing._id;
    }
    return await ctx.db.insert("waitlist", {
      email,
      joinedAt: Date.now(),
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("waitlist").order("desc").take(500);
  },
});
