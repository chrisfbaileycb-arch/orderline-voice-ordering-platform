import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  PhoneCall, PhoneForwarded, MessageSquare, ShoppingBag, PhoneMissed,
  Clock, ChevronDown, ChevronUp, Filter, Download, Play, Pause,
  ArrowLeft, Calendar, TrendingUp, Users, CheckCircle2, XCircle,
  AlertCircle, Info, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils.ts";
import { format, formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type CallLog = Doc<"callLogs">;

type Outcome = "all" | "order_placed" | "forwarded_to_staff" | "sms_sent" | "dropped" | "voicemail";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function outcomeLabel(outcome: string) {
  const map: Record<string, string> = {
    order_placed: "Order Placed",
    forwarded_to_staff: "Held → Staff",
    sms_sent: "SMS Sent",
    dropped: "Dropped",
    voicemail: "Voicemail",
  };
  return map[outcome] ?? outcome;
}

function outcomeBadge(outcome: string) {
  const styles: Record<string, string> = {
    order_placed: "bg-green-500/15 text-green-400 border-green-500/30",
    forwarded_to_staff: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    sms_sent: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    dropped: "bg-red-500/15 text-red-400 border-red-500/30",
    voicemail: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };
  return styles[outcome] ?? "bg-black/6 text-[#4a3c28] border-black/10";
}

function fmtDuration(s?: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtPhone(n: string) {
  if (!n || n.startsWith("SIM-")) return n;
  const d = n.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return n;
}

function flowStepLabel(step: string) {
  const map: Record<string, string> = {
    greeting: "Greeting",
    pickup: "Pickup",
    delivery: "Delivery",
    delivery_sms_sent: "SMS Sent",
    delivery_sms_not_ready: "SMS Not Ready",
    delivery_no_sms: "No SMS",
    automated_or_hold: "Automated/Hold",
    holding: "Hold Queue",
    forwarding_to_staff: "Forwarding",
    ai_ordering: "AI Ordering",
    order_captured: "Order Captured",
  };
  return map[step] ?? step.replace(/_/g, " ");
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="bg-[#faf6ed] border-[#cec6b4] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[#6b5c42] text-xs mb-1">{label}</p>
          <p className="text-2xl font-bold text-[#2d2010]">{value}</p>
          {sub && <p className="text-[#6b5c42] text-xs mt-0.5">{sub}</p>}
        </div>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", color)}>
          <Icon size={17} />
        </div>
      </div>
    </Card>
  );
}

// ─── Call Row (expandable) ────────────────────────────────────────────────────

function CallRow({ log, isExpanded, onToggle }: {
  log: CallLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="border-b border-[#d8d0c0] last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f2ecdc] transition-colors text-left cursor-pointer"
      >
        <div className="w-8 h-8 rounded-full bg-[#ece6d6] flex items-center justify-center shrink-0">
          <PhoneCall size={14} className="text-[#6b5c42]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#2d2010]">{fmtPhone(log.callerNumber)}</span>
            <Badge className={cn("text-[10px] border px-1.5 py-0", outcomeBadge(log.outcome))}>
              {outcomeLabel(log.outcome)}
            </Badge>
            {log.orderType && (
              <Badge className="bg-black/4 text-[#6b5c42] border-black/10 text-[10px] px-1.5 py-0 capitalize border">
                {log.orderType}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-[#6b5c42] mt-0.5">
            {format(log.startedAt, "MMM d, h:mm a")} · {fmtDuration(log.durationSeconds)}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {log.orderCaptured && (
            <span className="hidden md:block text-[10px] text-[#6b5c42] max-w-[160px] truncate">
              {log.orderCaptured}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-[#6b5c42]" />
          ) : (
            <ChevronDown size={14} className="text-[#6b5c42]" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 bg-[#f0ead8] border-t border-[#d8d0c0] space-y-4">
              {/* Flow path */}
              <div>
                <p className="text-[#6b5c42] text-[10px] uppercase tracking-wider mb-2">Call Flow</p>
                <div className="flex items-center flex-wrap gap-1">
                  {log.flowPath.map((step, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="bg-[#ece6d6] text-[#2d2010] text-[10px] px-2 py-0.5 rounded">
                        {flowStepLabel(step)}
                      </span>
                      {i < log.flowPath.length - 1 && (
                        <ChevronDown size={10} className="text-[#9a8a72] rotate-[-90deg]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Order captured */}
                {log.orderCaptured && (
                  <div>
                    <p className="text-[#6b5c42] text-[10px] uppercase tracking-wider mb-1.5">Order Captured (AI)</p>
                    <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-lg p-3">
                      <p className="text-[#2d2010] text-xs leading-relaxed">{log.orderCaptured}</p>
                    </div>
                  </div>
                )}

                {/* Transcript */}
                {log.transcript && (
                  <div>
                    <p className="text-[#6b5c42] text-[10px] uppercase tracking-wider mb-1.5">Transcript</p>
                    <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-lg p-3 max-h-32 overflow-y-auto">
                      <p className="text-[#2d2010] text-xs leading-relaxed font-mono whitespace-pre-wrap">{log.transcript}</p>
                    </div>
                  </div>
                )}

                {/* SMS info */}
                {log.smsSent && (
                  <div>
                    <p className="text-[#6b5c42] text-[10px] uppercase tracking-wider mb-1.5">SMS Sent</p>
                    <div className="bg-[#ece6d6] border border-[#cec6b4] rounded-lg p-3">
                      <p className="text-[#1a5276] text-xs break-all">{log.smsSent}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recording playback */}
              {log.recordingUrl && (
                <div>
                  <p className="text-[#6b5c42] text-[10px] uppercase tracking-wider mb-1.5">Recording</p>
                  <div className="flex items-center gap-3 bg-[#faf6ed] border border-[#cec6b4] rounded-lg p-3">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 cursor-pointer hover:bg-emerald-400 transition-colors"
                    >
                      {playing ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
                    </button>
                    <div className="flex-1 h-1.5 bg-[#cec6b4] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500 rounded-full"
                        animate={playing ? { width: ["0%", "100%"] } : { width: "0%" }}
                        transition={playing ? { duration: log.durationSeconds ?? 30, ease: "linear" } : {}}
                      />
                    </div>
                    <span className="text-[#6b5c42] text-[10px] font-mono">{fmtDuration(log.durationSeconds)}</span>
                  </div>
                  <audio
                    src={log.recordingUrl}
                    onEnded={() => setPlaying(false)}
                    ref={(el) => {
                      if (el) {
                        if (playing) el.play().catch(() => {});
                        else el.pause();
                      }
                    }}
                    className="hidden"
                  />
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-[10px] text-[#6b5c42]">
                <span>CallSid: <span className="font-mono text-[#9a8a72]">{log.callSid}</span></span>
                <span>Duration: <span className="text-[#2d2010]">{fmtDuration(log.durationSeconds)}</span></span>
                <span>Started: <span className="text-[#2d2010]">{format(log.startedAt, "MMM d yyyy, h:mm:ss a")}</span></span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Custom Tooltip for chart ─────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#6b5c42] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Main Analytics Page ──────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const locationId = "charlies-demo";
  const [window7d, setWindow7d] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<Outcome>("all");
  const [expandedCallSid, setExpandedCallSid] = useState<string | null>(null);

  const windowMs = window7d ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  const stats = useQuery(api.analytics.getSummaryStats, { locationId, windowMs });
  const hourlyData = useQuery(api.analytics.getHourlyVolume, { locationId });
  const callLogs = useQuery(api.analytics.listCallLogs, {
    locationId,
    outcome: outcomeFilter === "all" ? undefined : outcomeFilter,
  });

  const simulateCall = useMutation(api.callSessions.simulateCall);
  const [simulating, setSimulating] = useState(false);

  async function handleSeedDemo() {
    if (simulating) return;
    setSimulating(true);
    const scenarios = ["pickup_ai", "delivery_sms", "hold_queue", "pickup_ai"] as const;
    for (const scenario of scenarios) {
      const phones = ["(312) 555-0101", "(773) 555-0199", "(847) 555-0123", "(630) 555-0177"];
      await simulateCall({
        locationId,
        callerNumber: phones[Math.floor(Math.random() * phones.length)],
        scenario,
      });
      await new Promise((r) => setTimeout(r, 400));
    }
    setSimulating(false);
  }

  const conversionRate = stats && stats.totalCalls > 0
    ? Math.round((stats.ordersPlaced / stats.totalCalls) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">
      {/* Header */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="text-[#6b5c42] hover:text-[#2d2010] transition-colors p-1 -ml-1">
              <ArrowLeft size={18} />
            </Link>
            <Separator orientation="vertical" className="h-5 bg-[#cec6b4]" />
            <div>
              <h1 className="text-base font-semibold text-[#2d2010] leading-tight">Call Analytics</h1>
              <p className="text-[10px] text-[#6b5c42]">Charlie's Restaurant · charlies-demo</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-[#ece6d6] border border-[#cec6b4] overflow-hidden text-xs">
              <button
                onClick={() => setWindow7d(false)}
                className={cn("px-3 py-2 transition-colors cursor-pointer", !window7d ? "bg-emerald-500 text-white" : "text-[#6b5c42] hover:text-[#2d2010]")}
              >
                24h
              </button>
              <button
                onClick={() => setWindow7d(true)}
                className={cn("px-3 py-2 transition-colors cursor-pointer", window7d ? "bg-emerald-500 text-white" : "text-[#6b5c42] hover:text-[#2d2010]")}
              >
                7d
              </button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSeedDemo}
              disabled={simulating}
              className="text-[#6b5c42] hover:text-[#2d2010] border border-[#cec6b4] text-xs whitespace-nowrap"
            >
              <RefreshCw size={12} className={cn("mr-1.5", simulating && "animate-spin")} />
              <span className="hidden sm:inline">Seed Demo Data</span>
              <span className="sm:hidden">Seed</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={PhoneCall}
            label="Total Calls"
            value={stats?.totalCalls ?? "—"}
            sub={window7d ? "last 7 days" : "last 24 hours"}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={ShoppingBag}
            label="Orders Placed"
            value={stats?.ordersPlaced ?? "—"}
            sub={`${conversionRate}% conversion`}
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={PhoneForwarded}
            label="Holds → Staff"
            value={stats?.holdsConverted ?? "—"}
            sub="calls forwarded"
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={MessageSquare}
            label="SMS Sent"
            value={stats?.smsSent ?? "—"}
            sub="delivery links"
            color="bg-emerald-500/15 text-emerald-400"
          />
          <StatCard
            icon={PhoneMissed}
            label="Dropped"
            value={stats?.droppedCalls ?? "—"}
            sub="no outcome"
            color="bg-red-500/15 text-red-400"
          />
          <StatCard
            icon={Clock}
            label="Avg Duration"
            value={fmtDuration(stats?.avgDurationSeconds)}
            sub="per call"
            color="bg-emerald-500/15 text-emerald-400"
          />
        </div>

        {/* Chart */}
        <Card className="bg-[#faf6ed] border-[#cec6b4] pt-0">
          <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                Call Volume — Last 24 Hours
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px] text-[#6b5c42]">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Total Calls</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-400 inline-block" /> Orders</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 py-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={hourlyData ?? []} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8d0c0" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#9a8a72", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fill: "#9a8a72", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  width={20}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#d8d0c0" }} />
                <Bar dataKey="calls" name="Calls" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20} />
                <Bar dataKey="orders" name="Orders" fill="#3fb950" radius={[3, 3, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Call Log Table */}
        <Card className="bg-[#faf6ed] border-[#cec6b4] pt-0">
          <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                <PhoneCall size={14} className="text-[#6b5c42]" />
                Call Log
                {callLogs && (
                  <Badge className="bg-[#ece6d6] text-[#6b5c42] border-[#cec6b4] border text-[10px] ml-1">
                    {callLogs.length} records
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-[#6b5c42]" />
                <Select
                  value={outcomeFilter}
                  onValueChange={(v) => setOutcomeFilter(v as Outcome)}
                >
                  <SelectTrigger className="h-7 text-xs bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#faf6ed] border-[#d8d0c0] text-[#2d2010]">
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="order_placed">Orders placed</SelectItem>
                    <SelectItem value="forwarded_to_staff">Held → Staff</SelectItem>
                    <SelectItem value="sms_sent">SMS sent</SelectItem>
                    <SelectItem value="dropped">Dropped</SelectItem>
                    <SelectItem value="voicemail">Voicemail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!callLogs ? (
              <div className="flex items-center justify-center py-12 gap-2 text-[#9a8a72]">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">Loading call log...</span>
              </div>
            ) : callLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#9a8a72]">
                <PhoneCall size={32} />
                <p className="text-sm text-center">
                  No calls yet
                  {outcomeFilter !== "all" ? ` with outcome "${outcomeLabel(outcomeFilter)}"` : ""}
                  <br />
                  <button
                    onClick={handleSeedDemo}
                    className="text-emerald-400 hover:underline cursor-pointer mt-1 text-xs"
                  >
                    Seed demo data to see it in action
                  </button>
                </p>
              </div>
            ) : (
              <div>
                {callLogs.map((log) => (
                  <CallRow
                    key={log._id}
                    log={log}
                    isExpanded={expandedCallSid === log.callSid}
                    onToggle={() =>
                      setExpandedCallSid((c) => (c === log.callSid ? null : log.callSid))
                    }
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outcome breakdown */}
        {stats && stats.totalCalls > 0 && (
          <Card className="bg-[#faf6ed] border-[#cec6b4] pt-0">
            <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
              <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                <Users size={14} className="text-[#6b5c42]" />
                Outcome Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[
                { label: "Orders Placed", value: stats.ordersPlaced, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-400" },
                { label: "Held → Staff", value: stats.holdsConverted, icon: PhoneForwarded, color: "text-blue-400", bg: "bg-blue-400" },
                { label: "SMS Sent", value: stats.smsSent, icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-400" },
                { label: "Dropped", value: stats.droppedCalls, icon: XCircle, color: "text-red-400", bg: "bg-red-400" },
              ].map(({ label, value, icon: Icon, color, bg }) => {
                const pct = stats.totalCalls > 0 ? (value / stats.totalCalls) * 100 : 0;
                return (
                  <div key={label} className="flex items-center gap-3">
                    <Icon size={14} className={color} />
                    <span className="text-xs text-[#2d2010] w-28 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-[#ece6d6] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn("h-full rounded-full", bg)}
                      />
                    </div>
                    <span className="text-xs text-[#6b5c42] w-16 text-right">{value} ({Math.round(pct)}%)</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
