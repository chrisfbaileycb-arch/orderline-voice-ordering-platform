"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

// Generates a short-lived ephemeral token for the OpenAI Realtime API.
// The client uses this token to establish a WebRTC connection for
// live speech-to-text without exposing the API key in the browser.
export const getRealtimeToken = action({
  args: {},
  handler: async (): Promise<{ token: string; expires_at: number }> => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured. Add it in Settings > Secrets.");
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-realtime-mini",
        // Transcription-only mode — no AI voice response generated
        modalities: ["text"],
        instructions: "",
        input_audio_transcription: { model: "whisper-1" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Realtime session creation failed: ${err}`);
    }

    const data = (await response.json()) as {
      client_secret: { value: string; expires_at: number };
    };

    return {
      token: data.client_secret.value,
      expires_at: data.client_secret.expires_at,
    };
  },
});

// Restaurant-specific transcription hint prompt — improves accuracy for menu
// terms that might be misheard (e.g. "capicola", "mozzarella", "garlic parm")
export const RESTAURANT_PROMPT = `Restaurant phone order. Menu items: 12 inch pizza, 14 inch pizza, 16 inch pizza, cheese pizza, pepperoni pizza, Italian sub, capicola sub, turkey sub, meatball sub, 6 piece wings, 12 piece wings, French fries, mozzarella sticks, garlic bread, side salad, soda, water, juice. Modifiers: extra cheese, thin crust, thick crust, stuffed crust, gluten free, extra sauce, sauce on side, Buffalo, BBQ, garlic Parmesan, honey mustard, boneless, traditional, ranch, blue cheese, provolone, American, Swiss, banana peppers, extra meat.`;
