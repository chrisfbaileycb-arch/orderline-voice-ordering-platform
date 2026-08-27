import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity, PhoneCall, Zap, Clock, CheckCircle2,
  XCircle, AlertTriangle, RefreshCw, Play, ChevronDown,
  ChevronRight, Users, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

const LOCATION_ID = "charlies-demo";

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  active:      { label: "Active",      color: "text-[#388bfd] bg-[#388bfd]/10 border-[#388bfd]/20",      dot: "bg-[#388bfd]" },
  holding:     { label: "On Hold",     color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",   dot: "bg-yellow-400 animate-pulse" },
  ai_ordering: { label: "AI Ordering", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400 animate-pulse" },
  forwarding:  { label: "Forwarding",  color: "text-orange-400 bg-orange-500/10 border-orange-500/20",  dot: "bg-orange-400" },
  completed:   { label: "Completed",   color: "text-[#9a8a72] bg-[#ece6d6] border-[#d8d0c0]",           dot: "bg-[#9a8a72]" },
  dropped:     { label: "Dropped",     color: "text-red-400 bg-red-500/10 border-red-500/20",           dot: "bg-red-400" },
};

const OUTCOME_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  order_placed:        { label: "Order Placed",       icon: CheckCircle2,  color: "text-emerald-400" },
  forwarded_to_staff:  { label: "Fwd to Staff",       icon: PhoneCall,     color: "text-yellow-400" },
  sms_sent:            { label: "SMS Sent",           icon: MessageSquare, color: "text-[#388bfd]" },
  dropped:             { label: "Dropped",            icon: XCircle,       color: "text-red-400" },
  voicemail:           { label: "Voicemail",          icon: AlertTriangle, color: "text-orange-400" },
};

function elapsed(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 flex items-center gap-3">
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", color)}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-lg font-bold text-[#2d2010] leading-none">{value}</p>
        <p className="text-[10px] text-[#9a8a72] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function TelemetryPanel() {
  const activeSessions = useQuery(api.callSessions.listActive, { locationId: LOCATION_ID });
  const recentSessions = useQuery(api.callSessions.listRecent, { locationId: LOCATION_ID });
  const stats24h = useQuery(api.analytics.getSummaryStats, { locationId: LOCATION_ID, windowMs: 86_400_000 });
  const bridgeOrders = useQuery(api.bridge.listRecent, {});
  const simulateCall = useMutation(api.callSessions.simulateCall);

  const [expandedSid, setExpandedSid] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  type Scenario = "pickup_ai" | "delivery_sms" | "hold_queue" | "specials_then_ai";
  const SCENARIOS: { id: Scenario; label: string }[] = [
    { id: "pickup_ai",       label: "Pickup → AI Order" },
    { id: "hold_queue",      label: "Pickup → Hold Queue" },
    { id: "delivery_sms",    label: "Delivery → SMS" },
    { id: "specials_then_ai", label: "Specials → AI Order" },
  ];

  const handleSimulate = useCallback(async (scenario: Scenario) => {
    setSimulating(true);
    try {
      await simulateCall({
        locationId: LOCATION_ID,
        callerNumber: `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
        callerName: ["Mario R.", "Sandra T.", "James L.", "Ana K.", "Chris B."][Math.floor(Math.random() * 5)],
        scenario,
      });
      toast.success(`Simulated: ${scenario.replace(/_/g, " ")}`);
    } catch {
      toast.error("Simulation failed");
    } finally {
      setSimulating(false);
    }
  }, [simulateCall]);

  const bridgePending  = bridgeOrders?.filter((o) => o.status === "pending").length ?? 0;
  const bridgeEntered  = bridgeOrders?.filter((o) => o.status === "entered").length ?? 0;
  const bridgeErrors   = bridgeOrders?.filter((o) => o.status === "error").length ?? 0;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#2d2010] flex items-center gap-2">
            <Activity size={14} className="text-emerald-400" /> Live System Telemetry
          </h2>
          <p className="text-[11px] text-[#9a8a72] mt-0.5">Location: {LOCATION_ID} · auto-refreshing via Convex</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-[#9a8a72]">Live</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Calls (24h)"     value={stats24h?.totalCalls ?? "—"}       icon={PhoneCall}    color="text-[#388bfd] bg-[#388bfd]/10 border-[#388bfd]/20" />
        <StatCard label="Orders (24h)"    value={stats24h?.ordersPlaced ?? "—"}      icon={CheckCircle2} color="text-emerald-400 bg-emerald-500/10 border-emerald-500/20" />
        <StatCard label="Active Sessions" value={activeSessions?.length ?? "—"}      icon={Users}        color="text-yellow-400 bg-yellow-500/10 border-yellow-500/20" />
        <StatCard label="Bridge Pending"  value={bridgePending}                      icon={Zap}          color={bridgePending > 0 ? "text-orange-400 bg-orange-500/10 border-orange-500/20" : "text-[#9a8a72] bg-[#ece6d6] border-[#d8d0c0]"} />
      </div>

      {/* Active sessions */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2">Active Call Sessions</p>
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
          {!activeSessions || activeSessions.length === 0 ? (
            <div className="px-4 py-6 text-center text-[#9a8a72] text-xs">No active calls right now</div>
          ) : (
            activeSessions.map((s, i) => {
              const meta = STATUS_META[s.status] ?? STATUS_META["active"];
              return (
                <div key={s._id} className={cn("border-b border-[#cec6b4] last:border-0", i % 2 === 1 && "bg-[#f2ecdc]")}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-[#ece6d6] transition-colors"
                    onClick={() => setExpandedSid(expandedSid === s.callSid ? null : s.callSid)}
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#2d2010]">{s.callerNumber}</span>
                        {s.callerName && <span className="text-[10px] text-[#6b5c42]">{s.callerName}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-[9px] border rounded-full px-1.5 py-0.5", meta.color)}>{meta.label}</span>
                        <span className="text-[10px] text-[#9a8a72] font-mono">{s.flowStep}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-[#9a8a72]">{elapsed(s.startedAt)}</p>
                      {expandedSid === s.callSid ? <ChevronDown size={12} className="text-[#9a8a72] ml-auto mt-1" /> : <ChevronRight size={12} className="text-[#9a8a72] ml-auto mt-1" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedSid === s.callSid && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pt-1 bg-[#f2ecdc] border-t border-[#cec6b4]">
                          <p className="text-[10px] text-[#9a8a72] font-mono mb-1">Flow path:</p>
                          <div className="flex flex-wrap gap-1">
                            {s.flowPath.map((step, j) => (
                              <span key={j} className="text-[9px] font-mono bg-[#ece6d6] text-[#6b5c42] rounded px-1.5 py-0.5">{step}</span>
                            ))}
                          </div>
                          {s.orderCaptured && (
                            <div className="mt-2">
                              <p className="text-[10px] text-[#9a8a72] font-mono mb-1">Captured order:</p>
                              <p className="text-[10px] text-emerald-400 font-mono">{s.orderCaptured}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bridge order queue */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">Bridge Order Queue (last 20)</p>
          <div className="flex gap-2 text-[10px] font-mono">
            <span className="text-emerald-400">{bridgeEntered} entered</span>
            <span className="text-yellow-400">{bridgePending} pending</span>
            {bridgeErrors > 0 && <span className="text-red-400">{bridgeErrors} errors</span>}
          </div>
        </div>
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
          {!bridgeOrders || bridgeOrders.length === 0 ? (
            <div className="px-4 py-6 text-center text-[#9a8a72] text-xs">No bridge orders yet</div>
          ) : (
            bridgeOrders.slice(0, 8).map((o, i) => {
              const statusColor =
                o.status === "entered"   ? "text-emerald-400" :
                o.status === "pending"   ? "text-yellow-400" :
                o.status === "processing"? "text-[#388bfd]" :
                "text-red-400";
              return (
                <div key={o._id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-[#cec6b4] last:border-0", i % 2 === 1 && "bg-[#f2ecdc]")}>
                  <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1.5",
                    o.status === "entered" ? "bg-emerald-500" :
                    o.status === "pending" ? "bg-yellow-500 animate-pulse" :
                    o.status === "processing" ? "bg-[#388bfd] animate-pulse" :
                    "bg-red-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#2d2010] font-medium truncate">{o.customer}</span>
                      <span className="text-[9px] font-mono text-[#9a8a72]">{o.orderId}</span>
                    </div>
                    <div className="text-[10px] text-[#6b5c42] mt-0.5">
                      {o.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-mono shrink-0", statusColor)}>{o.status}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Call simulator */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2">Call Simulator</p>
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4">
          <p className="text-[11px] text-[#6b5c42] mb-3">Inject a synthetic call session into Convex to test the dashboard and flow logic.</p>
          <div className="grid grid-cols-2 gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => handleSimulate(s.id)}
                disabled={simulating}
                className="flex items-center gap-2 bg-[#f0ead8] border border-[#d8d0c0] hover:border-[#388bfd]/40 rounded-lg px-3 py-2.5 text-left transition-all cursor-pointer disabled:opacity-50"
              >
                <Play size={11} className="text-[#388bfd] shrink-0" />
                <span className="text-[11px] text-[#6b5c42] hover:text-[#2d2010]">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent call log */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2">Completed (last 2h)</p>
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
          {!recentSessions || recentSessions.length === 0 ? (
            <div className="px-4 py-6 text-center text-[#9a8a72] text-xs">No completed calls in last 2 hours</div>
          ) : (
            recentSessions.slice(0, 6).map((s, i) => (
              <div key={s._id} className={cn("flex items-center gap-3 px-4 py-2.5 border-b border-[#cec6b4] last:border-0", i % 2 === 1 && "bg-[#f2ecdc]")}>
                <Clock size={12} className="text-[#9a8a72] shrink-0" />
                <span className="text-xs font-mono text-[#6b5c42] flex-1">{s.callerNumber}</span>
                <span className="text-[10px] text-[#9a8a72]">{s.flowPath[s.flowPath.length - 1]}</span>
                <span className="text-[10px] text-[#9a8a72]">{elapsed(s.startedAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
