/**
 * Onboarding automation orchestrator.
 *
 * Provides a single `triggerStep` mutation that the pipeline UI (or a future
 * AI agent) calls to run any automation step for a signup. Each step:
 *   1. Runs the corresponding internalAction (in convex/automation/)
 *   2. Records the outcome in the signup's automationLog
 *   3. Optionally advances the pipeline stage on success
 *
 * To add a new automated step:
 *   1. Create convex/automation/myStep.ts with an internalAction
 *   2. Add an entry to STEP_MAP below
 *   3. The pipeline UI will surface it automatically
 */

import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internal } from "../_generated/api";
import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel.d.ts";

// ─── Types ─────────────────────────────────────────────────────────────────

type PipelineStage = Doc<"signups">["pipelineStage"];

type AutoLogEntry = {
  stepId: string;
  status: "running" | "success" | "error";
  startedAt: number;
  finishedAt?: number;
  detail: string | null;
};

const PIPELINE_STAGE_VALIDATOR = v.union(
  v.literal("signed_up"),
  v.literal("zoom_scheduled"),
  v.literal("pos_mapped"),
  v.literal("twilio_live"),
  v.literal("test_run"),
  v.literal("live"),
  v.literal("churned"),
);

// ─── Trigger a single automation step ──────────────────────────────────────

export const triggerStep = mutation({
  args: {
    signupId: v.id("signups"),
    stepId: v.union(
      v.literal("schedule_zoom"),
      v.literal("provision_twilio"),
      v.literal("run_test_call"),
    ),
  },
  handler: async (ctx, args): Promise<void> => {
    const signup = await ctx.db.get(args.signupId);
    if (!signup) throw new ConvexError({ message: "Signup not found", code: "NOT_FOUND" });

    // Append a "running" log entry immediately so the UI shows activity
    const logEntry: AutoLogEntry = {
      stepId: args.stepId,
      status: "running",
      startedAt: Date.now(),
      detail: null,
    };
    const currentLog: AutoLogEntry[] = signup.automationLog ?? [];
    await ctx.db.patch(args.signupId, {
      automationLog: [...currentLog, logEntry],
    });

    // Schedule the appropriate action
    if (args.stepId === "schedule_zoom") {
      if (!signup.zoomDate) {
        throw new ConvexError({ message: "Set a Zoom date before scheduling.", code: "BAD_REQUEST" });
      }
      await ctx.scheduler.runAfter(0, internal.automation.zoom.scheduleZoom, {
        signupId: args.signupId,
        contactName: signup.contactName,
        restaurantName: signup.restaurantName,
        email: signup.email,
        zoomDate: signup.zoomDate,
      });
    } else if (args.stepId === "provision_twilio") {
      if (!signup.linkedLocationId) {
        throw new ConvexError({ message: "Link a location ID before provisioning Twilio.", code: "BAD_REQUEST" });
      }
      await ctx.scheduler.runAfter(0, internal.automation.twilio.provisionTwilioNumber, {
        signupId: args.signupId,
        restaurantName: signup.restaurantName,
        restaurantPhone: signup.restaurantPhone,
        locationId: signup.linkedLocationId,
      });
    } else if (args.stepId === "run_test_call") {
      const location = signup.linkedLocationId
        ? await ctx.db
            .query("locations")
            .withIndex("by_location_id", (q) => q.eq("locationId", signup.linkedLocationId!))
            .first()
        : null;
      const twilioNumber = location?.twilioNumber;
      if (!twilioNumber) {
        throw new ConvexError({
          message: "No Twilio number found for this location. Provision it first.",
          code: "BAD_REQUEST",
        });
      }
      await ctx.scheduler.runAfter(0, internal.automation.testCall.runTestCall, {
        signupId: args.signupId,
        restaurantName: signup.restaurantName,
        twilioNumber,
      });
    }
  },
});

// ─── Record step result (called by each action after it completes) ──────────

export const recordStepResult = mutation({
  args: {
    signupId: v.id("signups"),
    stepId: v.string(),
    ok: v.boolean(),
    detail: v.optional(v.string()),
    advanceToStage: v.optional(PIPELINE_STAGE_VALIDATOR),
  },
  handler: async (ctx, args): Promise<void> => {
    const signup = await ctx.db.get(args.signupId);
    if (!signup) return;

    const existingLog: AutoLogEntry[] = signup.automationLog ?? [];

    // Replace the most recent "running" entry for this stepId with the result
    const updatedLog: AutoLogEntry[] = existingLog.map((entry) => {
      if (entry.stepId === args.stepId && entry.status === "running") {
        return {
          ...entry,
          status: args.ok ? ("success" as const) : ("error" as const),
          detail: args.detail ?? null,
          finishedAt: Date.now(),
        };
      }
      return entry;
    });

    const advanceToStage: PipelineStage | undefined = args.advanceToStage;
    await ctx.db.patch(args.signupId, {
      automationLog: updatedLog,
      ...(args.ok && advanceToStage ? { pipelineStage: advanceToStage } : {}),
    });
  },
});

// ─── Get automation log for a signup ──────────────────────────────────────

export const getLog = query({
  args: { signupId: v.id("signups") },
  handler: async (ctx, args): Promise<AutoLogEntry[]> => {
    const signup = await ctx.db.get(args.signupId);
    return (signup?.automationLog ?? []) as AutoLogEntry[];
  },
});
