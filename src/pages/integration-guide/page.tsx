import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy, Check, Terminal, Zap, ArrowLeft, ChevronDown, ChevronRight,
  Play, CheckCircle2, Clock, AlertTriangle, ExternalLink, Send,
  Code2, Book, Activity, FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://vivid-corgi-575.convex.site";
const ORDER_ENDPOINT = `${BASE_URL}/api/order`;

// ─── Code snippets ────────────────────────────────────────────────────────────

const EXAMPLE_PAYLOAD = {
  orderId: "CALL-CA1234567890",
  customer: "Phone Order",
  type: "pickup",
  phone: "+13125550101",
  items: [
    { name: "Margherita Pizza", quantity: 1, modifiers: ["Extra Cheese"] },
    { name: "Caesar Salad", quantity: 2, modifiers: [] },
    { name: "Garlic Bread", quantity: 1, modifiers: ["No Butter"] },
  ],
};

const CURL_EXAMPLE = `curl -X POST ${ORDER_ENDPOINT} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}'`;

const JS_EXAMPLE = `const payload = ${JSON.stringify(EXAMPLE_PAYLOAD, null, 2)};

const response = await fetch("${ORDER_ENDPOINT}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});

const result = await response.json();
console.log(result); // { success: true }`;

const PYTHON_EXAMPLE = `import requests, json

payload = ${JSON.stringify(EXAMPLE_PAYLOAD, null, 2)}

r = requests.post(
    "${ORDER_ENDPOINT}",
    headers={"Content-Type": "application/json"},
    data=json.dumps(payload),
)
print(r.json())  # {"success": True}`;

const TWILIO_EXAMPLE = `// In your Twilio Studio Flow or Function:
// After collecting speech from customer, parse and POST:

const orderPayload = {
  orderId: context.CallSid,
  customer: "Phone Order",
  type: "pickup",
  phone: event.From,
  items: parsedItems, // from your AI speech-to-order parser
};

const response = await fetch("${ORDER_ENDPOINT}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(orderPayload),
});`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusIcon(status: string) {
  if (status === "pending") return <Clock size={12} className="text-yellow-400" />;
  if (status === "processing") return <Activity size={12} className="text-blue-400 animate-pulse" />;
  if (status === "entered") return <CheckCircle2 size={12} className="text-green-400" />;
  return <AlertTriangle size={12} className="text-red-400" />;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    processing: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    entered: "bg-green-500/15 text-green-400 border-green-500/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return map[status] ?? "bg-white/10 text-white/50 border-white/10";
}

// ─── Code Block ───────────────────────────────────────────────────────────────

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative bg-[#ece6d6] border border-[#cec6b4] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#faf6ed] border-b border-[#d8d0c0]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </div>
        <span className="text-[#9a8a72] text-[10px] font-mono">{lang}</span>
        <button onClick={handleCopy} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-colors flex items-center gap-1 text-[10px]">
          {copied ? <><Check size={11} className="text-green-600" /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[#2d2010] leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

// ─── Schema Field Row ─────────────────────────────────────────────────────────

function FieldRow({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#d8d0c0] last:border-0">
      <code className="text-emerald-600 text-xs font-mono shrink-0 w-32">{name}</code>
      <code className="text-red-500 text-[10px] font-mono shrink-0 w-24">{type}</code>
      {required ? (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 border text-[9px] shrink-0 px-1.5 py-0">required</Badge>
      ) : (
        <Badge className="bg-black/5 text-[#9a8a72] border-black/10 border text-[9px] shrink-0 px-1.5 py-0">optional</Badge>
      )}
      <p className="text-[#6b5c42] text-[11px] leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Live Order Feed ──────────────────────────────────────────────────────────

function LiveOrderFeed() {
  const orders = useQuery(api.bridge.listRecent);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#ece6d6] border-b border-[#d8d0c0]">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs font-mono text-[#6b5c42]">live order feed — realtime</span>
        {orders && (
          <Badge className="ml-auto bg-[#d8d0c0] text-[#6b5c42] border-[#cec6b4] border text-[10px]">
            {orders.length} total
          </Badge>
        )}
      </div>

      {!orders ? (
        <div className="flex items-center justify-center py-8 text-[#9a8a72] text-sm gap-2">
          <Activity size={14} className="animate-spin" /> Loading...
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-[#9a8a72]">
          <Terminal size={24} />
          <p className="text-sm">No orders yet — fire one from the test harness below</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order._id} className="border-b border-[#d8d0c0] last:border-0">
              <button
                onClick={() => setExpanded((e) => (e === order._id ? null : order._id))}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#faf6ed] transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  {statusIcon(order.status)}
                </div>
                <span className="text-xs font-mono text-[#2d2010] flex-1 truncate">{order.orderId}</span>
                <span className="text-[10px] text-[#6b5c42]">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</span>
                <Badge className={cn("text-[10px] border px-1.5 py-0", statusBadge(order.status))}>
                  {order.status}
                </Badge>
                {expanded === order._id ? <ChevronDown size={12} className="text-[#9a8a72]" /> : <ChevronRight size={12} className="text-[#9a8a72]" />}
              </button>

              <AnimatePresence>
                {expanded === order._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 bg-[#ece6d6] border-t border-[#d8d0c0]">
                      <pre className="text-[10px] font-mono text-[#6b5c42] leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify({
                          orderId: order.orderId,
                          customer: order.customer,
                          type: order.type,
                          status: order.status,
                          items: order.items,
                          ...(order.phone ? { phone: order.phone } : {}),
                          agentLog: order.agentLog.slice(-4).map((l) => l.message),
                        }, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Test Harness ─────────────────────────────────────────────────────────────

const PRESET_ORDERS = [
  {
    label: "Simple Pickup",
    emoji: "🍕",
    payload: {
      orderId: `TEST-${Date.now()}`,
      customer: "Phone Order",
      type: "pickup" as const,
      phone: "+13125550101",
      items: [
        { name: "Margherita Pizza", quantity: 1, modifiers: ["Extra Cheese"] },
        { name: "Diet Coke", quantity: 2, modifiers: [] },
      ],
    },
  },
  {
    label: "Family Order",
    emoji: "👨‍👩‍👧",
    payload: {
      orderId: `TEST-${Date.now() + 1}`,
      customer: "Phone Order",
      type: "pickup" as const,
      items: [
        { name: "Pepperoni Pizza", quantity: 2, modifiers: ["Well Done"] },
        { name: "Caesar Salad", quantity: 1, modifiers: [] },
        { name: "Garlic Bread", quantity: 1, modifiers: [] },
        { name: "Tiramisu", quantity: 2, modifiers: [] },
      ],
    },
  },
  {
    label: "Quick Drink Run",
    emoji: "🥤",
    payload: {
      orderId: `TEST-${Date.now() + 2}`,
      customer: "Phone Order",
      type: "pickup" as const,
      items: [
        { name: "Coke", quantity: 3, modifiers: [] },
        { name: "Sparkling Water", quantity: 2, modifiers: [] },
      ],
    },
  },
];

function TestHarness() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [responseText, setResponseText] = useState("");
  const [customJson, setCustomJson] = useState(JSON.stringify(EXAMPLE_PAYLOAD, null, 2));
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  async function fireOrder(payload: (typeof PRESET_ORDERS)[0]["payload"] | null) {
    setStatus("sending");
    setResponseText("");
    const body = payload ?? (() => {
      try { return JSON.parse(customJson); } catch { return null; }
    })();
    if (!body) { setStatus("error"); setResponseText("Invalid JSON in custom payload"); return; }

    // Fresh orderId for each fire
    body.orderId = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    try {
      const res = await fetch(ORDER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      setResponseText(text);
      setStatus(res.ok ? "success" : "error");
      if (res.ok) toast.success("Order fired — watch the live feed above");
      else toast.error("Request failed — check the response below");
    } catch (e) {
      setStatus("error");
      setResponseText(e instanceof Error ? e.message : "Network error");
      toast.error("Could not reach endpoint");
    }
  }

  return (
    <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-[#ece6d6] border-b border-[#d8d0c0]">
        <FlaskConical size={13} className="text-[#6b5c42]" />
        <span className="text-xs font-mono text-[#6b5c42]">test harness — fires real orders to the live endpoint</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d8d0c0]">
        {(["presets", "custom"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-xs font-medium capitalize transition-colors cursor-pointer",
              activeTab === tab
                ? "text-[#2d2010] border-b-2 border-emerald-500"
                : "text-[#6b5c42] hover:text-[#2d2010]"
            )}
          >
            {tab === "presets" ? "Preset Orders" : "Custom JSON"}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {activeTab === "presets" ? (
          <div className="grid md:grid-cols-3 gap-3">
            {PRESET_ORDERS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => fireOrder(preset.payload)}
                disabled={status === "sending"}
                className="group text-left bg-[#faf6ed] hover:bg-[#ece6d6] border border-[#d8d0c0] hover:border-emerald-500/50 rounded-xl p-4 transition-all cursor-pointer disabled:opacity-50"
              >
                <div className="text-2xl mb-2">{preset.emoji}</div>
                <p className="text-sm font-semibold text-[#2d2010] mb-1">{preset.label}</p>
                <p className="text-[10px] text-[#6b5c42]">{preset.payload.items.length} item{preset.payload.items.length !== 1 ? "s" : ""}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.payload.items.map((item, i) => (
                    <span key={i} className="bg-[#ece6d6] text-[#6b5c42] text-[9px] px-1.5 py-0.5 rounded font-mono">{item.name}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-1 text-emerald-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  <Send size={10} /> Fire order
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              className="w-full h-48 bg-[#ece6d6] border border-[#cec6b4] rounded-xl p-3 text-xs font-mono text-[#2d2010] resize-none focus:outline-none focus:border-emerald-500/50"
              spellCheck={false}
            />
            <Button
              onClick={() => fireOrder(null)}
              disabled={status === "sending"}
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs"
            >
              <Send size={12} className="mr-2" />
              {status === "sending" ? "Firing..." : "Fire Custom Order"}
            </Button>
          </div>
        )}

        {/* Response */}
        {(status !== "idle" || responseText) && (
          <div className={cn(
            "rounded-xl border p-3",
            status === "success" ? "bg-green-500/5 border-green-500/20" :
            status === "error" ? "bg-red-500/5 border-red-500/20" :
            "bg-[#faf6ed] border-[#d8d0c0]"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {status === "sending" && <Activity size={11} className="text-blue-400 animate-spin" />}
              {status === "success" && <CheckCircle2 size={11} className="text-green-500" />}
              {status === "error" && <AlertTriangle size={11} className="text-red-500" />}
              <span className="text-[10px] text-[#6b5c42] font-mono">
                {status === "sending" ? "Sending..." : `POST ${ORDER_ENDPOINT}`}
              </span>
            </div>
            {responseText && (
              <pre className="text-[10px] font-mono text-[#2d2010] mt-1 whitespace-pre-wrap">{responseText}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nav Tab ──────────────────────────────────────────────────────────────────

type NavTab = "docs" | "feed" | "test";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IntegrationGuidePage() {
  const [tab, setTab] = useState<NavTab>("docs");
  const [codeTab, setCodeTab] = useState<"curl" | "js" | "python" | "twilio">("curl");

  const CODE_TABS = [
    { id: "curl" as const, label: "cURL" },
    { id: "js" as const, label: "JavaScript" },
    { id: "python" as const, label: "Python" },
    { id: "twilio" as const, label: "Twilio Function" },
  ];

  const codeMap = { curl: CURL_EXAMPLE, js: JS_EXAMPLE, python: PYTHON_EXAMPLE, twilio: TWILIO_EXAMPLE };

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">
      {/* Header */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/hub" className="text-[#6b5c42] hover:text-[#2d2010] transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <Separator orientation="vertical" className="h-5 bg-[#d8d0c0]" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Zap size={12} className="text-emerald-500" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-[#2d2010] leading-none">Voice Agent Integration Guide</h1>
                <p className="text-[10px] text-[#6b5c42] mt-0.5">OrderLine AI POS Bridge API</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={ORDER_ENDPOINT}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <ExternalLink size={11} /> Live Endpoint
            </a>
            <Link to="/bridge">
              <Button size="sm" variant="ghost" className="text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] text-xs">
                Open Bridge
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab nav */}
        <div className="max-w-5xl mx-auto px-4 flex border-t border-[#d8d0c0]">
          {([
            { id: "docs" as NavTab, icon: Book, label: "API Reference" },
            { id: "feed" as NavTab, icon: Activity, label: "Live Order Feed" },
            { id: "test" as NavTab, icon: FlaskConical, label: "Test Harness" },
          ]).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer border-b-2",
                tab === id
                  ? "text-[#2d2010] border-emerald-500"
                  : "text-[#6b5c42] hover:text-[#2d2010] border-transparent"
              )}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── API REFERENCE TAB ── */}
        {tab === "docs" && (
          <div className="space-y-8">
            {/* Endpoint overview */}
            <div>
              <h2 className="text-lg font-bold text-[#2d2010] mb-1">POST /api/order</h2>
              <p className="text-[#6b5c42] text-sm mb-4">
                Push a structured order from your voice agent to the OrderLine bridge. The bridge immediately enters
                the order into the restaurant's POS system using DOM-based browser automation.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-1.5 bg-[#faf6ed] border border-[#d8d0c0] rounded-lg px-3 py-1.5 text-xs font-mono">
                  <span className="text-green-600">POST</span>
                  <span className="text-[#6b5c42]">{ORDER_ENDPOINT}</span>
                </div>
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 border">Content-Type: application/json</Badge>
                <Badge className="bg-green-500/15 text-green-400 border-green-500/30 border">No auth required</Badge>
                <Badge className="bg-purple-500/15 text-purple-400 border-purple-500/30 border">Realtime push via WebSocket</Badge>
              </div>
            </div>

            {/* Request schema */}
            <Card className="bg-[#faf6ed] border-[#d8d0c0] pt-0">
              <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
                <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                  <Code2 size={14} className="text-[#9a8a72]" /> Request Body Schema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FieldRow name="orderId" type="string" required desc="Unique identifier for this order. Use the Twilio CallSid (e.g. CA1234...) prefixed with CALL-. Duplicate orderId will overwrite the previous order." />
                <FieldRow name="customer" type="string" required desc='Display name for the order. Use "Phone Order" for all phone orders, or the caller name if available from CNAM lookup.' />
                <FieldRow name="type" type="enum" required desc='"pickup" | "delivery" | "dine-in". Use "pickup" for all phone orders by default.' />
                <FieldRow name="items" type="array" required desc="Array of order items. Each item has: name (string), quantity (number), modifiers (string[]). Item names are fuzzy-matched against the POS menu using normalized text comparison." />
                <FieldRow name="phone" type="string" desc="Caller phone number in E.164 format (e.g. +13125550101). Sourced from Twilio's From field." />
                <FieldRow name="pickupTime" type="string" desc="Estimated pickup time as ISO 8601 string. Optional — omit for ASAP orders." />
              </CardContent>
            </Card>

            {/* Item schema */}
            <Card className="bg-[#faf6ed] border-[#d8d0c0] pt-0">
              <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
                <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                  <Code2 size={14} className="text-[#9a8a72]" /> Item Object Schema
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FieldRow name="name" type="string" required desc='The menu item name as spoken by the customer. The bridge fuzzy-matches this against the POS menu (e.g. "large pizza" matches "Large Margherita Pizza"). Keep it descriptive.' />
                <FieldRow name="quantity" type="number" required desc="Number of this item ordered. Must be a positive integer." />
                <FieldRow name="modifiers" type="string[]" required desc='Array of modifiers/customizations (e.g. ["Extra Cheese", "No Onions", "Well Done"]). Pass [] if none. Each modifier is also fuzzy-matched against available POS modifier options.' />
              </CardContent>
            </Card>

            {/* Response */}
            <Card className="bg-[#faf6ed] border-[#d8d0c0] pt-0">
              <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
                <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                  <Code2 size={14} className="text-[#9a8a72]" /> Response
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-[#6b5c42] mb-1">200 OK — Order received and queued</p>
                  <CodeBlock code={`{ "success": true }`} lang="json" />
                </div>
                <div>
                  <p className="text-xs text-[#6b5c42] mb-1">400 Bad Request — Invalid payload</p>
                  <CodeBlock code={`{ "error": "Invalid order payload", "details": "..." }`} lang="json" />
                </div>
                <p className="text-[11px] text-[#6b5c42]">
                  A 200 means the order was accepted and pushed to the bridge in real time. The browser agent then
                  begins POS entry asynchronously — monitor the bridge page or the live feed for entry status.
                </p>
              </CardContent>
            </Card>

            {/* Code examples */}
            <div>
              <h2 className="text-sm font-semibold text-[#2d2010] mb-3">Code Examples</h2>
              <div className="flex gap-2 mb-3 flex-wrap">
                {CODE_TABS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setCodeTab(id)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer",
                      codeTab === id
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "bg-[#faf6ed] border-[#d8d0c0] text-[#6b5c42] hover:text-[#2d2010]"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <CodeBlock code={codeMap[codeTab]} lang={codeTab === "curl" ? "shell" : codeTab === "js" ? "javascript" : codeTab === "python" ? "python" : "javascript"} />
            </div>

            {/* How matching works */}
            <Card className="bg-[#faf6ed] border-[#d8d0c0] pt-0">
              <CardHeader className="px-4 py-3 border-b border-[#d8d0c0] pt-4">
                <CardTitle className="text-sm font-semibold text-[#2d2010] flex items-center gap-2">
                  <Zap size={14} className="text-emerald-500" /> How the Browser Agent Matches Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-[#6b5c42] text-xs leading-relaxed">
                <p>
                  The bridge uses <strong className="text-[#2d2010]">fuzzy normalized text matching</strong> — not exact string equality.
                  Item names are lowercased, stripped of punctuation, and compared against POS menu labels using token overlap scoring.
                </p>
                <div className="grid md:grid-cols-2 gap-3">
                  {[
                    ["Speech input", "POS match"],
                    ["\"margherita\"", "Margherita Pizza ✓"],
                    ["\"large cheese pizza\"", "Large Margherita Pizza ✓"],
                    ["\"garlic bread no butter\"", "Garlic Bread + No Butter modifier ✓"],
                    ["\"fountain drink\"", "Coke / Sprite / Diet Coke (first match) ✓"],
                  ].map(([input, output], i) => (
                    i === 0 ? (
                      <div key={i} className="col-span-2 grid grid-cols-2 gap-3 text-[10px] font-semibold text-[#9a8a72] uppercase tracking-wider px-1">
                        <span>{input}</span><span>{output}</span>
                      </div>
                    ) : (
                      <div key={i} className="contents text-xs">
                        <code className="bg-[#ece6d6] border border-[#cec6b4] rounded px-2 py-1 text-red-600">{input}</code>
                        <code className="bg-[#ece6d6] border border-green-500/20 rounded px-2 py-1 text-green-600">{output}</code>
                      </div>
                    )
                  ))}
                </div>
                <p className="text-[11px]">
                  Unmatched items are skipped with a warning in the agent log — the order still proceeds with the matched items.
                  Check the bridge page agent log for full match details after each order.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── LIVE ORDER FEED TAB ── */}
        {tab === "feed" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#2d2010] mb-1">Live Order Feed</h2>
              <p className="text-[#6b5c42] text-sm">
                Every order pushed to <code className="text-emerald-600 text-xs">/api/order</code> appears here in real time.
                Status updates as the browser agent enters the order into the POS: <span className="text-yellow-600">pending</span> → <span className="text-blue-600">processing</span> → <span className="text-green-600">entered</span>.
                Click any order to see its full payload and agent log.
              </p>
            </div>
            <LiveOrderFeed />
            <p className="text-[#9a8a72] text-xs text-center">
              Updates via WebSocket — no refresh needed. Open the <Link to="/bridge" className="text-emerald-600 hover:underline">bridge page</Link> to see the full split-screen agent view.
            </p>
          </div>
        )}

        {/* ── TEST HARNESS TAB ── */}
        {tab === "test" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#2d2010] mb-1">Test Harness</h2>
              <p className="text-[#6b5c42] text-sm">
                Fire real HTTP requests to the live endpoint. Orders pushed here flow through the full system —
                they appear in the live feed, the bridge page, and are processed by the browser agent.
                Use this to verify your voice agent integration before going live.
              </p>
            </div>
            <TestHarness />
            <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4">
              <p className="text-[11px] text-[#6b5c42] leading-relaxed">
                <span className="text-[#2d2010] font-medium">After firing:</span> switch to the{" "}
                <button onClick={() => setTab("feed")} className="text-emerald-600 hover:underline cursor-pointer">Live Order Feed</button> tab
                to see the order appear, or open the{" "}
                <Link to="/bridge" className="text-emerald-600 hover:underline">bridge page</Link> to
                watch the browser agent enter the order into the POS in real time.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
