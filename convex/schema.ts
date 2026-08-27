import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  menuItems: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(), // in cents
    category: v.string(),
    emoji: v.string(),
    available: v.boolean(),
  }).index("by_category", ["category"]).index("by_available", ["available"]),

  // Restaurant location config
  locations: defineTable({
    locationId: v.string(), // e.g. "charlies-chicago-01"
    name: v.string(), // "Charlie's Restaurant"
    phone: v.string(), // original restaurant phone to forward back to
    twilioNumber: v.optional(v.string()),
    deliveryType: v.union(v.literal("thirdparty"), v.literal("inhouse"), v.literal("both")),
    thirdPartyLinks: v.object({
      doordash: v.optional(v.string()),
      grubhub: v.optional(v.string()),
      ubereats: v.optional(v.string()),
    }),
    onlineOrderUrl: v.optional(v.string()),
    posOnlineOrderUrl: v.optional(v.string()), // URL loaded in the right pane of the bridge
    smsEnabled: v.optional(v.boolean()), // false during 3-week A2P setup window
    specials: v.optional(v.string()), // short text read during hold
    customPrompts: v.array(v.string()),
    pinCode: v.optional(v.string()),
  }).index("by_location_id", ["locationId"]),

  // Live call sessions
  callSessions: defineTable({
    locationId: v.string(),
    callSid: v.string(), // Twilio CallSid
    callerNumber: v.string(),
    callerName: v.optional(v.string()),
    flowStep: v.string(), // current step in the IVR flow
    flowPath: v.array(v.string()), // breadcrumb of steps taken
    orderType: v.optional(v.union(v.literal("pickup"), v.literal("delivery"), v.literal("hold"))),
    status: v.union(
      v.literal("active"),
      v.literal("holding"),
      v.literal("ai_ordering"),
      v.literal("forwarding"),
      v.literal("completed"),
      v.literal("dropped")
    ),
    smsSent: v.optional(v.string()), // what link was texted
    orderCaptured: v.optional(v.string()), // raw order text from AI
    acknowledgedAt: v.optional(v.number()),
    notificationCount: v.number(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_location", ["locationId"])
    .index("by_call_sid", ["callSid"])
    .index("by_status", ["status"]),

  // Call recordings / transcripts / analytics
  callLogs: defineTable({
    locationId: v.string(),
    callSid: v.string(),
    callerNumber: v.string(),
    durationSeconds: v.optional(v.number()),
    flowPath: v.array(v.string()),
    orderType: v.optional(v.string()),
    orderCaptured: v.optional(v.string()),
    smsSent: v.optional(v.string()),
    outcome: v.union(
      v.literal("sms_sent"),
      v.literal("order_placed"),
      v.literal("forwarded_to_staff"),
      v.literal("dropped"),
      v.literal("voicemail")
    ),
    recordingUrl: v.optional(v.string()),
    transcript: v.optional(v.string()),
    startedAt: v.number(),
  })
    .index("by_location", ["locationId"])
    .index("by_call_sid", ["callSid"])
    .index("by_started_at", ["startedAt"])
    .index("by_caller_number", ["callerNumber"]),

  bridgeOrders: defineTable({
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
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("entered"), v.literal("error")),
    agentLog: v.array(
      v.object({
        ts: v.number(),
        type: v.union(v.literal("info"), v.literal("success"), v.literal("warn"), v.literal("error")),
        message: v.string(),
      })
    ),
  }).index("by_order_id", ["orderId"]),

  // Customer identity — phone → profile (RevenuePlus milestone 2 foundation)
  customers: defineTable({
    phone: v.string(),               // normalized: digits only
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    locationId: v.optional(v.string()),
    loyaltyPoints: v.number(),
    orderCount: v.number(),
    lastOrderAt: v.optional(v.number()),
    paymentTokenHint: v.optional(v.string()), // last 4 of card, never full number
    notes: v.optional(v.string()),
  })
    .index("by_phone", ["phone"])
    .index("by_location", ["locationId"]),

  // RevenuePlus: per-restaurant POS integration configs
  restaurantConfigs: defineTable({
    locationId: v.string(),
    storeName: v.string(),
    posUrl: v.optional(v.string()),
    twilioNumber: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("trial"),
      v.literal("churned"),
    )),
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
    configVersion: v.number(),
  }).index("by_location_id", ["locationId"])
    .index("by_status", ["status"]),

  waitlist: defineTable({
    email: v.string(),
    joinedAt: v.number(),
  }).index("by_email", ["email"]),

  // Customer-facing signups from the landing page
  signups: defineTable({
    // Contact info
    contactName: v.string(),
    restaurantName: v.string(),
    restaurantPhone: v.string(), // the phone line OrderLine will answer
    email: v.string(),
    locationCount: v.union(v.literal("1"), v.literal("2-3"), v.literal("4-10"), v.literal("10+")),
    posSystem: v.string(),        // e.g. "Toast", "Square", "Other: ..."
    voicePreference: v.union(
      v.literal("female"),
      v.literal("male"),
      v.literal("neutral"),
      v.literal("calm_professional")
    ),
    termsAgreed: v.boolean(),
    // Pipeline tracking (managed by onboarder)
    pipelineStage: v.union(
      v.literal("signed_up"),
      v.literal("zoom_scheduled"),
      v.literal("pos_mapped"),
      v.literal("twilio_live"),
      v.literal("test_run"),
      v.literal("live"),
      v.literal("churned")
    ),
    zoomDate: v.optional(v.string()),      // ISO string, set by onboarder
    onboarderNotes: v.optional(v.string()),
    linkedLocationId: v.optional(v.string()), // set once restaurantConfig is created
    // Checklist step IDs that have been marked done by the onboarder
    completedSteps: v.optional(v.array(v.string())),
    // Automation run log — each entry is one step attempt
    automationLog: v.optional(v.array(v.object({
      stepId: v.string(),
      status: v.union(v.literal("running"), v.literal("success"), v.literal("error")),
      startedAt: v.number(),
      finishedAt: v.optional(v.number()),
      detail: v.union(v.string(), v.null()),
    }))),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_stage", ["pipelineStage"])
    .index("by_created_at", ["createdAt"]),

  orders: defineTable({
    sessionId: v.string(), // customer session (no auth needed)
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
    status: v.union(
      v.literal("new"),
      v.literal("confirmed"),
      v.literal("preparing"),
      v.literal("ready"),
      v.literal("done")
    ),
    notes: v.optional(v.string()),
    totalCents: v.number(),
    staffMessage: v.optional(v.string()),
  })
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),
});
