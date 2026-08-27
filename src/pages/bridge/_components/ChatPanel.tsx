import { useState, useRef, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import LiveMicButton from "./LiveMicButton.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type ParsedOrder = {
  customer: string;
  type: "pickup" | "delivery" | "dine-in";
  pickupTime: string | null;
  phone: string | null;
  items: { name: string; quantity: number; modifiers: string[] }[];
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  order?: ParsedOrder | null;
};

type ConvHistory = { role: "user" | "assistant"; content: string };

// ─── Chat Message Component ───────────────────────────────────────────────────

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="text-[10px] text-[#9a8a72] font-mono bg-[#ece6d6] px-3 py-1 rounded-full border border-[#d8d0c0]">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex gap-2.5 items-start", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border",
        isUser
          ? "bg-emerald-500/20 border-emerald-500/40"
          : "bg-[#faf6ed] border-[#d8d0c0]"
      )}>
        {isUser
          ? <User size={13} className="text-emerald-700" />
          : <Bot size={13} className="text-[#9a8a72]" />
        }
      </div>

      {/* Bubble */}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
        isUser
          ? "bg-emerald-600 text-white rounded-tr-sm"
          : "bg-[#faf6ed] text-[#2d2010] rounded-tl-sm border border-[#d8d0c0]"
      )}>
        {message.content}
        {/* Order confirmation badge */}
        {message.order && message.order.items.length > 0 && (
          <div className="mt-2.5 bg-[#ece6d6] rounded-lg p-2 border border-emerald-500/30 space-y-0.5">
            <div className="text-[10px] text-emerald-700 font-mono font-semibold mb-1">→ SENT TO POS BRIDGE</div>
            {message.order.items.map((item, i) => (
              <div key={i} className="text-[10px] text-[#6b5c42] font-mono">
                <span className="text-[#2d2010]">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}</span>
                {item.modifiers.length > 0 && ` — ${item.modifiers.join(", ")}`}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex gap-2.5 items-start"
    >
      <div className="w-7 h-7 rounded-full bg-[#faf6ed] border border-[#d8d0c0] flex items-center justify-center shrink-0">
        <Bot size={13} className="text-[#9a8a72]" />
      </div>
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [0.6, 1, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            className="w-1.5 h-1.5 rounded-full bg-[#b8a890]"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Panel ──────────────────────────────────────────────────────────

export type ChatPanelProps = {
  onOrderParsed: (order: ParsedOrder & { orderId: string }) => void;
};

export default function ChatPanel({ onOrderParsed }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm the AI order assistant. Describe the customer's order in plain language and I'll parse it and send it to the POS bridge automatically.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseOrderFromText = useAction(api.ai.parseOrder.parseOrderFromText);
  const pushOrder = useMutation(api.bridge.pushOrder);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const conversationHistory = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })) satisfies ConvHistory[];

  async function handleSend() {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await parseOrderFromText({ text, conversationHistory });

      // If we got a valid order, push it to the bridge
      if (result.order && result.order.items.length > 0) {
        const orderId = `ORD-CHAT-${Date.now()}`;
        await pushOrder({
          orderId,
          customer: result.order.customer,
          type: result.order.type,
          ...(result.order.pickupTime ? { pickupTime: result.order.pickupTime } : {}),
          ...(result.order.phone ? { phone: result.order.phone } : {}),
          items: result.order.items,
        });
        onOrderParsed({ ...result.order, orderId });
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        order: result.order,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I had trouble connecting to the AI. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  // When a speech segment is finalized, auto-fill the input and submit
  function handleTranscript(text: string) {
    // Append to existing input in case of multiple segments before submit
    setInput((prev) => (prev ? prev + " " + text : text));
    // Small delay so the input state settles, then fire send
    setTimeout(() => {
      void handleSendText(text);
    }, 150);
  }

  // Variant of handleSend that accepts explicit text (for mic auto-submit)
  async function handleSendText(text: string) {
    if (!text.trim() || isLoading) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await parseOrderFromText({ text: text.trim(), conversationHistory });

      if (result.order && result.order.items.length > 0) {
        const orderId = `ORD-CHAT-${Date.now()}`;
        await pushOrder({
          orderId,
          customer: result.order.customer,
          type: result.order.type,
          ...(result.order.pickupTime ? { pickupTime: result.order.pickupTime } : {}),
          ...(result.order.phone ? { phone: result.order.phone } : {}),
          items: result.order.items,
        });
        onOrderParsed({ ...result.order, orderId });
      }

      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.reply,
        order: result.order,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I had trouble connecting to the AI. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f0ead8]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#d8d0c0] bg-[#faf6ed] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#2d2010] text-sm font-semibold">Order Voice Agent</span>
        </div>
        <div className="ml-auto text-[10px] font-mono text-[#9a8a72] bg-[#ece6d6] border border-[#d8d0c0] px-2 py-0.5 rounded-full">
          STT → AI → POS
        </div>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <AnimatePresence>
          {isLoading && <TypingIndicator />}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#faf6ed] border-t border-[#d8d0c0] shrink-0 space-y-2">
        {/* Live mic button */}
        <LiveMicButton onTranscript={handleTranscript} disabled={isLoading} />

        {/* Text input row */}
        <div className={cn(
          "flex items-center gap-2 bg-[#ece6d6] border rounded-2xl px-3 py-2 transition-all",
          isLoading ? "border-[#d8d0c0]" : "border-[#d8d0c0] focus-within:border-emerald-500/50"
        )}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Type order or use mic above..."
            className="flex-1 bg-transparent border-none outline-none text-[#2d2010] text-sm placeholder:text-[#b8a890] min-w-0"
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
              input.trim() && !isLoading
                ? "bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                : "bg-[#d8d0c0] text-[#b8a890] cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-[#b8a890] text-center">
          Speech → AI parses → structured POS order
        </p>
      </div>
    </div>
  );
}
