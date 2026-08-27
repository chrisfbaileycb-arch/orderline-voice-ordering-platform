import { useState, useEffect, useRef } from "react";
import type React from "react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Send, Minus, Plus, Trash2, UtensilsCrossed, CheckCircle2, Clock, ChefHat, Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils.ts";

// Stable session ID stored in localStorage
function getSessionId() {
  const key = "restaurant_session_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

type CartItem = {
  menuItemId: Id<"menuItems">;
  name: string;
  price: number;
  quantity: number;
};

type ChatStep = "greeting" | "name" | "table" | "menu" | "cart" | "notes" | "confirm" | "placed";

type Message = {
  id: string;
  from: "bot" | "customer";
  text: string;
  timestamp: number;
};

const CATEGORY_ORDER = ["Starters", "Mains", "Sides", "Drinks", "Desserts"];

type OrderStatus = Doc<"orders">["status"];

const STATUS_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { key: "new", label: "Received", icon: <CheckCircle2 size={18} />, description: "Your order has been received" },
  { key: "confirmed", label: "Confirmed", icon: <Clock size={18} />, description: "Kitchen has confirmed your order" },
  { key: "preparing", label: "Being Prepared", icon: <ChefHat size={18} />, description: "Our chefs are cooking your food" },
  { key: "ready", label: "Ready!", icon: <Bell size={18} />, description: "Your food is ready to be served" },
  { key: "done", label: "Served", icon: <CheckCircle2 size={18} />, description: "Enjoy your meal!" },
];

function LiveOrderStatus({ order }: { order: Doc<"orders"> }) {
  const currentIndex = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#faf6ed] border border-[#d8d0c0] rounded-2xl p-5"
    >
      <div className="text-center mb-5">
        <motion.div
          key={order.status}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-600 mb-3"
        >
          {STATUS_STEPS[currentIndex]?.icon}
        </motion.div>
        <h3 className="font-serif text-[#2d2010] text-xl font-semibold">
          {STATUS_STEPS[currentIndex]?.label}
        </h3>
        <p className="text-[#9a8a72] text-sm mt-1">
          {STATUS_STEPS[currentIndex]?.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-5">
        {STATUS_STEPS.filter((s) => s.key !== "done").map((step, i) => {
          const stepIndex = STATUS_STEPS.findIndex((s2) => s2.key === step.key);
          const isComplete = stepIndex <= currentIndex;
          const isActive = stepIndex === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-1.5 w-full rounded-full transition-all duration-500",
                  isComplete ? "bg-amber-500" : "bg-[#d8d0c0]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-amber-600" : isComplete ? "text-amber-700" : "text-[#b8a890]"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Staff message */}
      <AnimatePresence>
        {order.staffMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-50 rounded-xl px-4 py-3 flex gap-3 items-start border border-amber-200"
          >
            <MessageSquare size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 text-xs font-semibold uppercase tracking-wide mb-1">Message from Staff</p>
              <p className="text-amber-900 text-sm leading-relaxed">{order.staffMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order summary */}
      <div className="mt-4 pt-4 border-t border-[#d8d0c0]">
        <p className="text-[#9a8a72] text-xs uppercase tracking-wide font-semibold mb-2">
          Order — Table {order.tableNumber}
        </p>
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-[#6b5c42]">{item.quantity}× {item.name}</span>
              <span className="text-amber-600">${((item.price * item.quantity) / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[#2d2010] font-bold text-sm mt-2 pt-2 border-t border-[#cec6b4]">
          <span>Total</span>
          <span>${(order.totalCents / 100).toFixed(2)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function OrderPage() {
  const sessionId = getSessionId();
  const menuItems = useQuery(api.menu.list, {});
  const seedMenu = useMutation(api.menu.seed);
  const placeOrder = useMutation(api.orders.place);
  const existingOrder = useQuery(api.orders.getBySession, { sessionId });

  const [step, setStep] = useState<ChatStep>("greeting");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Starters");
  const [lastKnownStatus, setLastKnownStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Seed menu on first load
  useEffect(() => {
    seedMenu();
  }, [seedMenu]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    if (existingOrder === undefined) return; // loading
    if (existingOrder) {
      setStep("placed");
      addBotMessage(`Welcome back, **${existingOrder.customerName}**! Your order status is shown below — it updates live.`);
      return;
    }
    addBotMessage("👋 Welcome! I'm your table assistant. What's your name?");
    setStep("name");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder === undefined]);

  // Reactive status update: notify customer when status changes
  useEffect(() => {
    if (!existingOrder) return;
    const status = existingOrder.status;
    if (lastKnownStatus === null) {
      setLastKnownStatus(status);
      return;
    }
    if (status !== lastKnownStatus) {
      setLastKnownStatus(status);
      const statusMessages: Record<string, string> = {
        confirmed: "✅ Great news! The kitchen has **confirmed** your order.",
        preparing: "👨‍🍳 Your food is now being **prepared** in the kitchen!",
        ready: "🔔 Your order is **ready**! A server will bring it to you shortly.",
        done: "🍽️ Enjoy your meal! Thank you for dining with us.",
      };
      const msg = statusMessages[status];
      if (msg) addBotMessage(msg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder?.status]);

  // Notify when staff sends a message
  useEffect(() => {
    if (!existingOrder?.staffMessage) return;
    addBotMessage(`💬 **Message from staff:** ${existingOrder.staffMessage}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingOrder?.staffMessage]);


  function addBotMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: "bot", text, timestamp: Date.now() },
    ]);
  }

  function addCustomerMessage(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), from: "customer", text, timestamp: Date.now() },
    ]);
  }

  function handleSend() {
    const val = inputValue.trim();
    if (!val) return;
    setInputValue("");
    addCustomerMessage(val);

    if (step === "name") {
      setCustomerName(val);
      setTimeout(() => {
        addBotMessage(`Nice to meet you, **${val}**! 😊 What's your table number?`);
        setStep("table");
      }, 400);
    } else if (step === "table") {
      setTableNumber(val);
      setTimeout(() => {
        addBotMessage(`Table **${val}** — got it! 🪑\n\nHere's our menu. Tap items to add them to your order. When you're ready, tap the cart 🛒 to review and place your order.`);
        setStep("menu");
        setShowCart(false);
      }, 400);
    } else if (step === "notes") {
      setNotes(val);
      setTimeout(() => {
        addBotMessage(`Got it! Any special instructions noted. Ready to place your order?`);
        setStep("confirm");
      }, 400);
    }
  }

  async function handlePlaceOrder() {
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
    await placeOrder({
      sessionId,
      customerName,
      tableNumber,
      items: cart,
      notes: notes || undefined,
    });
    addBotMessage(
      `✅ Order placed! Your food is on its way to the kitchen.\n\n**Order for ${customerName} — Table ${tableNumber}**\n${cart.map((i) => `• ${i.quantity}× ${i.name}`).join("\n")}\n\n**Total: $${(total / 100).toFixed(2)}**\n\nWe'll let you know when it's ready! 🍽️`
    );
    setStep("placed");
    setShowCart(false);
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  function addToCart(item: { _id: Id<"menuItems">; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item._id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item._id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItemId: item._id, name: item.name, price: item.price, quantity: 1 }];
    });
  }

  function removeFromCart(id: Id<"menuItems">) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === id);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItemId === id ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter((c) => c.menuItemId !== id);
    });
  }

  const categories = menuItems
    ? CATEGORY_ORDER.filter((cat) => menuItems.some((m) => m.category === cat))
    : [];
  const categoryItems = menuItems?.filter((m) => m.category === selectedCategory) ?? [];

  return (
    <div className="min-h-screen bg-[#f0ead8] flex flex-col items-center">
      {/* Hero header */}
      <div
        className="w-full relative h-40 flex items-end justify-center pb-4"
        style={{
          backgroundImage: `url(https://hercules-cdn.com/file_WDWW5grUwdK2j4P7Qj6JmONx)`,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#f0ead8]" />
        <div className="relative text-center">
          <h1 className="font-serif text-3xl text-white font-bold tracking-wide drop-shadow-lg">
            Osteria Bella
          </h1>
          <p className="text-amber-100/90 text-sm font-light tracking-widest uppercase mt-0.5 drop-shadow">
            Order at your table
          </p>
        </div>
      </div>

      {/* Chat + Menu container */}
      <div className="w-full max-w-lg flex flex-col flex-1 px-4 pb-4 gap-3">

        {/* Loading placeholder — shown until first message arrives */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
              <UtensilsCrossed size={18} className="text-amber-600" />
            </div>
            <p className="text-[#b8a890] text-sm">Starting your session…</p>
          </div>
        )}
        {/* Chat messages */}
        <div className="flex flex-col gap-2 pt-2">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={cn("flex", msg.from === "customer" ? "justify-end" : "justify-start")}
              >
                {msg.from === "bot" && (
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center mr-2 mt-auto mb-1 shrink-0">
                    <UtensilsCrossed size={13} className="text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line",
                    msg.from === "bot"
                      ? "bg-[#faf6ed] text-[#2d2010] rounded-bl-sm border border-[#d8d0c0]"
                      : "bg-amber-500 text-white rounded-br-sm"
                  )}
                >
                  {msg.text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Menu browser (shown during menu/cart steps) */}
        {(step === "menu" || step === "notes" || step === "confirm") && !showCart && menuItems && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#faf6ed] rounded-2xl overflow-hidden border border-[#d8d0c0]"
          >
            {/* Category tabs */}
            <div className="flex overflow-x-auto gap-1 p-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer",
                    selectedCategory === cat
                      ? "bg-amber-500 text-white"
                      : "bg-[#ece6d6] text-[#6b5c42] hover:text-[#2d2010]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <Separator className="bg-[#d8d0c0]" />
            {/* Items */}
            <div className="divide-y divide-[#ece6d6] max-h-72 overflow-y-auto">
              {categoryItems.map((item) => {
                const inCart = cart.find((c) => c.menuItemId === item._id);
                return (
                  <div key={item._id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[#2d2010] font-semibold text-sm">{item.name}</div>
                      <div className="text-[#9a8a72] text-xs truncate">{item.description}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-amber-600 text-sm font-bold">
                        ${(item.price / 100).toFixed(2)}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="w-6 h-6 rounded-full bg-[#ece6d6] flex items-center justify-center cursor-pointer hover:bg-[#d8d0c0]"
                          >
                            <Minus size={11} className="text-[#6b5c42]" />
                          </button>
                          <span className="text-[#2d2010] text-sm w-4 text-center">{inCart.quantity}</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center cursor-pointer hover:bg-amber-400"
                          >
                            <Plus size={11} className="text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center cursor-pointer hover:bg-amber-400 transition-colors"
                        >
                          <Plus size={13} className="text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Cart panel */}
        <AnimatePresence>
          {showCart && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-[#faf6ed] rounded-2xl p-4 border border-[#d8d0c0]"
            >
              <h3 className="font-serif text-[#2d2010] font-semibold text-base mb-3">Your Order</h3>
              {cart.length === 0 ? (
                <p className="text-[#b8a890] text-sm text-center py-4">Your cart is empty</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {cart.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-2 text-sm">
                      <span className="text-[#2d2010] flex-1">{item.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removeFromCart(item.menuItemId)} className="cursor-pointer">
                          <Minus size={12} className="text-amber-600" />
                        </button>
                        <span className="text-[#2d2010] w-4 text-center">{item.quantity}</span>
                        <button onClick={() => addToCart({ _id: item.menuItemId, name: item.name, price: item.price })} className="cursor-pointer">
                          <Plus size={12} className="text-amber-600" />
                        </button>
                      </div>
                      <span className="text-amber-600 w-16 text-right font-medium">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.menuItemId !== item.menuItemId))} className="cursor-pointer ml-1">
                        <Trash2 size={13} className="text-[#b8a890] hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                  <Separator className="bg-[#d8d0c0] my-2" />
                  <div className="flex justify-between text-[#2d2010] font-bold">
                    <span>Total</span>
                    <span>${(cartTotal / 100).toFixed(2)}</span>
                  </div>
                </div>
              )}
              {/* Notes field */}
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="bg-[#ece6d6] border-[#d8d0c0] text-[#2d2010] placeholder:text-[#b8a890] text-sm mb-3"
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-[#6b5c42] hover:text-[#2d2010] hover:bg-[#ece6d6]"
                  onClick={() => setShowCart(false)}
                >
                  Add more
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-white font-semibold"
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0}
                >
                  Place Order 🍽️
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placed confirmation + live status */}
        {step === "placed" && existingOrder && (
          <LiveOrderStatus order={existingOrder} />
        )}

        {/* Input bar */}
        {(step === "name" || step === "table") && (
          <div className="flex gap-2 mt-auto">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={step === "name" ? "Your name..." : "Table number..."}
              className="bg-[#faf6ed] border-[#d8d0c0] text-[#2d2010] placeholder:text-[#b8a890]"
              autoFocus
            />
            <Button
              onClick={handleSend}
              className="bg-amber-500 hover:bg-amber-400 text-white shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>
        )}

        {/* Cart FAB (only during menu step) */}
        {step === "menu" && !showCart && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-amber-500 shadow-lg flex items-center justify-center cursor-pointer hover:bg-amber-400 transition-colors"
          >
            <ShoppingCart size={22} className="text-white" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0 rounded-full border-2 border-[#f0ead8]">
                {cartCount}
              </Badge>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
