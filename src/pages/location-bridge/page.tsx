import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap, CheckCircle2, AlertTriangle, Info, ChevronRight,
  Play, RotateCcw, Terminal, Cpu, PhoneCall, Copy, Check,
  ExternalLink, Globe, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils.ts";
import { POS_MENU, normalizeText, findMatchingItem, findMatchingModifier } from "../bridge/_lib/pos-data.ts";

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

function OrderManifest({ order, locationName }: { order: BridgeOrder | null; locationName: string }) {
  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    processing: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    entered: "bg-green-500/20 text-green-300 border-green-500/30",
    error: "bg-red-500/20 text-red-300 border-red-500/30",
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-r border-[#30363d]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[#8b949e] text-xs font-mono ml-2">order-manifest — {locationName}</span>
        {order && (
          <Badge className={cn("ml-auto text-xs border", statusColors[order.status])}>
            {order.status.toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed">
        {order ? (
          <div id="order-manifest-pane" data-order-id={order.orderId}>
            <pre className="text-[#e6edf3] whitespace-pre-wrap">
              {JSON.stringify({
                orderId: order.orderId,
                customer: order.customer,
                type: order.type,
                ...(order.pickupTime ? { pickupTime: order.pickupTime } : {}),
                ...(order.phone ? { phone: order.phone } : {}),
                items: order.items,
              }, null, 2)
                .split("\n")
                .map((line, i) => (
                  <span key={i}>
                    {line.split(/("[^"]*"|\d+(?:\.\d+)?|\[|\]|\{|\}|,)/).map((part, j) => {
                      if (/^"/.test(part) && line.includes(part + ":")) return <span key={j} className="text-[#79c0ff]">{part}</span>;
                      if (/^"/.test(part)) return <span key={j} className="text-[#a5d6ff]">{part}</span>;
                      if (/^\d+/.test(part)) return <span key={j} className="text-[#f78166]">{part}</span>;
                      return <span key={j} className="text-[#8b949e]">{part}</span>;
                    })}
                    {"\n"}
                  </span>
                ))}
            </pre>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#484f58]">
            <PhoneCall size={32} />
            <p className="text-sm text-center">Waiting for phone order<br />from {locationName}...</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262d]">
          <Terminal size={12} className="text-[#8b949e]" />
          <span className="text-[#8b949e] text-xs font-mono">agent.log</span>
        </div>
        <div className="h-32 overflow-y-auto p-2 space-y-0.5">
          {order && order.agentLog.length > 0 ? (
            order.agentLog.map((entry, i) => (
              <div key={i} className="flex items-start gap-2 py-0.5 px-1">
                {entry.type === "success" && <CheckCircle2 size={11} className="text-green-400 mt-0.5 shrink-0" />}
                {entry.type === "warn" && <AlertTriangle size={11} className="text-yellow-400 mt-0.5 shrink-0" />}
                {entry.type === "error" && <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />}
                {entry.type === "info" && <ChevronRight size={11} className="text-[#8b949e] mt-0.5 shrink-0" />}
                <span className={cn("text-[10px] font-mono leading-relaxed", {
                  "text-green-400": entry.type === "success",
                  "text-yellow-300": entry.type === "warn",
                  "text-red-400": entry.type === "error",
                  "text-[#8b949e]": entry.type === "info",
                })}>
                  {entry.message}
                </span>
              </div>
            ))
          ) : (
            <p className="text-[#484f58] text-[10px] font-mono px-1 pt-1">// agent idle</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── POS Pane ─────────────────────────────────────────────────────────────────

function POSPane({
  posUrl,
  locationName,
  highlightedItem,
  ticket,
}: {
  posUrl: string | null;
  locationName: string;
  highlightedItem: string | null;
  ticket: TicketItem[];
}) {
  const [editingUrl, setEditingUrl] = useState(false);
  const [inputUrl, setInputUrl] = useState(posUrl ?? "");

  const ticketTotal = ticket.reduce((sum, t) => sum + t.price * t.qty, 0);

  if (!posUrl || editingUrl) {
    return (
      <div className="flex flex-col h-full bg-[#1c2128] items-center justify-center p-8 gap-5">
        <div className="w-12 h-12 rounded-xl bg-[#388bfd]/15 border border-[#388bfd]/30 flex items-center justify-center">
          <Globe size={22} className="text-[#388bfd]" />
        </div>
        <div className="text-center">
          <h3 className="text-white font-semibold mb-1">POS Online Order URL</h3>
          <p className="text-[#8b949e] text-sm max-w-xs">
            Paste the URL of {locationName}'s online order page. The browser agent will enter orders here in real time.
          </p>
        </div>
        <div className="flex gap-2 w-full max-w-sm">
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://order.toasttab.com/..."
            className="bg-[#0d1117] border-[#444c56] text-white text-sm font-mono"
          />
          <Button
            onClick={() => setEditingUrl(false)}
            className="bg-[#388bfd] hover:bg-[#58a6ff] text-white shrink-0"
            disabled={!inputUrl}
          >
            Load
          </Button>
        </div>
        <p className="text-[#484f58] text-xs text-center max-w-xs">
          Note: some POS systems block iframe embedding (X-Frame-Options). In production, the browser agent runs as a Chrome extension or Playwright session with full access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1c2128]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#2d333b] border-b border-[#444c56] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{locationName} — POS</span>
        </div>
        <div className="flex items-center gap-2">
          {highlightedItem && (
            <div className="flex items-center gap-1.5 bg-[#388bfd]/20 border border-[#388bfd]/40 rounded-full px-2 py-0.5 text-xs text-[#388bfd] font-mono">
              <Cpu size={10} className="animate-pulse" />
              Entering: {highlightedItem}
            </div>
          )}
          <button onClick={() => setEditingUrl(true)} className="text-[#8b949e] hover:text-white cursor-pointer transition-colors">
            <Settings size={14} />
          </button>
          <a href={posUrl} target="_blank" rel="noreferrer" className="text-[#8b949e] hover:text-[#388bfd] cursor-pointer transition-colors">
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Iframe */}
      <div className="flex flex-1 overflow-hidden relative">
        <iframe
          src={posUrl}
          title={`${locationName} POS`}
          className="flex-1 w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {/* Ticket overlay — top right corner */}
        {ticket.length > 0 && (
          <div className="absolute top-3 right-3 bg-[#1c2128]/95 border border-[#444c56] rounded-xl p-3 min-w-[160px] shadow-xl">
            <div className="text-[10px] text-[#8b949e] font-mono mb-2">// entered by agent</div>
            <div className="space-y-1.5">
              <AnimatePresence>
                {ticket.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="text-xs">
                    <div className="text-white font-medium">{t.qty > 1 ? `${t.qty}× ` : ""}{t.label}</div>
                    {t.modifiers.map((m, j) => (
                      <div key={j} className="text-[#388bfd] text-[10px] ml-2">+ {m}</div>
                    ))}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <Separator className="bg-[#444c56] my-2" />
            <div className="flex justify-between text-xs font-bold text-white">
              <span>Total</span>
              <span>${(ticketTotal / 100).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Per-Location Bridge Page ───────────────────────────────────────────

export default function LocationBridgePage() {
  const { locationId = "charlies-demo" } = useParams<{ locationId: string }>();
  const location = useQuery(api.locations.get, { locationId });
  const latestOrder = useQuery(api.bridge.getLatest, {}) as BridgeOrder | null | undefined;
  const appendLog = useMutation(api.bridge.appendLog);
  const updateStatus = useMutation(api.bridge.updateStatus);

  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [highlightedModifiers, setHighlightedModifiers] = useState<string[]>([]);
  const [ticket, setTicket] = useState<TicketItem[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const processedOrderRef = useRef<string | null>(null);

  const posUrl = location?.posOnlineOrderUrl ?? null;
  const locationName = location?.name ?? locationId;
  const convexUrl = "https://vivid-corgi-575.convex.site";
  const endpointUrl = `${convexUrl}/api/order`;

  // Run the browser agent simulation
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
      await log("info", `🚀 Agent started for ${locationName} — order ${order.orderId}`);
      await log("info", `👤 ${order.customer} | ${order.type}`);
      await new Promise((r) => setTimeout(r, 400));

      let anyError = false;

      for (const orderItem of order.items) {
        await log("info", `🔍 Matching: "${orderItem.name}"`);
        await new Promise((r) => setTimeout(r, 300));

        const match = findMatchingItem(orderItem.name);
        if (!match) {
          await log("warn", `⚠️ No match for "${orderItem.name}" — skipping`);
          anyError = true;
          continue;
        }

        setHighlightedItem(match.item.label);
        await log("success", `✅ Matched: "${match.item.label}"`);
        await new Promise((r) => setTimeout(r, 500));

        const resolvedMods: string[] = [];
        for (const mod of orderItem.modifiers) {
          const found = findMatchingModifier(mod, match.item);
          if (found) {
            resolvedMods.push(found);
            await log("success", `  ➕ ${found}`);
          } else {
            await log("warn", `  ⚠️ Modifier "${mod}" not found`);
          }
          await new Promise((r) => setTimeout(r, 180));
        }

        setHighlightedModifiers(resolvedMods);
        await new Promise((r) => setTimeout(r, 600));

        setTicket((prev) => {
          const existing = prev.find((t) => t.label === match.item.label);
          if (existing) {
            return prev.map((t) => t.label === match.item.label ? { ...t, qty: t.qty + orderItem.quantity, modifiers: resolvedMods } : t);
          }
          return [...prev, { label: match.item.label, qty: orderItem.quantity, price: match.item.price, modifiers: resolvedMods }];
        });

        await log("info", `📋 Added to ticket ×${orderItem.quantity}`);
        await new Promise((r) => setTimeout(r, 300));
        setHighlightedItem(null);
        setHighlightedModifiers([]);
      }

      await log("info", "🔥 Ready — awaiting kitchen send");
      await updateStatus({ bridgeOrderId: order._id, status: anyError ? "error" : "entered" });
      await log(anyError ? "warn" : "success", anyError ? "⚠️ Entered with warnings" : "✅ Order fully entered");
      setIsRunning(false);
    },
    [isRunning, appendLog, updateStatus, locationName]
  );

  useEffect(() => {
    if (!latestOrder) return;
    if (latestOrder.status === "pending" && processedOrderRef.current !== latestOrder.orderId) {
      runAgent(latestOrder);
    }
  }, [latestOrder, runAgent]);

  // Recover ticket from entered order
  useEffect(() => {
    if (!latestOrder || latestOrder.status !== "entered") return;
    if (ticket.length === 0 && latestOrder.items.length > 0) {
      const recovered: TicketItem[] = [];
      for (const item of latestOrder.items) {
        const match = findMatchingItem(item.name);
        if (match) {
          const mods = item.modifiers.map((m) => findMatchingModifier(m, match.item)).filter((m): m is string => m !== null);
          recovered.push({ label: match.item.label, qty: item.quantity, price: match.item.price, modifiers: mods });
        }
      }
      setTicket(recovered);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestOrder?._id]);

  function handleCopyEndpoint() {
    navigator.clipboard.writeText(endpointUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const order = latestOrder ?? null;

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/bridge" className="text-[#8b949e] hover:text-white transition-colors">
            <Zap size={14} />
          </Link>
          <Separator orientation="vertical" className="h-4 bg-[#30363d]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-semibold text-sm">{locationName}</span>
          </div>
          <Badge className="bg-[#388bfd]/20 text-[#388bfd] border-[#388bfd]/30 text-[10px]">
            Per-Location Bridge
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1.5 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1">
            <Info size={11} className="text-[#8b949e]" />
            <code className="text-[10px] text-[#8b949e] font-mono">{endpointUrl}</code>
            <button onClick={handleCopyEndpoint} className="cursor-pointer hover:text-white text-[#8b949e]">
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            </button>
          </div>
          <Badge className={cn("text-xs border", isRunning ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-white/5 text-white/40 border-white/10")}>
            {isRunning ? "Agent Running..." : "Agent Idle"}
          </Badge>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Order Manifest */}
        <div className="w-[38%] flex flex-col overflow-hidden">
          <OrderManifest order={order as BridgeOrder | null} locationName={locationName} />
        </div>

        {/* Divider */}
        <div className="w-px bg-[#30363d] relative flex items-center justify-center">
          <motion.div
            animate={isRunning ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.5 }}
            transition={isRunning ? { duration: 1.2, repeat: Infinity } : {}}
            className="absolute w-6 h-6 rounded-full bg-[#0d1117] border border-[#388bfd] flex items-center justify-center z-10"
          >
            <Cpu size={12} className={isRunning ? "text-[#388bfd]" : "text-[#484f58]"} />
          </motion.div>
        </div>

        {/* Right — POS Online Order Page */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <POSPane
            posUrl={posUrl ?? null}
            locationName={locationName}
            highlightedItem={highlightedItem}
            ticket={ticket}
          />
        </div>
      </div>
    </div>
  );
}
