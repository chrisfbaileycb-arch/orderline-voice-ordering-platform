import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Phone, PhoneForwarded, PhoneOff, Bot, Clock,
  Bell, BellRing, CheckCircle2, ChevronRight,
  Wifi, RefreshCw, Settings, AlertTriangle,
  UtensilsCrossed, ChefHat, MessageSquare, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

type CallSession = Doc<"callSessions">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(startedAt: number) {
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STEP_LABELS: Record<string, string> = {
  greeting: "Greeting",
  pickup_or_delivery: "Pickup or delivery?",
  pickup: "Chose pickup",
  delivery: "Chose delivery",
  delivery_sms_sent: "Delivery SMS sent",
  delivery_no_sms: "Declined SMS",
  ai_ordering: "AI taking order...",
  order_captured: "Order captured",
  automated_or_hold: "Automated or hold?",
  holding: "On hold",
  forwarding_to_staff: "Forwarding to you",
  completed: "Completed",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active: { label: "Active", color: "bg-blue-500/20 text-blue-300 border-blue-500/40", icon: Phone },
  holding: { label: "Holding", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", icon: Clock },
  ai_ordering: { label: "AI Ordering", color: "bg-purple-500/20 text-purple-300 border-purple-500/40", icon: Bot },
  forwarding: { label: "Forwarding", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: PhoneForwarded },
  completed: { label: "Done", color: "bg-black/8 text-[#9a8a72] border-black/10", icon: CheckCircle2 },
  dropped: { label: "Dropped", color: "bg-red-500/20 text-red-300 border-red-500/40", icon: PhoneOff },
};

// ─── Call Card ────────────────────────────────────────────────────────────────

function CallCard({
  session,
  onAcknowledge,
  showAck,
  tickRef,
}: {
  session: CallSession;
  onAcknowledge?: () => void;
  showAck: boolean;
  tickRef: number;
}) {
  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.active;
  const StatusIcon = statusCfg.icon;
  const isHolding = session.status === "holding";
  const needsAck = isHolding && !session.acknowledgedAt;

  // Live timer re-renders every second via tickRef prop
  void tickRef;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-3 transition-all",
        needsAck
          ? "bg-yellow-500/8 border-yellow-500/40 shadow-lg shadow-yellow-500/10"
          : "bg-[#faf6ed] border-black/8"
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[#2d2010] font-semibold text-sm">
            {session.callerName ?? session.callerNumber}
          </div>
          {session.callerName && (
            <div className="text-[#7a6b52] text-xs font-mono">{session.callerNumber}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge className={cn("text-[10px] border font-medium gap-1", statusCfg.color)}>
            <StatusIcon size={10} />
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* Flow path */}
      <div className="flex items-center gap-1 flex-wrap">
        {session.flowPath.slice(-4).map((step, i, arr) => (
          <span key={i} className="flex items-center gap-1">
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              i === arr.length - 1
                ? "bg-black/6 text-[#2d2010] font-medium"
                : "text-[#9a8a72]"
            )}>
              {STEP_LABELS[step] ?? step}
            </span>
            {i < arr.length - 1 && <ChevronRight size={9} className="text-[#b8a890] shrink-0" />}
          </span>
        ))}
      </div>

      {/* Order captured */}
      {session.orderCaptured && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2">
          <div className="text-[10px] text-purple-400 font-medium mb-0.5">Order captured</div>
          <div className="text-[#3d3020] text-xs leading-relaxed">{session.orderCaptured}</div>
        </div>
      )}

      {/* SMS sent */}
      {session.smsSent && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
          <div className="text-[10px] text-emerald-400 font-medium">SMS sent ✓</div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[#9a8a72] text-xs">
          <Clock size={11} />
          <span>{formatDuration(session.startedAt)}</span>
          {session.notificationCount > 0 && (
            <span className="ml-2 text-yellow-400/60">· {session.notificationCount} ping{session.notificationCount !== 1 ? "s" : ""}</span>
          )}
        </div>

        {/* Acknowledge button for holding calls */}
        {needsAck && showAck && (
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          >
            <Button
              onClick={onAcknowledge}
              size="sm"
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs h-7 px-3 gap-1.5"
            >
              <Bell size={12} />
              Answer Call
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({
  title,
  icon: Icon,
  color,
  sessions,
  onAcknowledge,
  showAck,
  tickRef,
  emptyMsg,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  sessions: CallSession[];
  onAcknowledge?: (callSid: string) => void;
  showAck: boolean;
  tickRef: number;
  emptyMsg: string;
}) {
  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className={cn("flex items-center gap-2 px-1")}>
        <Icon size={14} className={color} />
        <span className="text-sm font-semibold text-[#2d2010]">{title}</span>
        {sessions.length > 0 && (
          <Badge className="bg-black/6 text-[#6b5c42] border-0 text-[10px] ml-auto">
            {sessions.length}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        <AnimatePresence mode="popLayout">
          {sessions.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-black/5 bg-black/2 px-4 py-6 text-center text-[#a89880] text-xs"
            >
              {emptyMsg}
            </motion.div>
          ) : (
            sessions.map((s) => (
              <CallCard
                key={s._id}
                session={s}
                onAcknowledge={onAcknowledge ? () => onAcknowledge(s.callSid) : undefined}
                showAck={showAck}
                tickRef={tickRef}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Orders Panel ─────────────────────────────────────────────────────────────

type OrderDoc = Doc<"orders">;

const ORDER_STATUSES: { key: OrderDoc["status"]; label: string; color: string }[] = [
  { key: "new", label: "New", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  { key: "confirmed", label: "Confirmed", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  { key: "preparing", label: "Preparing", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  { key: "ready", label: "Ready!", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  { key: "done", label: "Done", color: "bg-black/8 text-[#9a8a72] border-black/10" },
];

function OrderCard({ order }: { order: OrderDoc }) {
  const updateStatus = useMutation(api.orders.updateStatus);
  const sendMsg = useMutation(api.orders.sendStaffMessage);
  const [msgInput, setMsgInput] = useState("");
  const [showMsg, setShowMsg] = useState(false);

  const statusCfg = ORDER_STATUSES.find((s) => s.key === order.status) ?? ORDER_STATUSES[0];
  const nextStatus = ORDER_STATUSES[ORDER_STATUSES.findIndex((s) => s.key === order.status) + 1];

  async function handleAdvance() {
    if (!nextStatus) return;
    await updateStatus({ orderId: order._id as Id<"orders">, status: nextStatus.key });
    toast.success(`Order for ${order.customerName} → ${nextStatus.label}`);
  }

  async function handleSendMsg() {
    const msg = msgInput.trim();
    if (!msg) return;
    await sendMsg({ orderId: order._id as Id<"orders">, message: msg });
    toast.success("Message sent to customer");
    setMsgInput("");
    setShowMsg(false);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#faf6ed] border border-black/8 rounded-2xl p-4 flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[#2d2010] font-semibold text-sm">{order.customerName}</div>
          <div className="text-[#7a6b52] text-xs">Table {order.tableNumber}</div>
        </div>
        <Badge className={cn("text-[10px] border font-medium shrink-0", statusCfg.color)}>
          {statusCfg.label}
        </Badge>
      </div>

      <div className="space-y-0.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between text-xs text-[#4a3c28]">
            <span>{item.quantity}× {item.name}</span>
            <span className="text-[#9a8a72]">${((item.price * item.quantity) / 100).toFixed(2)}</span>
          </div>
        ))}
        {order.notes && (
          <div className="text-xs text-amber-400/70 mt-1 italic">"{order.notes}"</div>
        )}
      </div>

      {order.staffMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
          <div className="text-[10px] text-emerald-400 font-medium mb-0.5">Staff message sent</div>
          <div className="text-[#4a3c28] text-xs">{order.staffMessage}</div>
        </div>
      )}

      {/* Message input */}
      <AnimatePresence>
        {showMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 overflow-hidden"
          >
            <Input
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMsg()}
              placeholder="Message to customer..."
              className="bg-black/8 border-black/10 text-[#2d2010] text-xs placeholder:text-[#9a8a72] h-8"
            />
            <Button size="sm" onClick={handleSendMsg} className="bg-emerald-600 hover:bg-emerald-500 h-8 px-2.5">
              <Send size={12} />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowMsg((v) => !v)}
          className="text-[#7a6b52] hover:text-[#2d2010] border border-black/8 text-[11px] h-7 px-2.5 gap-1"
        >
          <MessageSquare size={11} />
          Message
        </Button>
        {nextStatus && order.status !== "done" && (
          <Button
            size="sm"
            onClick={handleAdvance}
            className="flex-1 bg-black/5 hover:bg-black/8 text-[#2d2010] text-[11px] h-7 px-2.5 border border-black/10"
          >
            → {nextStatus.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function OrdersPanel() {
  const orders = useQuery(api.orders.listAll, {}) ?? [];
  const activeOrders = orders.filter((o) => o.status !== "done");
  const doneOrders = orders.filter((o) => o.status === "done").slice(0, 5);

  return (
    <div className="bg-[#faf6ed] border border-black/8 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <UtensilsCrossed size={14} className="text-amber-400" />
        <span className="text-sm font-semibold text-[#2d2010]">Table Orders</span>
        {activeOrders.length > 0 && (
          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 border text-[10px] ml-auto">
            {activeOrders.length} active
          </Badge>
        )}
      </div>
      {activeOrders.length === 0 && doneOrders.length === 0 ? (
        <div className="text-center py-6 text-[#a89880] text-xs">No orders yet</div>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence mode="popLayout">
            {activeOrders.map((o) => <OrderCard key={o._id} order={o} />)}
          </AnimatePresence>
          {doneOrders.length > 0 && (
            <div className="pt-2 border-t border-black/5">
              <div className="text-[10px] text-[#a89880] uppercase tracking-wide mb-2">Completed</div>
              {doneOrders.map((o) => <OrderCard key={o._id} order={o} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TabletDashboard() {
  const locationId = "charlies-demo";
  const activeSessions = useQuery(api.callSessions.listActive, { locationId }) ?? [];
  const recentSessions = useQuery(api.callSessions.listRecent, { locationId }) ?? [];
  const location = useQuery(api.locations.get, { locationId });
  const acknowledge = useMutation(api.callSessions.acknowledge);
  const simulateCall = useMutation(api.callSessions.simulateCall);
  const seedLocation = useMutation(api.locations.seedDemo);

  const [tick, setTick] = useState(0);
  const [alertActive, setAlertActive] = useState(false);
  const prevHoldCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Seed demo location on first load
  useEffect(() => {
    seedLocation();
  }, [seedLocation]);

  // Live timer tick every second
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Detect new holding calls and play alert
  useEffect(() => {
    const holdCount = activeSessions.filter(
      (s) => s.status === "holding" && !s.acknowledgedAt
    ).length;

    if (holdCount > prevHoldCount.current) {
      setAlertActive(true);
      toast.warning("Customer holding — needs acknowledgement!", {
        duration: 8000,
        icon: <BellRing size={16} />,
      });
      // Try to play a notification sound
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.frequency.value = 1100;
          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.4);
        }, 500);
      } catch {
        // Audio not available
      }
    }
    if (holdCount === 0) setAlertActive(false);
    prevHoldCount.current = holdCount;
  }, [activeSessions]);

  async function handleAcknowledge(callSid: string) {
    await acknowledge({ callSid });
    toast.success("Acknowledged — forwarding call to restaurant line");
    setAlertActive(false);
  }

  async function fireSimulation(scenario: "pickup_ai" | "delivery_sms" | "hold_queue" | "specials_then_ai") {
    const names = ["Maria S.", "James K.", "Tyler R.", "Sophie L.", "Dan M."];
    const phones = ["+15551230001", "+15551230002", "+15551230003", "+15551230004", "+15551230005"];
    const idx = Math.floor(Math.random() * 5);
    await simulateCall({
      locationId,
      callerNumber: phones[idx],
      callerName: names[idx],
      scenario,
    });
    toast.info(`Simulated: ${scenario.replace(/_/g, " ")} call`);
  }

  const holdingSessions = activeSessions.filter((s) => s.status === "holding" && !s.acknowledgedAt);
  const aiSessions = activeSessions.filter((s) => s.status === "ai_ordering");
  const otherActive = activeSessions.filter(
    (s) => s.status !== "holding" && s.status !== "ai_ordering" && s.status !== "completed"
  );
  const totalActive = activeSessions.length;

  const convexUrl = "https://vivid-corgi-575.convex.site";

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010] flex flex-col">
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-500",
        alertActive
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-[#faf6ed]/90 border-black/8 backdrop-blur-md"
      )}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors",
              alertActive
                ? "bg-yellow-500/20 border-yellow-500/50"
                : "bg-emerald-500/15 border-emerald-500/30"
            )}>
              {alertActive
                ? <BellRing size={16} className="text-yellow-400" />
                : <Phone size={15} className="text-emerald-400" />}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {location?.name ?? "Loading..."}
              </div>
              <div className="text-[#7a6b52] text-xs">Live Call Dashboard</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Live counter */}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold",
              totalActive > 0
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-black/4 border-black/10 text-[#7a6b52]"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", totalActive > 0 ? "bg-emerald-400 animate-pulse" : "bg-black/20")} />
              {totalActive} active
            </div>

            {holdingSessions.length > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border bg-yellow-500/15 border-yellow-500/30 text-yellow-300 text-xs font-semibold">
                <BellRing size={11} />
                {holdingSessions.length} holding
              </div>
            )}

            <div className="hidden sm:flex items-center gap-1 text-[#a89880] text-xs">
              <Wifi size={11} />
              <span>Live</span>
            </div>

            <Link to="/analytics">
              <Button size="sm" variant="ghost" className="text-[#6b5c42] hover:text-[#2d2010] border border-black/10 text-xs px-3 py-1.5 h-auto">
                Analytics
              </Button>
            </Link>
            <Link to="/settings">
              <Button size="sm" variant="ghost" className="text-[#6b5c42] hover:text-[#2d2010] border border-black/10 text-xs px-3 py-1.5 h-auto">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      <AnimatePresence>
        {alertActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-500/10 border-b border-yellow-500/20 overflow-hidden"
          >
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
              <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
              <p className="text-yellow-200 text-sm flex-1">
                <strong>Customer on hold</strong> — tap "Answer Call" on their card to forward them to your restaurant line.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main grid */}
      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Holding */}
          <Column
            title="Holding"
            icon={Clock}
            color="text-yellow-400"
            sessions={holdingSessions}
            onAcknowledge={handleAcknowledge}
            showAck={true}
            tickRef={tick}
            emptyMsg="No callers on hold"
          />
          {/* AI Ordering */}
          <Column
            title="AI Ordering"
            icon={Bot}
            color="text-purple-400"
            sessions={aiSessions}
            showAck={false}
            tickRef={tick}
            emptyMsg="No active AI orders"
          />
          {/* Other Active */}
          <Column
            title="Active"
            icon={Phone}
            color="text-blue-400"
            sessions={otherActive}
            showAck={false}
            tickRef={tick}
            emptyMsg="No other active calls"
          />
        </div>

        {/* Recent calls */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <RefreshCw size={13} className="text-[#9a8a72]" />
            <span className="text-sm font-semibold text-[#6b5c42]">Recent (last 2 hrs)</span>
            {recentSessions.length > 0 && (
              <Badge className="bg-black/5 text-[#7a6b52] border-0 text-[10px] ml-auto">
                {recentSessions.length}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <AnimatePresence mode="popLayout">
              {recentSessions.length === 0 ? (
                <div className="col-span-2 rounded-2xl border border-black/5 bg-black/2 px-4 py-5 text-center text-[#a89880] text-xs">
                  No recent calls in the last 2 hours
                </div>
              ) : (
                recentSessions.map((s) => (
                  <CallCard
                    key={s._id}
                    session={s}
                    showAck={false}
                    tickRef={tick}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Orders Panel */}
        <div className="mb-8">
          <OrdersPanel />
        </div>

        {/* Simulation controls + Twilio config */}
        <div className="grid sm:grid-cols-2 gap-5">
          {/* Simulate calls */}
          <div className="bg-[#faf6ed] border border-black/8 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={13} className="text-[#7a6b52]" />
              <span className="text-sm font-semibold text-[#4a3c28]">Simulate Calls</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["pickup_ai", "Pickup → AI Order", "text-purple-400"],
                ["delivery_sms", "Delivery → SMS", "text-emerald-400"],
                ["hold_queue", "Hold Queue", "text-yellow-400"],
                ["specials_then_ai", "Specials → AI", "text-blue-400"],
              ] as const).map(([scenario, label, color]) => (
                <button
                  key={scenario}
                  onClick={() => fireSimulation(scenario)}
                  className={cn(
                    "text-left px-3 py-2.5 rounded-xl bg-black/4 hover:bg-black/5 border border-black/8 hover:border-black/12 transition-colors cursor-pointer",
                    color
                  )}
                >
                  <div className="text-[11px] font-semibold">{label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Twilio config reference */}
          <div className="bg-[#faf6ed] border border-black/8 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Phone size={13} className="text-[#7a6b52]" />
              <span className="text-sm font-semibold text-[#4a3c28]">Twilio Webhook URLs</span>
            </div>
            <div className="space-y-2">
              {[
                ["Incoming Call", `/twilio/incoming?locationId=charlies-demo`],
                ["Status Callback", `/twilio/status`],
              ].map(([label, path]) => (
                <div key={label}>
                  <div className="text-[10px] text-[#8a7b62] mb-0.5">{label}</div>
                  <div className="text-[10px] font-mono text-emerald-400/80 bg-black/8 rounded px-2 py-1.5 break-all">
                    {convexUrl}{path}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
