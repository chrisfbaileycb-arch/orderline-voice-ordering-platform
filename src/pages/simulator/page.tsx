import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import {
  Mic, MicOff, Send, RefreshCcw, ArrowLeft, Zap, CheckCircle2,
  XCircle, AlertTriangle, ChevronRight, ChevronDown, ChevronUp,
  Loader2, Info, Volume2, Clipboard, Play, Clock, Star,
  BarChart2, Globe, Package,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// Extend window for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognitionInstance };
    webkitSpeechRecognition: { new(): SpeechRecognitionInstance };
  }
}

type SpeechRecognitionEvent = Event & {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedItem = {
  name: string;
  quantity: number;
  modifiers: string[];
  confidence: number;
  matchedMenuItem: string | null;
  notes: string | null;
};

type ParseResult = {
  orderType: "pickup" | "delivery" | "dine-in";
  items: ParsedItem[];
  specialInstructions: string | null;
  estimatedTotal: string | null;
  parsingNotes: string;
};

type InjectionStep = {
  ts: number;
  type: "info" | "success" | "warn" | "error";
  message: string;
};

type SimPhase =
  | "idle"          // nothing entered yet
  | "listening"     // speech recognition active
  | "parsing"       // AI is parsing
  | "parsed"        // parse result ready, awaiting inject
  | "injecting"     // bridge injection running
  | "done"          // complete
  | "error";        // failed

// ── Helpers ────────────────────────────────────────────────────────────────────

function confidenceColor(c: number) {
  if (c >= 0.8) return "text-emerald-400";
  if (c >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

function confidenceLabel(c: number) {
  if (c >= 0.8) return "High";
  if (c >= 0.5) return "Medium";
  return "Low";
}

function confidenceBg(c: number) {
  if (c >= 0.8) return "bg-emerald-500/10 border-emerald-500/25";
  if (c >= 0.5) return "bg-yellow-500/10 border-yellow-500/25";
  return "bg-red-500/10 border-red-500/25";
}

const SAMPLE_ORDERS = [
  "I'd like two classic burgers, one with no onions, and a large fries please. I'll pick it up.",
  "Can I get a pepperoni pizza — medium — and two sodas? Oh and extra napkins. It's for delivery.",
  "Three chicken tacos, one with no sour cream, and a side of guac. For dine in.",
  "Give me a cheeseburger combo — large size — with a Coke and an apple pie on the side. Pickup.",
  "I want the pasta special and a Caesar salad. No dressing on the side. Delivery please.",
];

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-[#ece6d6] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={cn(
            "h-full rounded-full",
            value >= 0.8 ? "bg-emerald-500" : value >= 0.5 ? "bg-yellow-500" : "bg-red-500"
          )}
        />
      </div>
      <span className={cn("text-[9px] font-semibold w-12 text-right", confidenceColor(value))}>
        {confidenceLabel(value)}
      </span>
    </div>
  );
}

// ── Parsed item card ──────────────────────────────────────────────────────────

function ParsedItemCard({ item, index }: { item: ParsedItem; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className={cn(
        "bg-[#f0ead8] border rounded-xl p-3 space-y-2",
        confidenceBg(item.confidence)
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-bold text-[#2d2010] bg-[#ece6d6] rounded-lg w-6 h-6 flex items-center justify-center shrink-0">
            {item.quantity}×
          </span>
          <span className="text-xs font-semibold text-[#2d2010] truncate">{item.name}</span>
          {item.matchedMenuItem && item.matchedMenuItem !== item.name && (
            <span className="text-[9px] text-[#9a8a72] truncate">→ {item.matchedMenuItem}</span>
          )}
        </div>
        <div className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0", confidenceBg(item.confidence), confidenceColor(item.confidence))}>
          {Math.round(item.confidence * 100)}%
        </div>
      </div>
      <ConfidenceBar value={item.confidence} />
      {item.modifiers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.modifiers.map((m, i) => (
            <span key={i} className="text-[9px] bg-[#faf6ed] border border-[#cec6b4] text-[#6b5c42] rounded-full px-2 py-0.5">
              {m}
            </span>
          ))}
        </div>
      )}
      {item.notes && (
        <p className="text-[9px] text-[#9a8a72] italic">{item.notes}</p>
      )}
    </motion.div>
  );
}

// ── Injection log ─────────────────────────────────────────────────────────────

function InjectionLog({ steps }: { steps: InjectionStep[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  return (
    <div className="bg-[#f0ead8] border border-[#d8d0c0] rounded-xl p-3 max-h-48 overflow-y-auto font-mono text-[10px] space-y-1">
      {steps.length === 0 ? (
        <span className="text-[#b8a890]">// Injection log will appear here…</span>
      ) : (
        steps.map((s, i) => (
          <div key={i} className={cn(
            "flex gap-2",
            s.type === "success" ? "text-emerald-400" :
            s.type === "error" ? "text-red-400" :
            s.type === "warn" ? "text-yellow-400" : "text-[#6b5c42]"
          )}>
            <span className="text-[#b8a890] shrink-0">
              {new Date(s.ts).toLocaleTimeString("en", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <span>{s.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SimulatorPage() {
  const [orderText, setOrderText] = useState("");
  const [menuContext, setMenuContext] = useState("");
  const [locationId, setLocationId] = useState("charlies-chicago-01");
  const [callerName, setCallerName] = useState("Test Customer");
  const [phase, setPhase] = useState<SimPhase>("idle");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [injectionLog, setInjectionLog] = useState<InjectionStep[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [listening, setListening] = useState(false);
  const [runHistory, setRunHistory] = useState<{ ts: number; text: string; items: number; success: boolean }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Convex
  const parseOrder = useAction(api.voiceSimulator.parseOrder);
  const pushOrder = useMutation(api.bridge.pushOrder);
  const configs = useQuery(api.restaurantConfigs.listAll, {});

  // Speech recognition setup
  const hasSpeech = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!hasSpeech) { toast.error("Speech recognition not available in this browser"); return; }
    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition);
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      setOrderText(transcript);
    };

    rec.onerror = () => {
      setListening(false);
      setPhase("idle");
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setPhase("listening");
    toast.success("Listening… speak your order");
  }, [hasSpeech]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
    if (orderText.trim()) setPhase("idle");
    else setPhase("idle");
  }, [orderText]);

  const addLog = useCallback((msg: string, type: InjectionStep["type"] = "info") => {
    setInjectionLog(prev => [...prev, { ts: Date.now(), type, message: msg }]);
  }, []);

  const handleParse = useCallback(async () => {
    if (!orderText.trim()) { toast.error("Enter or speak an order first"); return; }
    setPhase("parsing");
    setParseResult(null);
    try {
      const result = await parseOrder({
        orderText: orderText.trim(),
        menuContext: menuContext.trim() || undefined,
      }) as ParseResult;
      setParseResult(result);
      setPhase("parsed");
    } catch {
      toast.error("AI parsing failed — check your Hercules API key in Secrets");
      setPhase("error");
    }
  }, [orderText, menuContext, parseOrder]);

  const handleInject = useCallback(async () => {
    if (!parseResult || parseResult.items.length === 0) { toast.error("No items to inject"); return; }
    setPhase("injecting");
    setInjectionLog([]);

    const orderId = `SIM-VOICE-${Date.now()}`;
    addLog(`Starting injection — order ${orderId}`);
    addLog(`${parseResult.items.length} item(s) · type: ${parseResult.orderType}`);

    await new Promise(r => setTimeout(r, 300));

    try {
      await pushOrder({
        orderId,
        customer: callerName,
        type: parseResult.orderType,
        phone: "5550000000",
        items: parseResult.items.map(i => ({
          name: i.matchedMenuItem ?? i.name,
          quantity: i.quantity,
          modifiers: i.modifiers,
        })),
      });
      addLog("Bridge order created in Convex", "success");
    } catch {
      addLog("Failed to create bridge order", "error");
      setPhase("error");
      return;
    }

    await new Promise(r => setTimeout(r, 400));

    // Simulate step-by-step item injection
    for (const item of parseResult.items) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 200));
      const ok = item.confidence >= 0.4;
      if (ok) {
        addLog(`✓ ${item.quantity}× ${item.name}${item.modifiers.length ? ` (${item.modifiers.join(", ")})` : ""}`, "success");
      } else {
        addLog(`⚠ ${item.name} — low confidence, may need manual verify`, "warn");
      }
    }

    await new Promise(r => setTimeout(r, 300));
    addLog(`Injection complete — ${parseResult.items.length} items processed`, "success");
    if (parseResult.specialInstructions) {
      addLog(`Special instructions: "${parseResult.specialInstructions}"`, "info");
    }
    addLog(`Bridge order visible in Live Telemetry panel`, "info");

    const success = parseResult.items.every(i => i.confidence >= 0.4);
    setRunHistory(h => [{
      ts: Date.now(),
      text: orderText.slice(0, 60) + (orderText.length > 60 ? "…" : ""),
      items: parseResult.items.length,
      success,
    }, ...h.slice(0, 9)]);
    setPhase("done");
  }, [parseResult, callerName, orderText, pushOrder, addLog]);

  const handleReset = useCallback(() => {
    setOrderText("");
    setParseResult(null);
    setInjectionLog([]);
    setPhase("idle");
    recognitionRef.current?.stop();
    setListening(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const handleSample = useCallback((s: string) => {
    setOrderText(s);
    setPhase("idle");
    setParseResult(null);
    setInjectionLog([]);
  }, []);

  const overallConfidence = parseResult && parseResult.items.length > 0
    ? parseResult.items.reduce((a, i) => a + i.confidence, 0) / parseResult.items.length
    : 0;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">

      {/* Top bar */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/hub" className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Mic size={13} className="text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-[#2d2010]">Voice Order Simulator</span>
          </div>
          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">AI-POWERED</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(h => !h)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all",
              showHistory ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" : "text-[#9a8a72] border-[#d8d0c0] hover:text-[#2d2010]"
            )}
          >
            <BarChart2 size={10} /> History {runHistory.length > 0 && `(${runHistory.length})`}
          </button>
          <button
            onClick={() => setShowSettings(s => !s)}
            className={cn(
              "flex items-center gap-1.5 text-[10px] border rounded-lg px-2.5 py-1.5 cursor-pointer transition-all",
              showSettings ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" : "text-[#9a8a72] border-[#d8d0c0] hover:text-[#2d2010]"
            )}
          >
            <Package size={10} /> Settings {showSettings ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {(phase === "done" || phase === "error" || phase === "parsed" || orderText) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[10px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 cursor-pointer transition-all"
            >
              <RefreshCcw size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
                <p className="text-[9px] text-[#9a8a72] uppercase tracking-widest font-semibold">Simulation Context</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-[#9a8a72] mb-1">Location ID</label>
                    {configs && configs.length > 0 ? (
                      <select
                        value={locationId}
                        onChange={e => setLocationId(e.target.value)}
                        className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono focus:outline-none focus:border-emerald-500/40 cursor-pointer"
                      >
                        {configs.map(c => (
                          <option key={c.locationId} value={c.locationId}>{c.storeName} ({c.locationId})</option>
                        ))}
                        <option value="test-location-99">Test Location 99</option>
                      </select>
                    ) : (
                      <input
                        value={locationId}
                        onChange={e => setLocationId(e.target.value)}
                        placeholder="charlies-chicago-01"
                        className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono focus:outline-none focus:border-emerald-500/40"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#9a8a72] mb-1">Caller name</label>
                    <input
                      value={callerName}
                      onChange={e => setCallerName(e.target.value)}
                      placeholder="Test Customer"
                      className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] focus:outline-none focus:border-emerald-500/40"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-[#9a8a72]">Menu context (optional — helps AI match items accurately)</label>
                    <button onClick={() => setShowMenu(m => !m)} className="text-[9px] text-[#9a8a72] hover:text-[#2d2010] cursor-pointer">
                      {showMenu ? "Hide" : "Show"}
                    </button>
                  </div>
                  {showMenu && (
                    <textarea
                      value={menuContext}
                      onChange={e => setMenuContext(e.target.value)}
                      placeholder={"Classic Burger $12.99\nCheeseburger $13.99\nFries (S/M/L) $3/$4/$5\nLemonade $3.99\nCaesar Salad $9.99\n..."}
                      rows={4}
                      className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2 text-[11px] text-[#2d2010] placeholder-[#b8a890] focus:outline-none focus:border-emerald-500/40 resize-none font-mono"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order input */}
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2d2010]">Customer Order</span>
              {phase === "listening" && (
                <span className="flex items-center gap-1 text-[9px] text-red-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /> Recording…
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {hasSpeech && (
                <button
                  onClick={listening ? stopListening : startListening}
                  disabled={phase === "parsing" || phase === "injecting"}
                  className={cn(
                    "flex items-center gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5 border cursor-pointer transition-all",
                    listening
                      ? "text-red-400 bg-red-500/10 border-red-500/25 hover:bg-red-500/20 animate-pulse"
                      : "text-[#9a8a72] border-[#d8d0c0] hover:text-emerald-400 hover:border-emerald-500/30"
                  )}
                >
                  {listening ? <MicOff size={10} /> : <Mic size={10} />}
                  {listening ? "Stop" : "Speak"}
                </button>
              )}
              <button
                onClick={() => navigator.clipboard.readText().then(t => setOrderText(t)).catch(() => toast.error("Clipboard read failed"))}
                className="flex items-center gap-1 text-[9px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
              >
                <Clipboard size={9} /> Paste
              </button>
            </div>
          </div>

          <div className="px-4 pb-3">
            <textarea
              ref={textareaRef}
              value={orderText}
              onChange={e => { setOrderText(e.target.value); if (phase !== "idle") { setPhase("idle"); setParseResult(null); } }}
              placeholder={"Type or speak a natural order...\ne.g. \"I'd like two classic burgers, one with no onions, and a large fries. I'll pick it up.\""}
              rows={4}
              disabled={phase === "parsing" || phase === "injecting"}
              className="w-full bg-[#f0ead8] border border-[#cec6b4] rounded-xl px-4 py-3 text-sm text-[#2d2010] placeholder-[#b8a890] focus:outline-none focus:border-emerald-500/40 resize-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Sample orders */}
          <div className="px-4 pb-4">
            <p className="text-[9px] text-[#b8a890] mb-2 uppercase tracking-wider">Sample orders</p>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_ORDERS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSample(s)}
                  className="text-[9px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] hover:border-[#cec6b4] rounded-lg px-2 py-1 cursor-pointer transition-all truncate max-w-xs"
                >
                  {s.slice(0, 45)}…
                </button>
              ))}
            </div>
          </div>

          {/* Parse button */}
          <div className="border-t border-[#d8d0c0] px-4 py-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleParse}
              disabled={!orderText.trim() || phase === "parsing" || phase === "injecting"}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer",
                phase === "parsing"
                  ? "bg-[#ece6d6] text-[#9a8a72] cursor-wait border border-[#cec6b4]"
                  : phase === "parsed" || phase === "done"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                  : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-40"
              )}
            >
              {phase === "parsing"
                ? <><Loader2 size={14} className="animate-spin" /> Parsing with AI…</>
                : phase === "parsed" || phase === "done"
                ? <><RefreshCcw size={14} /> Re-parse order</>
                : <><Zap size={14} /> Parse Order with AI</>}
            </motion.button>
          </div>
        </div>

        {/* Parse result */}
        <AnimatePresence>
          {parseResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Summary bar */}
              <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#2d2010]">AI Understood</span>
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                      parseResult.orderType === "pickup"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                        : parseResult.orderType === "delivery"
                        ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/25"
                        : "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                    )}>
                      {parseResult.orderType}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {parseResult.estimatedTotal && (
                      <span className="text-xs text-emerald-400 font-semibold">{parseResult.estimatedTotal}</span>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-[#9a8a72]">Avg confidence</span>
                      <span className={cn("text-[10px] font-bold", confidenceColor(overallConfidence))}>
                        {Math.round(overallConfidence * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="grid gap-2">
                  {parseResult.items.map((item, i) => (
                    <ParsedItemCard key={i} item={item} index={i} />
                  ))}
                </div>

                {/* Special instructions */}
                {parseResult.specialInstructions && (
                  <div className="mt-3 flex items-start gap-2 bg-[#f0ead8]/60 border border-[#d8d0c0] rounded-lg px-3 py-2">
                    <Info size={11} className="text-[#9a8a72] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#6b5c42]">{parseResult.specialInstructions}</p>
                  </div>
                )}

                {/* Parsing notes */}
                {parseResult.parsingNotes && (
                  <p className="mt-2 text-[9px] text-[#9a8a72] italic">{parseResult.parsingNotes}</p>
                )}
              </div>

              {/* Inject button */}
              {phase !== "done" && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleInject}
                  disabled={phase === "injecting" || parseResult.items.length === 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer",
                    phase === "injecting"
                      ? "bg-violet-500/10 border border-violet-500/20 text-violet-400 cursor-wait"
                      : "bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 disabled:opacity-50"
                  )}
                >
                  {phase === "injecting"
                    ? <><Loader2 size={14} className="animate-spin" /> Injecting into POS…</>
                    : <><Play size={14} /> Inject into POS Bridge</>}
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Injection log */}
        <AnimatePresence>
          {(injectionLog.length > 0 || phase === "injecting") && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2d2010]">Injection Log</span>
                  {phase === "injecting" && (
                    <span className="text-[9px] text-violet-400 animate-pulse flex items-center gap-1">
                      <Loader2 size={9} className="animate-spin" /> running
                    </span>
                  )}
                  {phase === "done" && (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                      <CheckCircle2 size={9} /> complete
                    </span>
                  )}
                </div>
                {phase === "done" && (
                  <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2.5 py-1">
                    <CheckCircle2 size={9} /> Order in bridge queue — check Live Telemetry
                  </div>
                )}
              </div>
              <InjectionLog steps={injectionLog} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Run history */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="space-y-3"
            >
              <p className="text-[10px] font-semibold text-[#9a8a72] uppercase tracking-widest">Run history</p>
              {runHistory.length === 0 ? (
                <p className="text-[10px] text-[#b8a890] italic">No runs yet this session.</p>
              ) : (
                <div className="space-y-2">
                  {runHistory.map((r, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg border",
                      r.success ? "bg-emerald-500/5 border-emerald-500/15" : "bg-yellow-500/5 border-yellow-500/15"
                    )}>
                      {r.success
                        ? <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                        : <AlertTriangle size={11} className="text-yellow-400 shrink-0" />}
                      <p className="flex-1 text-[10px] text-[#6b5c42] truncate">{r.text}</p>
                      <span className="text-[9px] text-[#9a8a72] shrink-0">{r.items} items</span>
                      <span className="text-[9px] text-[#b8a890] shrink-0 font-mono">
                        {new Date(r.ts).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-[#f0ead8]/60 border border-[#d8d0c0] rounded-xl">
          <Info size={11} className="text-[#9a8a72] mt-0.5 shrink-0" />
          <p className="text-[9px] text-[#9a8a72] leading-relaxed">
            Speak or type any natural order. The AI parses intent, extracts items with confidence scores, then injects into the bridge queue. Items appear in Live Telemetry and the Kitchen Board in real time.
            {!hasSpeech && " (Speech recognition requires Chrome or Edge — use type mode instead.)"}
          </p>
        </div>

      </div>
    </div>
  );
}
