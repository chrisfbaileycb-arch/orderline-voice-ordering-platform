import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

const statusValidator = v.optional(v.union(
  v.literal("active"),
  v.literal("pending"),
  v.literal("trial"),
  v.literal("churned"),
));

export const getByLocationId = query({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("restaurantConfigs").order("desc").take(50);
  },
});

export const saveConfig = mutation({
  args: {
    locationId: v.string(),
    storeName: v.string(),
    posUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: statusValidator,
    notes: v.optional(v.string()),
    selectorMap: v.object({
      container: v.string(),
      item: v.string(),
      nameSelector: v.string(),
      priceSelector: v.string(),
      addButton: v.string(),
    }),
    menuSnapshot: v.optional(
      v.array(
        v.object({
          item_name: v.string(),
          item_price: v.string(),
          pos_element_selector: v.string(),
          add_button_selector: v.string(),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        storeName: args.storeName,
        posUrl: args.posUrl,
        twilioNumber: args.twilioNumber,
        contactName: args.contactName,
        contactEmail: args.contactEmail,
        contactPhone: args.contactPhone,
        status: args.status,
        notes: args.notes,
        selectorMap: args.selectorMap,
        menuSnapshot: args.menuSnapshot,
        configVersion: existing.configVersion + 1,
      });
      return existing._id;
    }

    return await ctx.db.insert("restaurantConfigs", {
      locationId: args.locationId,
      storeName: args.storeName,
      posUrl: args.posUrl,
      twilioNumber: args.twilioNumber,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      status: args.status ?? "pending",
      notes: args.notes,
      selectorMap: args.selectorMap,
      menuSnapshot: args.menuSnapshot,
      configVersion: 1,
    });
  },
});

// Lightweight update for admin panel (no selector/menu changes)
export const updateDetails = mutation({
  args: {
    locationId: v.string(),
    storeName: v.optional(v.string()),
    posUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
    if (!existing) {
      throw new ConvexError({ message: "Config not found", code: "NOT_FOUND" });
    }
    const patch: Record<string, string | undefined> = {};
    if (args.storeName !== undefined) patch.storeName = args.storeName;
    if (args.posUrl !== undefined) patch.posUrl = args.posUrl;
    if (args.twilioNumber !== undefined) patch.twilioNumber = args.twilioNumber;
    if (args.contactName !== undefined) patch.contactName = args.contactName;
    if (args.contactEmail !== undefined) patch.contactEmail = args.contactEmail;
    if (args.contactPhone !== undefined) patch.contactPhone = args.contactPhone;
    if (args.status !== undefined) patch.status = args.status;
    if (args.notes !== undefined) patch.notes = args.notes;
    await ctx.db.patch(existing._id, patch);
  },
});

// Quick add from admin panel (minimal fields, no selectors required)
export const quickAdd = mutation({
  args: {
    locationId: v.string(),
    storeName: v.string(),
    posUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: statusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
    if (existing) {
      throw new ConvexError({ message: "Location ID already exists", code: "CONFLICT" });
    }
    return await ctx.db.insert("restaurantConfigs", {
      locationId: args.locationId,
      storeName: args.storeName,
      posUrl: args.posUrl,
      twilioNumber: args.twilioNumber,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      status: args.status ?? "pending",
      notes: args.notes,
      selectorMap: {
        container: "",
        item: "",
        nameSelector: "",
        priceSelector: "",
        addButton: "",
      },
      configVersion: 1,
    });
  },
});

export const updateMenuSnapshot = mutation({
  args: {
    locationId: v.string(),
    menuSnapshot: v.array(
      v.object({
        item_name: v.string(),
        item_price: v.string(),
        pos_element_selector: v.string(),
        add_button_selector: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
    if (!existing) {
      throw new ConvexError({ message: "Config not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(existing._id, {
      menuSnapshot: args.menuSnapshot,
      configVersion: existing.configVersion + 1,
    });
  },
});

export const deleteConfig = mutation({
  args: { locationId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantConfigs")
      .withIndex("by_location_id", (q) => q.eq("locationId", args.locationId))
      .first();
    if (!existing) {
      throw new ConvexError({ message: "Config not found", code: "NOT_FOUND" });
    }
    await ctx.db.delete(existing._id);
  },
});
