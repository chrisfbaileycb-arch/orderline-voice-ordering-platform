"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://ai-gateway.hercules.app/v1",
  apiKey: process.env.HERCULES_API_KEY,
});

export const parseOrder = action({
  args: {
    orderText: v.string(),
    menuContext: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const systemPrompt = `You are an AI assistant for a restaurant phone ordering system.
Your job is to parse a customer's spoken/typed order into structured JSON.

${args.menuContext ? `Available menu items:\n${args.menuContext}\n` : ""}

Return ONLY valid JSON with this shape:
{
  "orderType": "pickup" | "delivery" | "dine-in",
  "items": [
    {
      "name": "string",
      "quantity": number,
      "modifiers": ["string"],
      "confidence": number (0.0 to 1.0 — how sure you are this item was requested),
      "matchedMenuItem": "string | null (closest menu item name, or null if unknown)",
      "notes": "string | null (any special instructions for this item)"
    }
  ],
  "specialInstructions": "string | null",
  "estimatedTotal": "string | null (rough estimate like '$18.50', or null if you can't estimate)",
  "parsingNotes": "string (brief explanation of any assumptions you made)"
}

Rules:
- quantity defaults to 1 if not specified
- confidence of 1.0 = exact match to menu, 0.5 = likely match, 0.2 = unclear
- If the customer says "a couple" parse as 2, "a few" as 3, "half dozen" as 6
- Extract modifiers like "no onions", "extra cheese", "well done", "on the side"
- Infer orderType from context (e.g. "I'll pick it up" → pickup, "can you deliver" → delivery)
- Default orderType to "pickup" if not specified`;

    const response = await openai.chat.completions.create({
      model: "openai/gpt-5-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: args.orderText },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    try {
      return JSON.parse(raw) as {
        orderType: "pickup" | "delivery" | "dine-in";
        items: {
          name: string;
          quantity: number;
          modifiers: string[];
          confidence: number;
          matchedMenuItem: string | null;
          notes: string | null;
        }[];
        specialInstructions: string | null;
        estimatedTotal: string | null;
        parsingNotes: string;
      };
    } catch {
      return {
        orderType: "pickup" as const,
        items: [],
        specialInstructions: null,
        estimatedTotal: null,
        parsingNotes: "Failed to parse AI response",
      };
    }
  },
});
