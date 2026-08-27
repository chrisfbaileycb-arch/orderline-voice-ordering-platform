"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

// System prompt that instructs the LLM to act as an order parser
const SYSTEM_PROMPT = `You are an AI phone order assistant for a restaurant POS system. 
Your job is to parse a customer's spoken or typed order into a structured JSON format.

The restaurant serves: Pizza (12", 14", 16"), Subs (Italian, Capicola, Turkey, Meatball), Wings (6pc, 12pc), Sides (French Fries, Mozzarella Sticks, Garlic Bread, Side Salad), Drinks (Soda, Water, Juice).

Extract:
- customer name (if mentioned, otherwise "Guest")
- order type: "pickup", "delivery", or "dine-in" (default "pickup" if unclear)
- pickupTime (if mentioned)
- phone (if mentioned)
- items array with: name (exact POS label like '14" Pepperoni'), quantity, modifiers array

Respond ONLY with valid JSON matching this structure:
{
  "customer": "string",
  "type": "pickup" | "delivery" | "dine-in",
  "pickupTime": "string or null",
  "phone": "string or null",
  "items": [
    { "name": "string", "quantity": number, "modifiers": ["string"] }
  ]
}

Rules:
- Use exact POS menu names. e.g. "large pepperoni" → '16" Pepperoni', "medium cheese" → '14" Cheese Pizza'
- Size mappings: small=12", medium=14", large=16"
- Always include relevant modifiers the customer requests
- If no items detected, return items: []
- Respond ONLY with JSON, no markdown fences, no explanation`;

export const parseOrderFromText = action({
  args: {
    text: v.string(),
    conversationHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (_ctx, args): Promise<{
    reply: string;
    order: {
      customer: string;
      type: "pickup" | "delivery" | "dine-in";
      pickupTime: string | null;
      phone: string | null;
      items: { name: string; quantity: number; modifiers: string[] }[];
    } | null;
  }> => {
    // Build messages: system + history + new user message
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...args.conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: args.text },
    ];

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages,
      temperature: 0.2,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    let order: {
      customer: string;
      type: "pickup" | "delivery" | "dine-in";
      pickupTime: string | null;
      phone: string | null;
      items: { name: string; quantity: number; modifiers: string[] }[];
    } | null = null;

    try {
      const parsed = JSON.parse(raw) as {
        customer?: string;
        type?: string;
        pickupTime?: string | null;
        phone?: string | null;
        items?: { name: string; quantity: number; modifiers: string[] }[];
      };
      const orderType = (["pickup", "delivery", "dine-in"].includes(parsed.type ?? "")
        ? parsed.type
        : "pickup") as "pickup" | "delivery" | "dine-in";

      order = {
        customer: parsed.customer ?? "Guest",
        type: orderType,
        pickupTime: parsed.pickupTime ?? null,
        phone: parsed.phone ?? null,
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    } catch {
      // JSON parse failed — order stays null
    }

    // Generate a friendly confirmation reply
    let reply = "";
    if (order && order.items.length > 0) {
      const itemSummary = order.items
        .map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ""}${i.name}${i.modifiers.length ? ` (${i.modifiers.join(", ")})` : ""}`)
        .join(", ");
      reply = `Got it! I'm sending ${order.customer}'s order to the POS: ${itemSummary}. ${order.pickupTime ? `Pickup at ${order.pickupTime}.` : ""}`;
    } else {
      reply = "I didn't catch any menu items in that. Could you repeat the order? For example: 'Large pepperoni pizza, extra cheese, thin crust, pickup for Chris at 6pm.'";
    }

    return { reply, order };
  },
});
