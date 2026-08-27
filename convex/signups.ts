import { v, ConvexError } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const STAGE_VALIDATOR = v.union(
  v.literal("signed_up"),
  v.literal("zoom_scheduled"),
  v.literal("pos_mapped"),
  v.literal("twilio_live"),
  v.literal("test_run"),
  v.literal("live"),
  v.literal("churned"),
);

const VOICE_VALIDATOR = v.union(
  v.literal("female"),
  v.literal("male"),
  v.literal("neutral"),
  v.literal("calm_professional"),
);

const LOCATION_COUNT_VALIDATOR = v.union(
  v.literal("1"),
  v.literal("2-3"),
  v.literal("4-10"),
  v.literal("10+"),
);

// ─── Public: customer signs up from landing page ──────────────────────────────

export const submit = mutation({
  args: {
    contactName: v.string(),
    restaurantName: v.string(),
    restaurantPhone: v.string(),
    email: v.string(),
    locationCount: LOCATION_COUNT_VALIDATOR,
    posSystem: v.string(),
    voicePreference: VOICE_VALIDATOR,
    termsAgreed: v.boolean(),
  },
  handler: async (ctx, args): Promise<string> => {
    if (!args.termsAgreed) {
      throw new ConvexError({ message: "You must agree to the terms to continue", code: "BAD_REQUEST" });
    }

    // Prevent duplicates by email
    const existing = await ctx.db
      .query("signups")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase().trim()))
      .first();
    if (existing) {
      // Idempotent — return success so the user sees confirmation
      return existing._id;
    }

    const id = await ctx.db.insert("signups", {
      contactName: args.contactName.trim(),
      restaurantName: args.restaurantName.trim(),
      restaurantPhone: args.restaurantPhone.trim(),
      email: args.email.toLowerCase().trim(),
      locationCount: args.locationCount,
      posSystem: args.posSystem.trim(),
      voicePreference: args.voicePreference,
      termsAgreed: true,
      pipelineStage: "signed_up",
      createdAt: Date.now(),
    });

    // Trigger async notifications (fire and forget)
    await ctx.scheduler.runAfter(0, internal.signups.sendNotifications, {
      signupId: id,
    });

    return id;
  },
});

// ─── Internal: send notifications after signup ───────────────────────────────

export const sendNotifications = internalMutation({
  args: { signupId: v.id("signups") },
  handler: async (ctx, args): Promise<void> => {
    const signup = await ctx.db.get(args.signupId);
    if (!signup) return;

    // Welcome email to the restaurant contact
    await ctx.scheduler.runAfter(0, internal.emails.sendWelcomeEmail, {
      to: signup.email,
      contactName: signup.contactName,
      restaurantName: signup.restaurantName,
    });

    // Onboarder alert email (skipped silently if ONBOARDER_EMAIL secret not set)
    await ctx.scheduler.runAfter(0, internal.emails.sendOnboarderAlert, {
      contactName: signup.contactName,
      restaurantName: signup.restaurantName,
      email: signup.email,
      restaurantPhone: signup.restaurantPhone,
      posSystem: signup.posSystem,
      locationCount: signup.locationCount,
      voicePreference: signup.voicePreference,
    });
  },
});

// ─── Onboarder: mark a checklist step done/undone ────────────────────────────

export const markChecklistStep = mutation({
  args: {
    id: v.id("signups"),
    stepId: v.string(),
    done: v.boolean(),
    // If provided, advance the pipeline stage when marking done
    advanceToStage: v.optional(STAGE_VALIDATOR),
  },
  handler: async (ctx, args): Promise<void> => {
    const signup = await ctx.db.get(args.id);
    if (!signup) throw new ConvexError({ message: "Signup not found", code: "NOT_FOUND" });

    const current = signup.completedSteps ?? [];
    const next = args.done
      ? Array.from(new Set([...current, args.stepId]))
      : current.filter((s) => s !== args.stepId);

    const patch: Record<string, unknown> = { completedSteps: next };
    if (args.done && args.advanceToStage) {
      patch.pipelineStage = args.advanceToStage;
    }
    await ctx.db.patch(args.id, patch);
  },
});


export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("signups")
      .withIndex("by_created_at")
      .order("desc")
      .take(200);
  },
});

export const getById = query({
  args: { id: v.id("signups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Onboarder: update pipeline stage and notes ──────────────────────────────

export const updatePipeline = mutation({
  args: {
    id: v.id("signups"),
    pipelineStage: v.optional(STAGE_VALIDATOR),
    zoomDate: v.optional(v.string()),
    onboarderNotes: v.optional(v.string()),
    linkedLocationId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const patch: Record<string, string | undefined> = {};
    if (args.pipelineStage !== undefined) patch.pipelineStage = args.pipelineStage;
    if (args.zoomDate !== undefined) patch.zoomDate = args.zoomDate;
    if (args.onboarderNotes !== undefined) patch.onboarderNotes = args.onboarderNotes;
    if (args.linkedLocationId !== undefined) patch.linkedLocationId = args.linkedLocationId;
    await ctx.db.patch(args.id, patch);
  },
});
