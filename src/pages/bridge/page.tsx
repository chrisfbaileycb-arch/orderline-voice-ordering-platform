import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, CheckCircle2, AlertTriangle, Info, ChevronRight,
  Play, RotateCcw, Terminal, Cpu, PhoneCall, Copy, Check,
  MessageSquare, TestTube2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils.ts";
import { POS_MENU, normalizeText, findMatchingItem, findMatchingModifier } from "./_lib/pos-data.ts";
import { TEST_ORDERS } from "./_lib/test-orders.ts";
import ChatPanel from "./_components/ChatPanel.tsx";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogEntry = {
  ts: number;
  type: "info" | "success" | "warn" | "error";
  message: string;
};

type BridgeOrder = {
  _id: Id<"bridgeOrders">;
  orderId: string;
  customer: string;
  type: "pickup" | "delivery" | "dine-in";
  pickupTime?: string;
  phone?: string;
  items: { name: string; quantity: number; modifiers: string[] }[];
  status: "pending" | "processing" | "entered" | "error";
  agentLog: LogEntry[];
};

type TicketItem = {
  label: string;
  qty: number;
  price: number;
  modifiers: string[];
};

// ─── Order Manifest Pane ──────────────────────────────────────────────────────

function OrderManifest({ order }: { order: BridgeOrder | null }) {
  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
    processing: "bg-blue-500/20 text-blue-700 border-blue-500/30",
    entered: "bg-emerald-500/20 text-emerald-700 border-emerald-500/30",
    error: "bg-red-500/20 text-red-700 border-red-500/30",
  };

  return (
    <div className="flex flex-col h-full bg-[#f0ead8] border-r border-[#d8d0c0]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#d8d0c0] bg-[#faf6ed]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[#9a8a72] text-xs font-mono ml-2">order-manifest.json</span>
        {order && (
          <Badge className={cn("ml-auto text-xs border", statusColors[order.status])}>
            {order.status.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* JSON Display */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {order ? (
          <div id="order-manifest-pane" data-order-id={order.orderId}>
            <pre className="text-[#2d2010] whitespace-pre-wrap">
              {JSON.stringify({
                orderId: order.orderId,
                customer: order.customer,
                type: order.type,
                ...(order.pickupTime ? { pickupTime: order.pickupTime } : {}),
                ...(order.phone ? { phone: order.phone } : {}),
                items: order.items,
              }, null, 2)
                .split("\n")
                .map((line, i) => {
                  return (
                    <span key={i}>
                      {line.split(/("[^"]*"|\d+(?:\.\d+)?|\[|\]|\{|\}|,)/).map((part, j) => {
                        if (/^"/.test(part) && line.includes(part + ':')) return <span key={j} className="text-blue-600">{part}</span>;
                        if (/^"/.test(part)) return <span key={j} className="text-emerald-700">{part}</span>;
                        if (/^\d+/.test(part)) return <span key={j} className="text-orange-600">{part}</span>;
                        if (part === '[' || part === ']') return <span key={j} className="text-[#2d2010]">{part}</span>;
                        if (part === '{' || part === '}') return <span key={j} className="text-[#2d2010]">{part}</span>;
                        return <span key={j} className="text-[#9a8a72]">{part}</span>;
                      })}
                      {"\n"}
                    </span>
                  );
                })}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#b8a890]">
            <PhoneCall size={32} />
            <p className="text-sm text-center">Waiting for incoming order<br />from voice agent...</p>
          </div>
        )}
      </div>

      {/* Agent Log */}
      <div className="border-t border-[#d8d0c0] bg-[#faf6ed]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#cec6b4]">
          <Terminal size={12} className="text-[#9a8a72]" />
          <span className="text-[#9a8a72] text-xs font-mono">agent.log</span>
        </div>
        <div className="h-36 overflow-y-auto p-2 space-y-0.5">
          {order && order.agentLog.length > 0 ? (
            order.agentLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5 px-1">
                {entry.type === "success" && <CheckCircle2 size={11} className="text-green-600 mt-0.5 shrink-0" />}
                {entry.type === "warn" && <AlertTriangle size={11} className="text-yellow-600 mt-0.5 shrink-0" />}
                {entry.type === "error" && <AlertTriangle size={11} className="text-red-600 mt-0.5 shrink-0" />}
                {entry.type === "info" && <ChevronRight size={11} className="text-[#9a8a72] mt-0.5 shrink-0" />}
                <span className={cn("text-[10px] font-mono leading-relaxed", {
                  "text-green-700": entry.type === "success",
                  "text-yellow-700": entry.type === "warn",
                  "text-red-600": entry.type === "error",
                  "text-[#9a8a72]": entry.type === "info",
                })}>
                  {entry.message}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[#b8a890] text-[10px] font-mono px-1 pt-1">// agent idle</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── POS Terminal Pane ────────────────────────────────────────────────────────
// Intentionally kept dark — it simulates a real POS terminal UI

type POSTerminalProps = {
  highlightedItem: string | null;
  highlightedModifiers: string[];
  ticket: TicketItem[];
  onClear: () => void;
};

function POSTerminal({ highlightedItem, highlightedModifiers, ticket, onClear }: POSTerminalProps) {
  const [activeCategory, setActiveCategory] = useState(POS_MENU[0].id);
  const activeMenuCategory = POS_MENU.find((c) => c.id === activeCategory) ?? POS_MENU[0];
  const ticketTotal = ticket.reduce((sum, t) => sum + t.price * t.qty, 0);

  // Auto-switch category when agent highlights an item
  useEffect(() => {
    if (!highlightedItem) return;
    for (const cat of POS_MENU) {
      for (const item of cat.items) {
        if (normalizeText(item.label) === normalizeText(highlightedItem) ||
          normalizeText(item.label).includes(normalizeText(highlightedItem)) ||
          normalizeText(highlightedItem).includes(normalizeText(item.label))) {
          setActiveCategory(cat.id);
          return;
        }
      }
    }
  }, [highlightedItem]);

  return (
    <div className="flex flex-col h-full bg-[#1c2128] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#2d333b] border-b border-[#444c56]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">POS Terminal</span>
          <span className="text-xs text-[#8b949e] font-mono">v3.2.1</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#8b949e]">
          <Cpu size={12} />
          <span>Agent Connected</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu left */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Category tabs */}
          <div className="flex gap-1 p-2 bg-[#22272e] border-b border-[#444c56] overflow-x-auto">
            {POS_MENU.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors cursor-pointer",
                  activeCategory === cat.id
                    ? "bg-[#388bfd] text-white"
                    : "bg-[#2d333b] text-[#8b949e] hover:text-white hover:bg-[#373e47]"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
            {activeMenuCategory.items.map((item) => {
              const isHighlighted =
                highlightedItem &&
                (normalizeText(item.label) === normalizeText(highlightedItem) ||
                  normalizeText(item.label).includes(normalizeText(highlightedItem)) ||
                  normalizeText(highlightedItem).includes(normalizeText(item.label)));

              const isInTicket = ticket.some((t) => t.label === item.label);

              return (
                <motion.div
                  key={item.id}
                  animate={isHighlighted ? { scale: [1, 1.04, 1], boxShadow: ["0 0 0px rgba(56,139,253,0)", "0 0 16px rgba(56,139,253,0.8)", "0 0 4px rgba(56,139,253,0.4)"] } : {}}
                  transition={{ duration: 0.4 }}
                  data-pos-item={normalizeText(item.label)}
                  className={cn(
                    "pos-button relative flex flex-col items-start justify-between p-3 rounded-lg cursor-pointer transition-all border",
                    isHighlighted
                      ? "bg-[#388bfd]/20 border-[#388bfd] text-white"
                      : isInTicket
                      ? "bg-[#2ea043]/20 border-[#2ea043]/60 text-white"
                      : "bg-[#2d333b] border-[#444c56] text-[#cdd9e5] hover:border-[#539bf5] hover:bg-[#373e47]"
                  )}
                >
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                  <span className="text-[10px] text-[#8b949e] mt-1">${(item.price / 100).toFixed(2)}</span>
                  {isInTicket && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#2ea043] flex items-center justify-center">
                      <Check size={9} className="text-white" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Modifier row */}
          {activeMenuCategory.items[0]?.modifiers && highlightedItem && (
            <div className="border-t border-[#444c56] bg-[#22272e] p-2 max-h-28 overflow-y-auto">
              {activeMenuCategory.items
                .find((i) =>
                  normalizeText(i.label).includes(normalizeText(highlightedItem)) ||
                  normalizeText(highlightedItem).includes(normalizeText(i.label))
                )
                ?.modifiers?.map((group) => (
                  <div key={group.group} className="mb-1.5">
                    <div className="text-[9px] text-[#8b949e] uppercase tracking-wide mb-1">{group.group}</div>
                    <div className="flex flex-wrap gap-1">
                      {group.options.map((opt) => {
                        const isActive = highlightedModifiers.some(
                          (m) =>
                            normalizeText(m) === normalizeText(opt) ||
                            normalizeText(opt).includes(normalizeText(m))
                        );
                        return (
                          <motion.div
                            key={opt}
                            data-pos-modifier={normalizeText(opt)}
                            animate={isActive ? { scale: [1, 1.1, 1], backgroundColor: ["#388bfd33", "#388bfd66", "#388bfd33"] } : {}}
                            transition={{ duration: 0.35 }}
                            className={cn(
                              "pos-button px-2 py-0.5 rounded text-[10px] cursor-pointer border transition-colors",
                              isActive
                                ? "bg-[#388bfd]/30 border-[#388bfd] text-white"
                                : "bg-[#2d333b] border-[#444c56] text-[#8b949e] hover:border-[#539bf5] hover:text-white"
                            )}
                          >
                            {opt}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Ticket right */}
        <div className="w-48 flex flex-col border-l border-[#444c56] bg-[#22272e]">
          <div className="px-3 py-2 border-b border-[#444c56] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#cdd9e5]">Ticket</span>
            {ticket.length > 0 && (
              <button onClick={onClear} className="text-[#8b949e] hover:text-red-400 cursor-pointer">
                <RotateCcw size={11} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            <AnimatePresence>
              {ticket.map((t, i) => (
                <motion.div
                  key={`${t.label}-${i}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#2d333b] rounded p-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] font-semibold text-white leading-tight">{t.qty > 1 ? `${t.qty}× ` : ""}{t.label}</span>
                    <span className="text-[10px] text-[#8b949e] shrink-0">${((t.price * t.qty) / 100).toFixed(2)}</span>
                  </div>
                  {t.modifiers.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {t.modifiers.map((m, j) => (
                        <div key={j} className="text-[9px] text-[#388bfd]">+ {m}</div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {ticket.length === 0 && (
              <p className="text-[#484f58] text-[10px] text-center pt-4">Empty ticket</p>
            )}
          </div>
          {ticket.length > 0 && (
            <div className="border-t border-[#444c56] p-2 space-y-2">
              <div className="flex justify-between text-xs font-bold text-white">
                <span>Total</span>
                <span>${(ticketTotal / 100).toFixed(2)}</span>
              </div>
              <button className="w-full py-2 rounded bg-[#2ea043] hover:bg-[#3fb950] text-white text-xs font-bold cursor-pointer transition-colors">
                Send to Kitchen 🔥
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Bridge Page ─────────────────────────────────────────────────────────

export default function BridgePage() {
  const latestOrder = useQuery(api.bridge.getLatest, {}) as BridgeOrder | null | undefined;
  const pushOrder = useMutation(api.bridge.pushOrder);
  const appendLog = useMutation(api.bridge.appendLog);
  const updateStatus = useMutation(api.bridge.updateStatus);

  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [highlightedModifiers, setHighlightedModifiers] = useState<string[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [testOrderIdx, setTestOrderIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inputMode, setInputMode] = useState<"chat" | "test">("chat");
  const processedOrderRef = useRef<string | null>(null);

  const convexUrl = "https://vivid-corgi-575.convex.site";
  const endpointUrl = `${convexUrl}/api/order`;

  // Run the browser agent simulation when a new pending order arrives
  const runAgent = useCallback(
    async (order: BridgeOrder) => {
      if (isRunning) return;
      if (processedOrderRef.current === order.orderId) return;
      processedOrderRef.current = order.orderId;
      setIsRunning(true);
      setTicket([]);
      setHighlightedItem(null);
      setHighlightedModifiers([]);

      const log = async (type: LogEntry["type"], message: string) => {
        await appendLog({ bridgeOrderId: order._id, entry: { ts: Date.now(), type, message } });
      };

      await updateStatus({ bridgeOrderId: order._id, status: "processing" });
      await log("info", `🚀 Agent Bridge initialized for order ${order.orderId}`);
      await log("info", `👤 Customer: ${order.customer} | Type: ${order.type}`);
      await new Promise((r) => setTimeout(r, 400));

      let anyError = false;

      for (const orderItem of order.items) {
        await log("info", `🔍 Matching: "${orderItem.name}" (qty: ${orderItem.quantity})`);
        await new Promise((r) => setTimeout(r, 300));

        const match = findMatchingItem(orderItem.name);
        if (!match) {
          await log("warn", `⚠️ No POS button found for "${orderItem.name}" — skipping`);
          anyError = true;
          continue;
        }

        setHighlightedItem(match.item.label);
        await log("success", `✅ Found: "${match.item.label}" in ${match.category.label}`);
        await new Promise((r) => setTimeout(r, 500));

        // Find modifiers
        const resolvedMods: string[] = [];
        for (const mod of orderItem.modifiers) {
          const foundMod = findMatchingModifier(mod, match.item);
          if (foundMod) {
            resolvedMods.push(foundMod);
            await log("success", `  ➕ Modifier: "${foundMod}"`);
          } else {
            await log("warn", `  ⚠️ Modifier "${mod}" not found on POS — skipping`);
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        setHighlightedModifiers(resolvedMods);
        await new Promise((r) => setTimeout(r, 600));

        // Add to ticket
        setTicket((prev) => {
          const existing = prev.find((t) => t.label === match.item.label);
          if (existing) {
            return prev.map((t) =>
              t.label === match.item.label
                ? { ...t, qty: t.qty + orderItem.quantity, modifiers: resolvedMods }
                : t
            );
          }
          return [
            ...prev,
            {
              label: match.item.label,
              qty: orderItem.quantity,
              price: match.item.price,
              modifiers: resolvedMods,
            },
          ];
        });

        await log("info", `  📋 Added to ticket × ${orderItem.quantity}`);
        await new Promise((r) => setTimeout(r, 350));

        setHighlightedItem(null);
        setHighlightedModifiers([]);
      }

      await log("info", `🔥 Ready to send to kitchen`);
      await updateStatus({
        bridgeOrderId: order._id,
        status: anyError ? "error" : "entered",
      });
      await log(anyError ? "warn" : "success", anyError ? "⚠️ Order entered with warnings" : "✅ Order fully entered — awaiting kitchen send");
      setIsRunning(false);
    },
    [isRunning, appendLog, updateStatus]
  );

  // Watch for new pending orders
  useEffect(() => {
    if (!latestOrder) return;
    if (latestOrder.status === "pending" && processedOrderRef.current !== latestOrder.orderId) {
      runAgent(latestOrder);
    }
  }, [latestOrder, runAgent]);

  // Recover local ticket state from entered order
  useEffect(() => {
    if (!latestOrder || latestOrder.status !== "entered") return;
    if (ticket.length === 0 && latestOrder.items.length > 0) {
      const recoveredTicket: TicketItem[] = [];
      for (const item of latestOrder.items) {
        const match = findMatchingItem(item.name);
        if (match) {
          const resolvedMods = item.modifiers
            .map((m) => findMatchingModifier(m, match.item))
            .filter((m): m is string => m !== null);
          recoveredTicket.push({ label: match.item.label, qty: item.quantity, price: match.item.price, modifiers: resolvedMods });
        }
      }
      setTicket(recoveredTicket);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestOrder?._id]);

  async function fireTestOrder() {
    const order = { ...TEST_ORDERS[testOrderIdx % TEST_ORDERS.length], orderId: `ORD-TEST-${Date.now()}` };
    setTestOrderIdx((i) => i + 1);
    setTicket([]);
    processedOrderRef.current = null;
    await pushOrder(order);
  }

  function handleCopyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const order = latestOrder ?? null;

  // Mobile pane switcher state
  const [mobilePane, setMobilePane] = useState<"chat" | "manifest" | "pos">("chat");

  return (
    <div className="flex flex-col h-screen bg-[#f0ead8] text-[#2d2010] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#faf6ed] border-b border-[#d8d0c0] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Zap size={13} className="text-emerald-600" />
            </div>
            <span className="font-semibold text-sm text-[#2d2010]">AI POS Bridge</span>
          </div>
          <Separator orientation="vertical" className="h-4 bg-[#d8d0c0]" />
          <span className="text-[#9a8a72] text-xs hidden md:inline">Browser Agent — Zero API Certification</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Input mode toggle */}
          <div className="flex items-center bg-[#ece6d6] border border-[#d8d0c0] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setInputMode("chat")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                inputMode === "chat"
                  ? "bg-[#faf6ed] text-emerald-700 border border-emerald-500/30 shadow-sm"
                  : "text-[#9a8a72] hover:text-[#2d2010]"
              )}
            >
              <MessageSquare size={11} />
              <span className="hidden sm:inline">AI Chat</span>
            </button>
            <button
              onClick={() => setInputMode("test")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                inputMode === "test"
                  ? "bg-[#faf6ed] text-emerald-700 border border-emerald-500/30 shadow-sm"
                  : "text-[#9a8a72] hover:text-[#2d2010]"
              )}
            >
              <TestTube2 size={11} />
              <span className="hidden sm:inline">Test</span>
            </button>
          </div>

          {/* Endpoint badge */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#ece6d6] border border-[#d8d0c0] rounded px-2 py-1">
            <Info size={11} className="text-[#9a8a72]" />
            <code className="text-[10px] text-[#9a8a72] font-mono">{endpointUrl}</code>
            <button onClick={handleCopyEndpoint} className="cursor-pointer hover:text-[#2d2010] text-[#9a8a72] transition-colors">
              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
            </button>
          </div>

          {inputMode === "test" && (
            <Button
              onClick={fireTestOrder}
              disabled={isRunning}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-7 px-3"
            >
              <Play size={11} />
              {isRunning ? "Running..." : "Fire Test"}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile tab bar — only visible on small screens */}
      <div className="md:hidden flex shrink-0 bg-[#faf6ed] border-b border-[#d8d0c0]">
        {(["chat", "manifest", "pos"] as const).map((pane) => {
          const labels = { chat: "Chat", manifest: "Order", pos: "POS" };
          const icons = { chat: <MessageSquare size={13} />, manifest: <Info size={13} />, pos: <Cpu size={13} /> };
          return (
            <button
              key={pane}
              onClick={() => setMobilePane(pane)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                mobilePane === pane
                  ? "text-emerald-700 border-b-2 border-emerald-600"
                  : "text-[#9a8a72] hover:text-[#2d2010]"
              )}
            >
              {icons[pane]}
              {labels[pane]}
            </button>
          );
        })}
      </div>

      {/* Three-pane layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — AI Chat OR test controls */}
        <div className={cn(
          "flex-col overflow-hidden border-r border-[#d8d0c0]",
          "md:flex md:w-[28%] md:min-w-[220px]",
          mobilePane === "chat" ? "flex flex-1" : "hidden"
        )}>
          {inputMode === "chat" ? (
            <ChatPanel
              onOrderParsed={(_parsedOrder) => {
                // Reset so the agent picks up the newly pushed order fresh
                processedOrderRef.current = null;
                setTicket([]);
              }}
            />
          ) : (
            <div className="flex flex-col h-full bg-[#f0ead8] items-center justify-center gap-4 p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <TestTube2 size={22} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[#2d2010] font-semibold text-sm mb-1">Test Mode</p>
                <p className="text-[#9a8a72] text-xs leading-relaxed">
                  Fire pre-built test orders to watch the bridge agent in action without AI parsing.
                </p>
              </div>
              <Button
                onClick={fireTestOrder}
                disabled={isRunning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm gap-2 w-full"
              >
                <Play size={14} />
                {isRunning ? "Agent Running..." : "Fire Test Order"}
              </Button>
              <p className="text-[#b8a890] text-[10px]">Cycles through {TEST_ORDERS.length} pre-built orders</p>
            </div>
          )}
        </div>

        {/* Middle — Order Manifest */}
        <div className={cn(
          "flex-col overflow-hidden",
          "md:flex md:w-[36%]",
          mobilePane === "manifest" ? "flex flex-1" : "hidden"
        )}>
          <OrderManifest order={order as BridgeOrder | null} />
        </div>

        {/* Divider with agent status — desktop only */}
        <div className="hidden md:flex w-px bg-[#d8d0c0] relative items-center justify-center">
          <motion.div
            animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.5 }}
            transition={isRunning ? { duration: 1.2, repeat: Infinity } : {}}
            className="absolute w-6 h-6 rounded-full bg-[#faf6ed] border border-emerald-500 flex items-center justify-center z-10"
          >
            <Cpu size={12} className={isRunning ? "text-emerald-600" : "text-[#b8a890]"} />
          </motion.div>
        </div>

        {/* Right — POS Terminal (intentionally dark) */}
        <div className={cn(
          "flex-col overflow-hidden",
          "md:flex md:flex-1",
          mobilePane === "pos" ? "flex flex-1" : "hidden"
        )}>
          <POSTerminal
            highlightedItem={highlightedItem}
            highlightedModifiers={highlightedModifiers}
            ticket={ticket}
            onClear={() => setTicket([])}
          />
        </div>
      </div>
    </div>
  );
}
