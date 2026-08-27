import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  ChefHat, Clock, CheckCircle2, Bell, BellRing,
  ArrowRight, UtensilsCrossed, RefreshCw, Circle,
  Check, Flame, Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Order = Doc<"orders">;
type Status = Order["status"];

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { status: Status; label: string; icon: React.ElementType; color: string; ring: string; bg: string }[] = [
  {
    status: "new",
    label: "New",
    icon: Bell,
    color: "text-yellow-400",
    ring: "ring-yellow-500/40",
    bg: "bg-yellow-500/10 border-yellow-500/30",
  },
  {
    status: "confirmed",
    label: "Confirmed",
    icon: Circle,
    color: "text-blue-400",
    ring: "ring-blue-500/40",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  {
    status: "preparing",
    label: "Preparing",
    icon: Flame,
    color: "text-orange-400",
    ring: "ring-orange-500/40",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
  {
    status: "ready",
    label: "Ready",
    icon: Package,
    color: "text-green-400",
    ring: "ring-green-500/40",
    bg: "bg-green-500/10 border-green-500/30",
  },
  {
    status: "done",
    label: "Done",
    icon: CheckCircle2,
    color: "text-[#9a8a72]",
    ring: "ring-black/10",
    bg: "bg-black/4 border-black/10",
  },
];

const NEXT_STATUS: Partial<Record<Status, Status>> = {
  new: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "done",
};

const PREV_STATUS: Partial<Record<Status, Status>> = {
  confirmed: "new",
  preparing: "confirmed",
  ready: "preparing",
  done: "ready",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function elapsedLabel(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function urgencyColor(ts: number, status: Status) {
  if (status === "done") return "";
  const mins = (Date.now() - ts) / 60000;
  if (mins > 20) return "border-red-500/60 ring-1 ring-red-500/30";
  if (mins > 10) return "border-yellow-500/50";
  return "";
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, col }: { order: Order; col: (typeof COLUMNS)[0] }) {
  const updateStatus = useMutation(api.orders.updateStatus);
  const [moving, setMoving] = useState(false);

  const next = NEXT_STATUS[order.status];
  const prev = PREV_STATUS[order.status];

  async function move(status: Status) {
    setMoving(true);
    await updateStatus({ orderId: order._id, status });
    setMoving(false);
  }

  const elapsed = elapsedLabel(order._creationTime);
  const urgency = urgencyColor(order._creationTime, order.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "bg-[#faf6ed] border rounded-xl overflow-hidden select-none",
        col.ring && `ring-1 ${col.ring}`,
        urgency,
        order.status === "done" && "opacity-50"
      )}
    >
      {/* Card header */}
      <div className={cn("flex items-center justify-between px-3 py-2 border-b border-[#d8d0c0]", order.status !== "done" && col.bg)}>
        <div className="flex items-center gap-2">
          <span className="text-[#2d2010] font-bold text-sm">T{order.tableNumber}</span>
          <span className="text-[#6b5c42] text-xs">·</span>
          <span className="text-[#2d2010] text-xs font-medium truncate max-w-[90px]">{order.customerName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={10} className="text-[#6b5c42]" />
          <span className="text-[10px] text-[#6b5c42] font-mono">{elapsed}</span>
        </div>
      </div>

      {/* Items */}
      <div className="px-3 py-2.5 space-y-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[#6b5c42] text-xs shrink-0">×{item.quantity}</span>
              <span className="text-[#2d2010] text-xs truncate">{item.name}</span>
            </div>
            <span className="text-[#6b5c42] text-[10px] shrink-0">{formatCents(item.price * item.quantity)}</span>
          </div>
        ))}

        {order.notes && (
          <div className="mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1.5">
            <p className="text-yellow-300 text-[10px] leading-relaxed">📝 {order.notes}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[#d8d0c0] gap-2">
        <span className="text-[#9a8a72] text-[10px] font-mono">{formatCents(order.totalCents)}</span>

        <div className="flex items-center gap-1.5">
          {prev && (
            <button
              onClick={() => move(prev)}
              disabled={moving}
              className="text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#cec6b4] hover:border-[#6b5c42] rounded-md px-2 py-0.5 transition-all cursor-pointer disabled:opacity-40"
            >
              ← Back
            </button>
          )}
          {next && (
            <button
              onClick={() => move(next)}
              disabled={moving}
              className={cn(
                "text-[10px] font-semibold px-2.5 py-0.5 rounded-md transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1",
                order.status === "ready"
                  ? "bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                  : order.status === "new"
                  ? "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/30"
                  : "bg-[#388bfd]/20 hover:bg-[#388bfd]/30 text-[#388bfd] border border-[#388bfd]/30"
              )}
            >
              {order.status === "new" ? "Confirm" :
               order.status === "confirmed" ? "Start" :
               order.status === "preparing" ? "Ready" : "Done"}
              <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function KitchenColumn({ col, orders }: { col: (typeof COLUMNS)[0]; orders: Order[] }) {
  const Icon = col.icon;
  return (
    <div className="flex flex-col min-w-[220px] max-w-[260px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon size={14} className={col.color} />
        <span className="text-sm font-semibold text-[#2d2010]">{col.label}</span>
        {orders.length > 0 && (
          <Badge className={cn("ml-auto border text-[10px] px-1.5 py-0", col.bg, col.color)}>
            {orders.length}
          </Badge>
        )}
      </div>

      {/* Drop zone */}
      <div className="flex-1 space-y-3 min-h-[80px]">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border border-dashed border-[#cec6b4] rounded-xl h-20 flex items-center justify-center"
            >
              <span className="text-[#9a8a72] text-xs">No orders</span>
            </motion.div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order._id} order={order} col={col} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── New Order Alert Sound ────────────────────────────────────────────────────

function useNewOrderAlert(orders: Order[] | undefined) {
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [alerting, setAlerting] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function playAlert() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      // Three quick ascending beeps
      [0, 0.18, 0.36].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880 + i * 220;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + 0.14);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    } catch {
      // audio not available
    }
  }

  useEffect(() => {
    if (!orders) return;
    const newOrders = orders.filter((o) => o.status === "new");
    const currentIds = new Set(newOrders.map((o) => o._id));
    const added = newOrders.filter((o) => !prevIdsRef.current.has(o._id));
    if (added.length > 0 && prevIdsRef.current.size > 0) {
      playAlert();
      setAlerting(true);
      setTimeout(() => setAlerting(false), 3000);
    }
    prevIdsRef.current = currentIds;
  }, [orders]);

  return alerting;
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

const KITCHEN_PIN = "1234";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  function handleKey(digit: string) {
    if (pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === KITCHEN_PIN) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 700);
      }
    }
  }

  function handleClear() { setPin(""); setError(false); }

  return (
    <div className="min-h-screen bg-[#f5ead4] flex flex-col">
      {/* Kitchen banner */}
      <div className="bg-orange-500/20 border-b border-orange-500/30 text-orange-300 py-2 px-6 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
        <ChefHat size={14} />
        Kitchen Access
      </div>

      <div className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-6 w-full max-w-xs px-6"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mb-1">
              <ChefHat size={26} className="text-orange-400" />
            </div>
            <h1 className="text-xl font-bold text-[#2d2010]">Kitchen Dashboard</h1>
            <p className="text-orange-400/70 text-xs text-center">Staff PIN required</p>
          </div>

          {/* PIN dots */}
          <div className={cn("flex gap-3 transition-all", error && "animate-pulse")}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "w-5 h-5 rounded-full border-2 transition-all",
                  i < pin.length
                    ? error
                      ? "bg-red-500 border-red-500"
                      : "bg-orange-400 border-orange-400"
                    : "border-[#cec6b4] bg-transparent"
                )}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => (
              <button
                key={k}
                onClick={() => k === "⌫" ? handleClear() : k !== "" ? handleKey(k) : undefined}
                disabled={k === ""}
                className={cn(
                  "h-14 rounded-xl text-lg font-semibold transition-all cursor-pointer",
                  k === ""
                    ? "opacity-0 pointer-events-none"
                    : k === "⌫"
                    ? "bg-[#ece6d6] hover:bg-[#e0d8c8] text-[#6b5c42] border border-[#cec6b4] active:scale-95"
                    : "bg-[#f0d5a8] hover:bg-[#e8c890] text-[#3d1f00] border border-orange-400/50 active:scale-95"
                )}
              >
                {k}
              </button>
            ))}
          </div>

          <p className="text-[#9a8a72] text-xs">Demo PIN: 1234</p>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Main Kitchen Dashboard ───────────────────────────────────────────────────

export default function KitchenPage() {
  const [unlocked, setUnlocked] = useState(() => {
    return sessionStorage.getItem("kitchen_unlocked") === "true";
  });

  function handleUnlock() {
    sessionStorage.setItem("kitchen_unlocked", "true");
    setUnlocked(true);
  }

  if (!unlocked) return <PinGate onUnlock={handleUnlock} />;

  return <KitchenDashboard />;
}

function KitchenDashboard() {
  const orders = useQuery(api.orders.listAll);
  const alerting = useNewOrderAlert(orders);
  const [showDone, setShowDone] = useState(false);

  const grouped = COLUMNS.reduce<Record<Status, Order[]>>((acc, col) => {
    acc[col.status] = [];
    return acc;
  }, {} as Record<Status, Order[]>);

  if (orders) {
    for (const order of orders) {
      if (grouped[order.status]) grouped[order.status].push(order);
    }
  }

  const activeColumns = showDone ? COLUMNS : COLUMNS.filter((c) => c.status !== "done");
  const totalActive = (orders ?? []).filter((o) => o.status !== "done").length;
  const newCount = grouped["new"]?.length ?? 0;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010] flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "sticky top-0 z-20 border-b transition-colors duration-300",
          alerting
            ? "bg-yellow-500/10 border-yellow-500/30"
            : "bg-[#faf6ed] border-[#d8d0c0]"
        )}
      >
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
              alerting ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-orange-500/15 border border-orange-500/30"
            )}>
              {alerting
                ? <BellRing size={17} className="text-yellow-400 animate-bounce" />
                : <ChefHat size={17} className="text-orange-400" />}
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#2d2010] leading-tight">
                {alerting ? "New Order!" : "Kitchen Dashboard"}
              </h1>
              <p className="text-[10px] text-[#6b5c42]">Osteria Bella · Live orders</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {newCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-3 py-1.5 text-xs font-bold text-yellow-300"
              >
                <BellRing size={11} className="animate-pulse" />
                {newCount} new
              </motion.div>
            )}
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold",
              totalActive > 0
                ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
                : "bg-black/4 border-black/10 text-[#9a8a72]"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", totalActive > 0 ? "bg-orange-400 animate-pulse" : "bg-black/20")} />
              {totalActive} active
            </div>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-[#6b5c42] hover:text-[#2d2010] text-[10px] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              {showDone ? "Hide Done" : "Show Done"}
            </button>
            <button
              onClick={() => { sessionStorage.removeItem("kitchen_unlocked"); window.location.reload(); }}
              className="text-[#9a8a72] hover:text-[#6b5c42] text-[10px] cursor-pointer transition-colors"
            >
              Lock
            </button>
          </div>
        </div>
      </div>

      {/* Columns */}
      {!orders ? (
        <div className="flex items-center justify-center flex-1 gap-2 text-[#9a8a72]">
          <RefreshCw size={16} className="animate-spin" />
          <span className="text-sm">Loading orders...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 min-w-fit">
            {activeColumns.map((col) => (
              <KitchenColumn key={col.status} col={col} orders={grouped[col.status] ?? []} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no active orders */}
      {orders && orders.filter((o) => o.status !== "done").length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <UtensilsCrossed size={36} className="text-[#d8d0c0]" />
          <p className="text-[#9a8a72] text-sm">All caught up — no active orders</p>
          <p className="text-[#b8a890] text-xs">New orders from <span className="font-mono">/order</span> appear here in real time</p>
        </div>
      )}
    </div>
  );
}
