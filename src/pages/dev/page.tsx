import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Lock, Terminal, Phone, ChefHat, BarChart2, Cpu, Map,
  Globe, PhoneCall, ArrowRight, Eye, EyeOff, Zap,
  LayoutDashboard, FlaskConical, BookOpen, X,
  Activity, UserSearch, ScanLine, Package, Play, Building2, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import TelemetryPanel from "./_panels/TelemetryPanel.tsx";
import CustomerLookupPanel from "./_panels/CustomerLookupPanel.tsx";
import SelectorMapperPanel from "./_panels/SelectorMapperPanel.tsx";
import LiveTestRunnerPanel from "./_panels/LiveTestRunnerPanel.tsx";

// ── PIN gate ──────────────────────────────────────────────────────────────────

const DEV_PIN = "1234";
const SESSION_KEY = "orderline:dev-unlocked";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const attempt = (val: string) => {
    if (val === DEV_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setShake(true);
      setTimeout(() => { setDigits(""); setShake(false); }, 600);
    }
  };

  const handleKey = (d: string) => {
    if (digits.length >= 4) return;
    const next = digits + d;
    setDigits(next);
    if (next.length === 4) attempt(next);
  };

  const handleBackspace = () => setDigits((d) => d.slice(0, -1));

  return (
    <div className="min-h-screen bg-[#f0ead8] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#388bfd]/10 border border-[#388bfd]/25 flex items-center justify-center mx-auto mb-5">
            <Lock size={22} className="text-[#388bfd]" />
          </div>
          <h1 className="text-xl font-bold text-[#2d2010] mb-1">Developer Room</h1>
          <p className="text-[#6b5c42] text-sm">Enter PIN to access internal tools</p>
        </div>

        <motion.div
          animate={shake ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex justify-center gap-4 mb-8"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-150",
                i < digits.length
                  ? shake ? "bg-red-500 border-red-500" : "bg-[#388bfd] border-[#388bfd]"
                  : "bg-transparent border-[#d8d0c0]"
              )}
            />
          ))}
        </motion.div>

        <input
          ref={inputRef}
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={4}
          value={digits}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, "").slice(0, 4);
            setDigits(val);
            if (val.length === 4) attempt(val);
          }}
          className="opacity-0 absolute w-0 h-0"
          aria-hidden="true"
        />

        <div className="grid grid-cols-3 gap-3 mb-4">
          {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k) => {
            if (k === "") return <div key="empty" />;
            return (
              <button
                key={k}
                onClick={() => k === "⌫" ? handleBackspace() : handleKey(k)}
                className="h-14 rounded-xl bg-[#ece6d6] border border-[#d8d0c0] text-[#2d2010] text-lg font-semibold hover:bg-[#d8d0c0] hover:border-[#388bfd]/40 active:scale-95 transition-all cursor-pointer"
              >
                {k}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShow(!show)}
          className="w-full flex items-center justify-center gap-1.5 text-[#9a8a72] hover:text-[#6b5c42] text-xs mt-2 transition-colors cursor-pointer"
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />} {show ? "Hide" : "Show"} digits
        </button>

        <div className="mt-8 text-center">
          <Link to="/" className="text-[#9a8a72] hover:text-[#6b5c42] text-xs flex items-center gap-1 justify-center transition-colors">
            <ArrowRight size={11} className="rotate-180" /> Back to landing page
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

// ── Tab definitions ────────────────────────────────────────────────────────────

type TabType = "native" | "iframe";

type Tab = {
  id: string;
  label: string;
  icon: React.ElementType;
  desc: string;
  href?: string;
  color: string;
  tag: string;
  type: TabType;
  badge?: string;
};

const TABS: Tab[] = [
  // ── Native live panels ────────────────────────────────────────────────────
  {
    id: "test-runner",
    label: "Test Runner",
    icon: Play,
    desc: "One-click end-to-end order flow: call received → agent processing → POS injection → kitchen notify → done. Repeatable anytime.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tag: "Live Panels",
    type: "native",
    badge: "E2E",
  },
  {
    id: "telemetry",
    label: "Live Telemetry",
    icon: Activity,
    desc: "Real-time call sessions, bridge order queue, 24h stats, and call simulator — live Convex subscriptions.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tag: "Live Panels",
    type: "native",
    badge: "LIVE",
  },
  {
    id: "customer-lookup",
    label: "Customer Lookup",
    icon: UserSearch,
    desc: "Phone → profile resolution. Add, lookup, and manage the customer identity database in real time.",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tag: "Live Panels",
    type: "native",
    badge: "LIVE",
  },
  {
    id: "selector-mapper",
    label: "Selector Mapper",
    icon: ScanLine,
    desc: "Live DOM selector tester, menu schema extractor, config saver, and injection queue simulator.",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    tag: "Live Panels",
    type: "native",
    badge: "LIVE",
  },
  {
    id: "simulator",
    label: "Voice Simulator",
    icon: Mic,
    desc: "Type or speak a natural order — AI parses it into structured items with confidence scores, then injects into the POS bridge.",
    href: "/simulator",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tag: "Pages",
    type: "iframe",
    badge: "AI",
  },
  {
    id: "admin",
    label: "Restaurant Admin",
    icon: Building2,
    desc: "PIN-protected admin panel — manage all onboarded restaurants, contacts, Twilio numbers, POS URLs, and status.",
    href: "/admin",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tag: "Pages",
    type: "iframe",
    badge: "ADMIN",
  },
  {
    id: "sdk",
    label: "Agent SDK",
    icon: Package,
    desc: "window.revenuePulse API docs, live bundle download (agent.js + config.json + README), and test harness.",
    href: "/sdk",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "customers",
    label: "Customer Roster",
    icon: UserSearch,
    desc: "Full customer identity roster with loyalty tiers, call history, and profile editor.",
    href: "/customers",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tag: "Pages",
    type: "iframe",
  },
  // ── Iframe pages ──────────────────────────────────────────────────────────
  {
    id: "hub",
    label: "System Map",
    icon: Globe,
    desc: "All pages, how they connect, and the full call flow diagram.",
    href: "/hub",
    color: "text-[#388bfd] bg-[#388bfd]/10 border-[#388bfd]/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "dashboard",
    label: "Call Dashboard",
    icon: LayoutDashboard,
    desc: "Tablet view — hold queue, active AI calls, take-over controls, audio alert.",
    href: "/dashboard",
    color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "kitchen",
    label: "Kitchen Board",
    icon: ChefHat,
    desc: "Drag-and-drop order workflow: New → Confirmed → Preparing → Ready → Done.",
    href: "/kitchen",
    color: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "analytics",
    label: "Call Analytics",
    icon: BarChart2,
    desc: "Per-location totals, conversion rate, 24h volume chart, and full call log.",
    href: "/analytics",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "bridge",
    label: "Generic Bridge",
    icon: Cpu,
    desc: "Split-screen demo: live order manifest + simulated POS terminal. 3 test scenarios.",
    href: "/bridge",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "location-bridge",
    label: "Charlie's Bridge",
    icon: PhoneCall,
    desc: "Per-location bridge for Charlie's Restaurant — real Twilio orders + Toast POS.",
    href: "/bridge/charlies-demo",
    color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "onboarding",
    label: "Onboarding Wizard",
    icon: Map,
    desc: "4-step wizard: map POS DOM selectors, extract menu schema, save config, download bundle.",
    href: "/onboarding",
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "order",
    label: "Customer Order Chat",
    icon: Phone,
    desc: "Demo chat interface for Osteria Bella — 18 menu items, cart, and order submit.",
    href: "/order",
    color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    tag: "Pages",
    type: "iframe",
  },
  {
    id: "integration",
    label: "API Integration Guide",
    icon: BookOpen,
    desc: "Full API reference for POST /api/order — curl/JS/Python/Twilio examples, live feed.",
    href: "/integration",
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    tag: "Pages",
    type: "iframe",
  },
];

const TAG_ORDER = ["Live Panels", "Pages"];

// ── Native panel router ────────────────────────────────────────────────────────

function NativePanel({ id }: { id: string }) {
  if (id === "test-runner")    return <LiveTestRunnerPanel />;
  if (id === "telemetry")      return <TelemetryPanel />;
  if (id === "customer-lookup") return <CustomerLookupPanel />;
  if (id === "selector-mapper") return <SelectorMapperPanel />;
  return null;
}

// ── Main shell ─────────────────────────────────────────────────────────────────

export default function DevRoom() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("t");
    if (t) setActiveTab(t);
  }, []);

  const handleTabSelect = (id: string) => {
    setActiveTab(id);
    setSearchParams({ t: id });
  };

  const handleExit = () => {
    setActiveTab(null);
    setSearchParams({});
  };

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  const activeTabDef = TABS.find((t) => t.id === activeTab);
  const grouped = TAG_ORDER.map((tag) => ({ tag, tabs: TABS.filter((t) => t.tag === tag) })).filter((g) => g.tabs.length > 0);

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-[#cec6b4] bg-[#faf6ed] px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#388bfd]/15 border border-[#388bfd]/30 flex items-center justify-center">
            <Terminal size={13} className="text-[#388bfd]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#2d2010]">Developer Room</span>
            <span className="text-[10px] font-mono bg-[#388bfd]/10 text-[#388bfd] border border-[#388bfd]/20 rounded px-1.5 py-0.5">PRIVATE</span>
          </div>
          {activeTabDef && (
            <>
              <span className="text-[#b8a890]">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-[#6b5c42]">{activeTabDef.label}</span>
                {activeTabDef.badge && (
                  <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-1.5 py-0.5">{activeTabDef.badge}</span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeTab && activeTabDef?.href && (
            <a
              href={activeTabDef.href}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] rounded px-2.5 py-1 flex items-center gap-1 transition-colors"
            >
              Open full page <ArrowRight size={10} />
            </a>
          )}
          <button
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false); }}
            className="text-[10px] text-[#9a8a72] hover:text-[#6b5c42] border border-[#cec6b4] rounded px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Lock size={10} /> Lock
          </button>
          <Link to="/" className="text-[10px] text-[#9a8a72] hover:text-[#6b5c42] border border-[#cec6b4] rounded px-2.5 py-1 flex items-center gap-1 transition-colors">
            <Globe size={10} /> Landing
          </Link>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-[#cec6b4] bg-[#f0ead8] flex flex-col overflow-y-auto">
          <div className="p-3 space-y-4">
            {grouped.map(({ tag, tabs }) => (
              <div key={tag}>
                <p className="text-[9px] font-bold tracking-widest text-[#9a8a72] uppercase px-2 mb-1.5">{tag}</p>
                <div className="space-y-0.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer",
                        activeTab === tab.id
                          ? "bg-[#faf6ed] border border-[#d8d0c0] text-[#2d2010]"
                          : "text-[#6b5c42] hover:text-[#2d2010] hover:bg-[#f2ecdc]"
                      )}
                    >
                      <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 border", tab.color)}>
                        <tab.icon size={11} />
                      </div>
                      <span className="text-xs font-medium truncate flex-1">{tab.label}</span>
                      {tab.badge && (
                        <span className="text-[8px] font-bold text-emerald-400 shrink-0">●</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-3 border-t border-[#cec6b4]">
            <div className="flex items-center gap-2 px-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-[#9a8a72]">Convex live</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <AnimatePresence mode="wait">

            {/* Overview / home */}
            {!activeTab && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto p-6"
              >
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-[#388bfd]/10 border border-[#388bfd]/20 flex items-center justify-center">
                      <FlaskConical size={16} className="text-[#388bfd]" />
                    </div>
                    <div>
                      <h1 className="text-base font-bold text-[#2d2010]">OrderLine — Developer Room</h1>
                      <p className="text-[11px] text-[#6b5c42]">Private workspace. Live telemetry + all system pages.</p>
                    </div>
                  </div>
                </div>

                {grouped.map(({ tag, tabs }) => (
                  <div key={tag} className="mb-8">
                    <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-3">{tag}</p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tabs.map((tab) => (
                        <motion.button
                          key={tab.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleTabSelect(tab.id)}
                          className="group text-left bg-[#faf6ed] border border-[#d8d0c0] hover:border-[#388bfd]/30 rounded-xl p-4 transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", tab.color)}>
                              <tab.icon size={14} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              {tab.badge && (
                                <span className="text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-full px-1.5 py-0.5">{tab.badge}</span>
                              )}
                              <span className={cn("text-[9px] font-bold border rounded-full px-1.5 py-0.5", tab.color)}>{tab.tag}</span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-[#2d2010] mb-1 group-hover:text-[#388bfd] transition-colors">{tab.label}</p>
                          <p className="text-[11px] text-[#9a8a72] leading-relaxed">{tab.desc}</p>
                          {tab.href && <p className="text-[10px] font-mono text-[#b8a890] mt-2">{tab.href}</p>}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Native live panels */}
            {activeTab && activeTabDef?.type === "native" && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-0 overflow-hidden"
                style={{ height: "calc(100vh - 49px)" }}
              >
                <NativePanel id={activeTab} />
              </motion.div>
            )}

            {/* Iframe pages */}
            {activeTab && activeTabDef?.type === "iframe" && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-0 relative flex flex-col"
              >
                {/* Address bar */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#faf6ed] border-b border-[#cec6b4] shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex-1 bg-[#ece6d6] border border-[#cec6b4] rounded px-2.5 py-1 font-mono text-[10px] text-[#6b5c42]">
                    {window.location.origin}{activeTabDef?.href}
                  </div>
                  <button
                    onClick={handleExit}
                    className="text-[#9a8a72] hover:text-[#2d2010] p-1 rounded transition-colors cursor-pointer"
                  >
                    <X size={13} />
                  </button>
                </div>
                <iframe
                  key={activeTab}
                  src={activeTabDef?.href}
                  className="w-full border-0 flex-1"
                  title={activeTabDef?.label}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
