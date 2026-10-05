import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const SYSTEM_ORDER_PROMPT = `You are OrderLine's voice ordering AI assistant for a restaurant.
Your role is to parse spoken or typed customer orders accurately into structured POS items and return a natural, friendly confirmation.

The restaurant serves:
- Pizzas: 12" Cheese ($15.99), 14" Cheese ($17.99), 16" Cheese ($19.99), 12" Pepperoni ($17.99), 14" Pepperoni ($19.99), 16" Pepperoni ($21.99), Margherita Pizza ($15.99)
- Subs: Italian Sub ($12.99), Capicola Sub ($13.99), Turkey Sub ($11.99), Meatball Sub ($13.49)
- Starters & Sides: Truffle Fries ($8.99), Side Salad ($6.99), Caesar Salad ($10.99), Garlic Bread ($6.99), Bruschetta ($8.49), Soup of the Day ($7.99)
- Mains: Spaghetti Bolognese ($16.99), Chicken Parmigiana ($19.99), Grilled Salmon ($21.99)
- Wings: 6pc Wings ($9.99), 12pc Wings ($17.99)
- Drinks: Soft Drink ($3.49), Sparkling Water ($3.99), House White Wine ($9.99), House Red Wine ($9.99)
- Desserts: Tiramisu ($8.99), Gelato ($6.99), Panna Cotta ($8.49)

Extract customer name, order type ('pickup' | 'delivery' | 'dine-in'), pickupTime (if provided), phone (if provided), and an array of items with name, quantity, and modifiers.`;

// POST /api/ai/parse-order
app.post("/api/ai/parse-order", async (req, res) => {
  try {
    const { text, conversationHistory = [] } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!apiKey) {
      // Fallback response if GEMINI_API_KEY is not yet attached
      return res.json({
        reply: `Got your order: "${text}". Transmitting to kitchen POS.`,
        order: {
          customer: "Guest",
          type: "pickup",
          pickupTime: "15-20 mins",
          phone: null,
          items: [{ name: "Pepperoni Pizza", quantity: 1, modifiers: ["Fresh Basil"] }],
        },
      });
    }

    const conversationContext = conversationHistory
      .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
      .join("\n");

    const prompt = `${SYSTEM_ORDER_PROMPT}\n\nConversation Context:\n${conversationContext}\n\nCurrent customer utterance: "${text}"\n\nReturn JSON conforming to schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Natural conversational voice response to the customer confirming items or asking for clarification.",
            },
            order: {
              type: Type.OBJECT,
              properties: {
                customer: { type: Type.STRING },
                type: { type: Type.STRING },
                pickupTime: { type: Type.STRING },
                phone: { type: Type.STRING },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      quantity: { type: Type.INTEGER },
                      modifiers: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                    },
                    required: ["name", "quantity"],
                  },
                },
              },
              required: ["customer", "type", "items"],
            },
          },
          required: ["reply", "order"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("[Gemini Order Parser Error]", error);
    // Graceful fallback parser in case of upstream rate-limiting/high-demand
    const lower = String(req.body.text || "").toLowerCase();
    const items: { name: string; quantity: number; modifiers: string[] }[] = [];
    if (lower.includes("pepperoni")) items.push({ name: '16" Pepperoni Pizza', quantity: 1, modifiers: [] });
    if (lower.includes("margherita") || lower.includes("cheese") || lower.includes("pizza")) {
      items.push({ name: '14" Cheese Pizza', quantity: 1, modifiers: [] });
    }
    if (lower.includes("drink") || lower.includes("coke") || lower.includes("soda")) {
      items.push({ name: "Soft Drink", quantity: 2, modifiers: [] });
    }
    if (lower.includes("fries")) items.push({ name: "Truffle Fries", quantity: 1, modifiers: [] });
    if (lower.includes("wing")) items.push({ name: "12pc Wings", quantity: 1, modifiers: ["Buffalo"] });
    if (items.length === 0) {
      items.push({ name: "Chef's Special Order", quantity: 1, modifiers: [String(req.body.text || "").slice(0, 40)] });
    }
    const orderType = lower.includes("delivery") ? "delivery" : lower.includes("dine") ? "dine-in" : "pickup";
    return res.json({
      reply: `Got your order for ${items.map((i) => i.name).join(", ")}. Sending directly to POS.`,
      order: {
        customer: "Guest",
        type: orderType,
        pickupTime: "15-20 mins",
        phone: null,
        items,
      },
    });
  }
});

// POST /api/ai/tts - Gemini speech synthesis
app.post("/api/ai/tts", async (req, res) => {
  try {
    const { text, voice = "Kore" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY is not configured" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text,
              speechMetadata: {
                style: "Friendly, helpful restaurant voice host",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: "Failed to generate audio" });
    }

    return res.json({ audioData: base64Audio, mimeType: "audio/wav" });
  } catch (error) {
    console.error("[Gemini TTS Error]", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "TTS generation failed",
    });
  }
});

// Mount Vite in dev mode or serve static files in prod
async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OrderLine Platform] Server listening on port ${PORT}`);
  });
}

setupViteOrStatic().catch(console.error);
