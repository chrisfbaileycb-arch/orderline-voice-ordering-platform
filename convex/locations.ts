import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const upsert = mutation({
  args: {
    locationId: v.string(),
    name: v.string(),
    phone: v.string(),
    twilioNumber: v.optional(v.string()),
    deliveryType: v.union(v.literal("thirdparty"), v.literal("inhouse"), v.literal("both")),
    thirdPartyLinks: v.object({
      doordash: v.optional(v.string()),
      grubhub: v.optional(v.string()),
      ubereats: v.optional(v.string()),
    }),
    onlineOrderUrl: v.optional(v.string()),
    posOnlineOrderUrl: v.optional(v.string()),
    smsEnabled: v.optional(v.boolean()),
    specials: v.optional(v.string()),
    customPrompts: v.array(v.string()),
    pinCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("locations")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("locations", args);
  },
});

export const get = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locations")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("locations").collect();
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("locations")
      .withIndex("by_location_id", (q) => q.eq("locationId", "charlies-demo"))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("locations", {
      locationId: "charlies-demo",
      name: "Charlie's Restaurant",
      phone: "+15550001234",
      deliveryType: "thirdparty",
      thirdPartyLinks: {
        doordash: "https://doordash.com/store/charlies",
        grubhub: "https://grubhub.com/charlies",
        ubereats: "https://ubereats.com/charlies",
      },
      specials: "Today's special is our famous half-rack ribs for just $18.99, and our soup of the day is roasted tomato bisque.",
      posOnlineOrderUrl: "https://order.toasttab.com/online/charlies-demo",
      smsEnabled: false,
      customPrompts: [
        "We are open Monday through Sunday from 11am to 10pm.",
        "We offer free parking in the lot behind the building.",
      ],
      pinCode: "1234",
    });
  },
});
