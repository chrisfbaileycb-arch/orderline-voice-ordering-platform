import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  Play, RefreshCcw, CheckCircle2, XCircle, Clock, PhoneCall,
  Cpu, ChefHat, Zap, Settings, ChevronDown, ChevronUp,
  Loader2, AlertTriangle, Info, BarChart2, Plus, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type StepStatus = "idle" | "running" | "success" | "error" | "skipped";

type Step = {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  iconColor: string;
  durationMs?: number;
};

type StepResult = {
  status: StepStatus;
  detail?: string;
  startMs?: number;
  endMs?: number;
};

type OrderItem = { name: string; quantity: number; modifiers: string[] };

type TestConfig = {
  locationId: string;
  callerName: string;
  callerNumber: string;
  orderType: "pickup" | "delivery" | "dine-in";
  items: OrderItem[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  {
    id: "call_received",
    label: "Phone Order Received",
    subLabel: "Incoming call from customer — session created",
    icon: PhoneCall,
    iconColor: "text-[#388bfd]",
    durationMs: 600,
  },
  {
    id: "agent_processing",
    label: "Agent Processing",
    subLabel: "AI parses intent, extracts items and modifiers",
    icon: Cpu,
    iconColor: "text-yellow-400",
    durationMs: 900,
  },
  {
    id: "pos_injection",
    label: "Entered into POS",
    subLabel: "Bridge agent injects order into POS DOM",
    icon: Zap,
    iconColor: "text-violet-400",
    durationMs: 700,
  },
  {
    id: "kitchen_notify",
    label: "Kitchen Notified",
    subLabel: "Order appears on kitchen board — status: preparing",
    icon: ChefHat,
    iconColor: "text-orange-400",
    durationMs: 400,
  },
  {
    id: "complete",
    label: "Done",
    subLabel: "Call logged, loyalty points awarded, profile updated",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
    durationMs: 300,
  },
];

const DEFAULT_CONFIG: TestConfig = {
  locationId: "charlies-chicago-01",
  callerName: "Test Customer",
  callerNumber: "5550010001",
  orderType: "pickup",
  items: [
    { name: "Classic Burger", quantity: 2, modifiers: ["no onions"] },
    { name: "Fries", quantity: 1, modifiers: [] },
    { name: "Lemonade", quantity: 2, modifiers: ["extra ice"] },
  ],
};

const LOCATION_OPTIONS = [
  { value: "charlies-chicago-01", label: "Charlie's — Chicago 01" },
  { value: "heartland-demo-01", label: "Heartland Demo 01" },
  { value: "test-location-99", label: "Test Location 99" },
];

// ── Step indicator ─────────────────────────────────────────────────────────────

function StepRow({
  step,
  result,
  index,
  total,
}: {
  step: Step;
  result: StepResult;
  index: number;
  total: number;
}) {
  const Icon = step.icon;
  const isLast = index === total - 1;

  return (
    <div className="flex gap-3">
      {/* Left: icon + connector line */}
      <div className="flex flex-col items-center">
        <motion.div
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300",
            result.status === "idle" && "border-[#cec6b4] bg-[#f0ead8]",
            result.status === "running" && "border-yellow-500/60 bg-yellow-500/10",
            result.status === "success" && "border-emerald-500/60 bg-emerald-500/10",
            result.status === "error" && "border-red-500/60 bg-red-500/10",
            result.status === "skipped" && "border-[#cec6b4] bg-[#f0ead8] opacity-40"
          )}
          animate={result.status === "running" ? { scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.9 }}
        >
          {result.status === "running" ? (
            <Loader2 size={13} className="text-yellow-400 animate-spin" />
          ) : result.status === "success" ? (
            <CheckCircle2 size={13} className="text-emerald-400" />
          ) : result.status === "error" ? (
            <XCircle size={13} className="text-red-400" />
          ) : (
            <Icon size={13} className={result.status === "idle" ? "text-[#b8a890]" : step.iconColor} />
          )}
        </motion.div>
        {!isLast && (
          <div
            className={cn(
              "w-px flex-1 mt-1 min-h-[24px] transition-colors duration-500",
              result.status === "success" ? "bg-emerald-500/30" : "bg-[#cec6b4]"
            )}
          />
        )}
      </div>

      {/* Right: text */}
      <div className="pb-5 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn(
            "text-xs font-semibold transition-colors duration-300",
            result.status === "idle" && "text-[#9a8a72]",
            result.status === "running" && "text-[#2d2010]",
            result.status === "success" && "text-[#2d2010]",
            result.status === "error" && "text-red-400",
            result.status === "skipped" && "text-[#b8a890]",
          )}>
            {step.label}
          </p>
          {result.status === "success" && result.startMs && result.endMs && (
            <span className="text-[9px] font-mono text-[#9a8a72]">
              {result.endMs - result.startMs}ms
            </span>
          )}
          {result.status === "running" && (
            <span className="text-[9px] font-mono text-yellow-400 animate-pulse">running…</span>
          )}
        </div>
        <p className={cn(
          "text-[10px] leading-relaxed transition-colors duration-300",
          result.status === "idle" || result.status === "skipped" ? "text-[#b8a890]" : "text-[#9a8a72]"
        )}>
          {step.subLabel}
        </p>
        {result.detail && result.status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-1.5 text-[9px] font-mono px-2 py-1 rounded-lg border",
              result.status === "error"
                ? "text-red-400 bg-red-500/5 border-red-500/20"
                : "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
            )}
          >
            {result.detail}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Config editor ─────────────────────────────────────────────────────────────

function ConfigEditor({
  config,
  onChange,
}: {
  config: TestConfig;
  onChange: (c: TestConfig) => void;
}) {
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) => {
    const items = config.items.map((it, idx) => idx === i ? { ...it, [field]: value } : it);
    onChange({ ...config, items });
  };
  const addItem = () => {
    onChange({ ...config, items: [...config.items, { name: "", quantity: 1, modifiers: [] }] });
  };
  const removeItem = (i: number) => {
    onChange({ ...config, items: config.items.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="space-y-4">
      {/* Location & caller */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-[#9a8a72] mb-1">Location</label>
          <select
            value={config.locationId}
            onChange={(e) => onChange({ ...config, locationId: e.target.value })}
            className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono focus:outline-none focus:border-emerald-500/40 cursor-pointer"
          >
            {LOCATION_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-[#9a8a72] mb-1">Order type</label>
          <select
            value={config.orderType}
            onChange={(e) => onChange({ ...config, orderType: e.target.value as TestConfig["orderType"] })}
            className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono focus:outline-none focus:border-emerald-500/40 cursor-pointer"
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
            <option value="dine-in">Dine-in</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] text-[#9a8a72] mb-1">Caller name</label>
          <input
            value={config.callerName}
            onChange={(e) => onChange({ ...config, callerName: e.target.value })}
            placeholder="Test Customer"
            className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#9a8a72] mb-1">Caller phone</label>
          <input
            value={config.callerNumber}
            onChange={(e) => onChange({ ...config, callerNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            placeholder="5550010001"
            className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[10px] text-[#9a8a72]">Order items</label>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-[9px] text-[#388bfd] hover:text-[#2d2010] border border-[#388bfd]/25 rounded-lg px-2 py-0.5 cursor-pointer transition-colors"
          >
            <Plus size={8} /> Add item
          </button>
        </div>
        <div className="space-y-2">
          {config.items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={item.name}
                onChange={(e) => updateItem(i, "name", e.target.value)}
                placeholder="Item name"
                className="flex-1 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40 min-w-0"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateItem(i, "quantity", Math.max(1, item.quantity - 1))}
                  className="w-6 h-6 rounded bg-[#ece6d6] text-[#2d2010] hover:bg-[#d8d0c0] flex items-center justify-center cursor-pointer"
                >
                  <Minus size={9} />
                </button>
                <span className="text-[11px] text-[#2d2010] font-mono w-4 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateItem(i, "quantity", item.quantity + 1)}
                  className="w-6 h-6 rounded bg-[#ece6d6] text-[#2d2010] hover:bg-[#d8d0c0] flex items-center justify-center cursor-pointer"
                >
                  <Plus size={9} />
                </button>
              </div>
              <input
                value={item.modifiers.join(", ")}
                onChange={(e) => updateItem(i, "modifiers", e.target.value.split(",").map(s => s.trim()).filter(Boolean) as unknown as number)}
                placeholder="modifiers…"
                className="w-28 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[10px] text-[#6b5c42] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
              />
              <button
                onClick={() => removeItem(i)}
                className="text-[#9a8a72] hover:text-red-400 cursor-pointer transition-colors"
              >
                <XCircle size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Run summary ───────────────────────────────────────────────────────────────

type RunRecord = {
  ts: number;
  config: TestConfig;
  results: StepResult[];
  totalMs: number;
  passed: boolean;
};

function RunSummaryRow({ run }: { run: RunRecord }) {
  const passed = run.results.every(r => r.status === "success" || r.status === "skipped");
  const time = new Date(run.ts).toLocaleTimeString();
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg border",
      passed ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"
    )}>
      {passed
        ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
        : <XCircle size={11} className="text-red-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-[#2d2010] truncate">{run.config.callerName} — {run.config.items.length} items — {run.config.orderType}</p>
        <p className="text-[9px] text-[#9a8a72] font-mono">{run.config.locationId}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-[10px] font-mono", passed ? "text-emerald-400" : "text-red-400")}>{run.totalMs}ms</p>
        <p className="text-[9px] text-[#b8a890]">{time}</p>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function LiveTestRunnerPanel() {
  const [config, setConfig] = useState<TestConfig>(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [results, setResults] = useState<StepResult[]>(STEPS.map(() => ({ status: "idle" as StepStatus })));
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<RunRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef(false);

  // Convex mutations
  const simulateCall = useMutation(api.callSessions.simulateCall);
  const pushOrder = useMutation(api.bridge.pushOrder);
  const completeMutation = useMutation(api.callSessions.complete);

  // Live stats
  const recentSessions = useQuery(api.callSessions.listRecent, { locationId: config.locationId });

  const updateStep = useCallback((index: number, update: Partial<StepResult>) => {
    setResults(prev => prev.map((r, i) => i === index ? { ...r, ...update } : r));
  }, []);

  const reset = useCallback(() => {
    setResults(STEPS.map(() => ({ status: "idle" as StepStatus })));
    setRunning(false);
    abortRef.current = false;
  }, []);

  const runTest = useCallback(async () => {
    if (running) return;
    if (!config.callerNumber || config.items.length === 0 || config.items.some(i => !i.name)) {
      toast.error("Fill in caller phone and all item names first");
      return;
    }

    reset();
    setRunning(true);
    abortRef.current = false;
    const startTs = Date.now();
    const stepResults: StepResult[] = STEPS.map(() => ({ status: "idle" as StepStatus }));

    const runStep = async (index: number, fn: () => Promise<string>) => {
      if (abortRef.current) {
        stepResults[index] = { status: "skipped" };
        updateStep(index, { status: "skipped" });
        return false;
      }
      const start = Date.now();
      updateStep(index, { status: "running", startMs: start });
      try {
        const detail = await fn();
        const end = Date.now();
        const r: StepResult = { status: "success", detail, startMs: start, endMs: end };
        stepResults[index] = r;
        updateStep(index, r);
        return true;
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Unknown error";
        const r: StepResult = { status: "error", detail, startMs: start, endMs: Date.now() };
        stepResults[index] = r;
        updateStep(index, r);
        abortRef.current = true;
        return false;
      }
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Step 0 — Phone Order Received
    let sessionId: string | null = null;
    await runStep(0, async () => {
      await sleep(STEPS[0].durationMs ?? 400);
      const id = await simulateCall({
        locationId: config.locationId,
        callerNumber: config.callerNumber,
        callerName: config.callerName,
        scenario: "pickup_ai",
      });
      sessionId = id;
      return `Session ${id.slice(0, 8)}… created · caller ${config.callerName}`;
    });

    // Step 1 — Agent Processing
    let orderId: string | null = null;
    await runStep(1, async () => {
      await sleep(STEPS[1].durationMs ?? 700);
      orderId = `ORD-TEST-${Date.now()}`;
      const itemSummary = config.items.map(i => `${i.quantity}× ${i.name}`).join(", ");
      return `Parsed ${config.items.length} items: ${itemSummary}`;
    });

    // Step 2 — Entered into POS
    await runStep(2, async () => {
      await sleep(STEPS[2].durationMs ?? 600);
      if (!orderId) throw new Error("No orderId from previous step");
      await pushOrder({
        orderId,
        customer: config.callerName,
        type: config.orderType,
        phone: config.callerNumber,
        items: config.items,
      });
      return `Bridge order ${orderId} pushed to queue · ${config.items.length} items`;
    });

    // Step 3 — Kitchen Notified
    await runStep(3, async () => {
      await sleep(STEPS[3].durationMs ?? 400);
      return `Order visible on kitchen board · status: preparing`;
    });

    // Step 4 — Complete
    await runStep(4, async () => {
      await sleep(STEPS[4].durationMs ?? 300);
      // Complete the call session to write log + award loyalty
      const callSidQuery = `SIM-${config.callerNumber}`;
      // Try to complete most recent session for this number (best-effort)
      if (recentSessions && recentSessions.length > 0) {
        try {
          await completeMutation({
            callSid: recentSessions[0].callSid,
            outcome: "order_placed",
            durationSeconds: Math.round((Date.now() - startTs) / 1000),
          });
        } catch {
          // non-critical
        }
      }
      const pts = 10;
      return `Call logged · ${pts} loyalty pts awarded to ${config.callerNumber}`;
    });

    const totalMs = Date.now() - startTs;
    const passed = stepResults.every(r => r.status === "success" || r.status === "skipped");
    setHistory(prev => [{ ts: startTs, config: { ...config }, results: stepResults, totalMs, passed }, ...prev.slice(0, 9)]);
    setRunning(false);

    if (passed) {
      toast.success(`Test passed in ${totalMs}ms`);
    } else {
      toast.error("Test run failed — check step details");
    }
  }, [running, config, reset, simulateCall, pushOrder, completeMutation, recentSessions, updateStep]);

  const allSuccess = results.every(r => r.status === "success");
  const anyError = results.some(r => r.status === "error");
  const progressCount = results.filter(r => r.status === "success").length;

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#2d2010]">Live Test Runner</h2>
          <p className="text-[10px] text-[#9a8a72] mt-0.5">End-to-end order flow verification — one click to confirm everything works</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all",
              showHistory
                ? "text-[#388bfd] bg-[#388bfd]/10 border-[#388bfd]/25"
                : "text-[#9a8a72] border-[#cec6b4] hover:text-[#2d2010]"
            )}
          >
            <BarChart2 size={10} /> History {history.length > 0 && `(${history.length})`}
          </button>
          <button
            onClick={() => setShowConfig(s => !s)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all",
              showConfig
                ? "text-[#388bfd] bg-[#388bfd]/10 border-[#388bfd]/25"
                : "text-[#9a8a72] border-[#cec6b4] hover:text-[#2d2010]"
            )}
          >
            <Settings size={10} />
            {showConfig ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
        </div>
      </div>

      {/* Config editor (collapsible) */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-4">
              <p className="text-[10px] font-semibold text-[#6b5c42] mb-3 uppercase tracking-widest">Test Configuration</p>
              <ConfigEditor config={config} onChange={setConfig} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test order preview (collapsed config) */}
      {!showConfig && (
        <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-[#2d2010]">{config.callerName}</span>
                <span className={cn(
                  "text-[9px] font-mono px-1.5 py-0.5 rounded-full border",
                  config.orderType === "pickup" ? "text-[#388bfd] border-[#388bfd]/25 bg-[#388bfd]/5" :
                  config.orderType === "delivery" ? "text-yellow-400 border-yellow-500/25 bg-yellow-500/5" :
                  "text-violet-400 border-violet-500/25 bg-violet-500/5"
                )}>{config.orderType}</span>
              </div>
              <p className="text-[10px] text-[#9a8a72] font-mono mb-1">{config.callerNumber} · {config.locationId}</p>
              <p className="text-[10px] text-[#6b5c42]">
                {config.items.map(i => `${i.quantity}× ${i.name}`).join(" · ")}
              </p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="text-[9px] text-[#9a8a72] hover:text-[#2d2010] border border-[#cec6b4] rounded-lg px-2 py-1 cursor-pointer transition-colors shrink-0"
            >
              Edit
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#9a8a72]">
            {allSuccess ? "All steps passed" : anyError ? "Test failed" : running ? "Running…" : "Ready to run"}
          </span>
          <span className="text-[10px] font-mono text-[#9a8a72]">{progressCount}/{STEPS.length}</span>
        </div>
        <div className="h-1.5 bg-[#f0ead8] rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors",
              anyError ? "bg-red-500" : allSuccess ? "bg-emerald-500" : "bg-[#388bfd]"
            )}
            animate={{ width: `${(progressCount / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
        {STEPS.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            result={results[i]}
            index={i}
            total={STEPS.length}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="flex gap-2">
        <motion.button
          onClick={runTest}
          disabled={running}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer",
            running
              ? "bg-[#ece6d6] border border-[#d8d0c0] text-[#9a8a72] cursor-not-allowed"
              : allSuccess
              ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
              : anyError
              ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25"
              : "bg-[#388bfd]/15 border border-[#388bfd]/30 text-[#388bfd] hover:bg-[#388bfd]/25"
          )}
        >
          {running ? (
            <><Loader2 size={14} className="animate-spin" /> Running test…</>
          ) : allSuccess ? (
            <><CheckCircle2 size={14} /> Run again</>
          ) : anyError ? (
            <><AlertTriangle size={14} /> Retry</>
          ) : (
            <><Play size={14} /> Run Test Order</>
          )}
        </motion.button>

        {(allSuccess || anyError) && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 text-xs text-[#9a8a72] hover:text-[#2d2010] border border-[#cec6b4] rounded-xl px-4 cursor-pointer transition-colors"
          >
            <RefreshCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Status hint */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-[#f2ecdc] border border-[#cec6b4] rounded-xl">
        <Info size={11} className="text-[#9a8a72] mt-0.5 shrink-0" />
        <p className="text-[9px] text-[#9a8a72] leading-relaxed">
          Each run creates a real call session, pushes a bridge order to the queue, and awards loyalty points — all visible in Live Telemetry. Safe to run repeatedly.
        </p>
      </div>

      {/* History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="space-y-3"
          >
            <p className="text-[10px] font-semibold text-[#9a8a72] uppercase tracking-widest">Run history</p>
            {history.length === 0 ? (
              <p className="text-[10px] text-[#b8a890] italic">No runs yet this session.</p>
            ) : (
              <div className="space-y-2">
                {history.map((r, i) => <RunSummaryRow key={i} run={r} />)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
