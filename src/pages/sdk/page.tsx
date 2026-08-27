import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Download, Copy, Terminal, Zap, CheckCircle2,
  Code2, Package, Globe, Activity, ChevronDown, ChevronUp,
  Play, ExternalLink, Layers, RefreshCcw,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ── SDK source generator ───────────────────────────────────────────────────────

type SelectorMap = {
  container: string;
  item: string;
  nameSelector: string;
  priceSelector: string;
  addButton: string;
};

type MenuSnapshot = {
  item_name: string;
  item_price: string;
  pos_element_selector: string;
  add_button_selector: string;
}[];

type AgentConfig = {
  locationId: string;
  storeName: string;
  posUrl?: string;
  selectorMap: SelectorMap;
  menuSnapshot?: MenuSnapshot;
  configVersion: number;
};

function generateAgentJS(cfg: AgentConfig | null): string {
  const config = cfg ?? {
    locationId: "your-location-id",
    storeName: "Your Restaurant",
    posUrl: "",
    selectorMap: { container: "#menu", item: ".item", nameSelector: ".name", priceSelector: ".price", addButton: ".add" },
    menuSnapshot: [],
    configVersion: 1,
  };

  return `/**
 * revenue-pulse-agent.js — RevenuePlus POS Bridge Agent
 * Location: ${config.locationId} · ${config.storeName}
 * Config version: ${config.configVersion}
 * Generated: ${new Date().toISOString()}
 *
 * INSTALLATION:
 *   1. Load this script in the POS browser tab:
 *      <script src="revenue-pulse-agent.js"></script>
 *   2. Or inject via bookmarklet:
 *      javascript:(function(){var s=document.createElement('script');s.src='https://your-cdn/revenue-pulse-agent.js';document.head.appendChild(s)})()
 *
 * API:
 *   window.revenuePulse.injectOrder(order)  — fire order into POS DOM
 *   window.revenuePulse.getStatus()         — {ready, locationId, version, lastOrder}
 *   window.revenuePulse.on(event, fn)       — subscribe to events
 *   window.revenuePulse.off(event, fn)      — unsubscribe
 *
 * EVENTS:
 *   'ready'          — agent initialized and selectors validated
 *   'order:start'    — injection started
 *   'order:item'     — single item injected {item, success}
 *   'order:done'     — all items complete {order, results, durationMs}
 *   'order:error'    — injection failed {error}
 *   'status:change'  — internal state change {status}
 *
 * POSTMESSAGE:
 *   window.postMessage({ type: 'rp:inject', order: {...} }, '*')
 *   window.postMessage({ type: 'rp:status' }, '*')
 *   → responds with { type: 'rp:status:response', status: {...} }
 */
(function (global) {
  'use strict';

  // ── Embedded config ──────────────────────────────────────────────────────────
  const CONFIG = ${JSON.stringify({
    locationId: config.locationId,
    storeName: config.storeName,
    posUrl: config.posUrl ?? "",
    configVersion: config.configVersion,
    selectorMap: config.selectorMap,
    menuSnapshot: config.menuSnapshot ?? [],
  }, null, 4)};

  // ── Internal state ───────────────────────────────────────────────────────────
  let _status = 'initializing';
  let _lastOrder = null;
  let _lastInjectionMs = null;
  const _listeners = {};

  // ── Event bus ────────────────────────────────────────────────────────────────
  function emit(event, data) {
    (_listeners[event] || []).forEach(function (fn) {
      try { fn(data); } catch (e) { console.warn('[RevenuePulse] listener error:', e); }
    });
    // Also dispatch DOM CustomEvent for external tooling
    document.dispatchEvent(new CustomEvent('revenuePulse:' + event, { detail: data, bubbles: true }));
  }

  // ── DOM helpers ──────────────────────────────────────────────────────────────
  function $(sel, root) {
    try { return (root || document).querySelector(sel); } catch { return null; }
  }
  function $$(sel, root) {
    try { return Array.from((root || document).querySelectorAll(sel)); } catch { return []; }
  }
  function resolveText(el, sel) {
    try {
      var child = el.querySelector(sel);
      if (child) return (child.textContent || child.getAttribute('data-item-name') || '').trim();
    } catch {}
    var attr = el.getAttribute(sel);
    if (attr) return attr;
    try { if (el.matches(sel)) return (el.textContent || '').trim(); } catch {}
    return '';
  }
  function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ── Selector validation ──────────────────────────────────────────────────────
  function validateSelectors() {
    var sm = CONFIG.selectorMap;
    var container = $(sm.container);
    if (!container) return { valid: false, reason: 'container not found: ' + sm.container };
    var items = $$(sm.item, container);
    if (items.length === 0) return { valid: false, reason: 'no items found: ' + sm.item };
    var names = items.map(function (it) { return resolveText(it, sm.nameSelector); }).filter(Boolean);
    if (names.length === 0) return { valid: false, reason: 'name selector yielded nothing: ' + sm.nameSelector };
    return { valid: true, itemCount: items.length };
  }

  // ── Order injection ──────────────────────────────────────────────────────────
  async function injectOrder(order) {
    _lastOrder = order;
    emit('order:start', { order: order });
    setStatus('injecting');

    var t0 = Date.now();
    var sm = CONFIG.selectorMap;
    var container = $(sm.container);
    if (!container) {
      var err = { error: 'POS container not found: ' + sm.container };
      emit('order:error', err);
      setStatus('error');
      return { success: false, ...err };
    }

    var items = order.items || [];
    var results = [];

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var qty = item.quantity || 1;
      var matched = false;

      // Try menu snapshot first (exact selector)
      if (CONFIG.menuSnapshot && CONFIG.menuSnapshot.length > 0) {
        var snap = CONFIG.menuSnapshot.find(function (s) {
          return s.item_name.toLowerCase() === item.name.toLowerCase();
        });
        if (snap) {
          var btn = $(snap.add_button_selector);
          if (btn) {
            for (var q = 0; q < qty; q++) {
              btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await delay(120);
            }
            matched = true;
            results.push({ item: item.name, success: true, via: 'snapshot' });
            emit('order:item', { item: item.name, success: true });
          }
        }
      }

      // Fallback: fuzzy match by name in live DOM
      if (!matched) {
        var allItems = $$(sm.item, container);
        var target = allItems.find(function (el) {
          var name = resolveText(el, sm.nameSelector).toLowerCase();
          return name.includes(item.name.toLowerCase()) || item.name.toLowerCase().includes(name);
        });
        if (target) {
          var addBtn = sm.addButton ? $(sm.addButton, target) : target.querySelector('button');
          if (addBtn) {
            for (var q2 = 0; q2 < qty; q2++) {
              addBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
              await delay(120);
            }
            matched = true;
          }
        }
        results.push({ item: item.name, success: matched, via: matched ? 'dom-fuzzy' : 'not-found' });
        emit('order:item', { item: item.name, success: matched });
      }

      await delay(80);
    }

    var durationMs = Date.now() - t0;
    _lastInjectionMs = durationMs;
    var allOk = results.every(function (r) { return r.success; });
    setStatus(allOk ? 'ready' : 'partial');

    var done = { order: order, results: results, durationMs: durationMs, success: allOk };
    emit('order:done', done);
    return done;
  }

  // ── Status ───────────────────────────────────────────────────────────────────
  function setStatus(s) {
    _status = s;
    emit('status:change', { status: s });
  }

  function getStatus() {
    return {
      ready: _status === 'ready' || _status === 'partial',
      status: _status,
      locationId: CONFIG.locationId,
      storeName: CONFIG.storeName,
      configVersion: CONFIG.configVersion,
      lastOrder: _lastOrder,
      lastInjectionMs: _lastInjectionMs,
    };
  }

  // ── PostMessage bridge ───────────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    var data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'rp:inject' && data.order) {
      injectOrder(data.order);
    }
    if (data.type === 'rp:status') {
      (e.source || window).postMessage({ type: 'rp:status:response', status: getStatus() }, e.origin || '*');
    }
  });

  // ── Public API ───────────────────────────────────────────────────────────────
  global.revenuePulse = {
    injectOrder: injectOrder,
    getStatus: getStatus,
    on: function (event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
    },
    off: function (event, fn) {
      _listeners[event] = (_listeners[event] || []).filter(function (f) { return f !== fn; });
    },
    config: CONFIG,
  };

  // ── Boot ─────────────────────────────────────────────────────────────────────
  function boot() {
    var v = validateSelectors();
    if (v.valid) {
      setStatus('ready');
      emit('ready', { locationId: CONFIG.locationId, itemCount: v.itemCount });
      console.log('[RevenuePulse] ready · ' + CONFIG.storeName + ' · ' + v.itemCount + ' items indexed');
    } else {
      setStatus('selector_error');
      console.warn('[RevenuePulse] selector validation failed:', v.reason);
      emit('status:change', { status: 'selector_error', reason: v.reason });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(typeof window !== 'undefined' ? window : this);
`;
}

function generateConfigJSON(cfg: AgentConfig | null): string {
  if (!cfg) {
    return JSON.stringify({
      locationId: "your-location-id",
      storeName: "Your Restaurant",
      posUrl: "",
      configVersion: 1,
      selectorMap: { container: "#menu", item: ".item", nameSelector: ".name", priceSelector: ".price", addButton: ".add" },
      menuSnapshot: [],
      generatedAt: new Date().toISOString(),
      sdkVersion: "1.0.0",
    }, null, 2);
  }
  return JSON.stringify({
    locationId: cfg.locationId,
    storeName: cfg.storeName,
    posUrl: cfg.posUrl ?? "",
    configVersion: cfg.configVersion,
    selectorMap: cfg.selectorMap,
    menuSnapshot: cfg.menuSnapshot ?? [],
    generatedAt: new Date().toISOString(),
    sdkVersion: "1.0.0",
  }, null, 2);
}

function generateReadme(cfg: AgentConfig | null): string {
  const name = cfg?.storeName ?? "Your Restaurant";
  const lid = cfg?.locationId ?? "your-location-id";
  return `# RevenuePlus Agent — ${name}

## Quick Start

1. Open your POS in a browser tab
2. Open browser DevTools (F12) → Console tab
3. Paste and run this snippet:

\`\`\`js
var s = document.createElement('script');
s.src = './revenue-pulse-agent.js';
document.head.appendChild(s);
\`\`\`

4. You'll see: [RevenuePulse] ready · ${name} · N items indexed

## Inject an Order

\`\`\`js
window.revenuePulse.injectOrder({
  orderId: "ORD-001",
  customer: "Sarah Chen",
  type: "pickup",
  items: [
    { name: "Classic Burger", quantity: 2, modifiers: ["no onions"] },
    { name: "Fries", quantity: 1, modifiers: [] }
  ]
});
\`\`\`

## Listen for Events

\`\`\`js
window.revenuePulse.on('order:done', function(result) {
  console.log('Injection complete:', result.durationMs + 'ms', result.results);
});

window.revenuePulse.on('order:error', function(err) {
  console.error('Injection failed:', err.error);
});
\`\`\`

## PostMessage (cross-frame)

\`\`\`js
// Inject from parent frame
posIframe.contentWindow.postMessage({
  type: 'rp:inject',
  order: { orderId: 'X', customer: 'Guest', type: 'pickup', items: [...] }
}, '*');

// Check status
posIframe.contentWindow.postMessage({ type: 'rp:status' }, '*');
window.addEventListener('message', function(e) {
  if (e.data.type === 'rp:status:response') console.log(e.data.status);
});
\`\`\`

## Check Status

\`\`\`js
console.log(window.revenuePulse.getStatus());
// {ready: true, status: 'ready', locationId: '${lid}', configVersion: ${cfg?.configVersion ?? 1}, ...}
\`\`\`

## Events Reference

| Event | Payload |
|-------|---------|
| ready | {locationId, itemCount} |
| order:start | {order} |
| order:item | {item, success} |
| order:done | {order, results, durationMs, success} |
| order:error | {error} |
| status:change | {status} |

## Config Version: ${cfg?.configVersion ?? 1}
## Location: ${lid}
## Generated: ${new Date().toISOString()}
`;
}

// ── Download helper ───────────────────────────────────────────────────────────

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Code block ────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang = "js" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative group">
      <pre className={cn(
        "text-[10px] font-mono text-[#2d2010] bg-[#ece6d6] border border-[#d8d0c0] rounded-xl p-4 overflow-x-auto",
        lang === "bash" && "text-emerald-700"
      )}>
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-[#d8d0c0] border border-[#cec6b4] text-[#9a8a72] hover:text-[#2d2010] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        {copied ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

// ── Section toggle ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor, children, defaultOpen = false }: {
  title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#ece6d6]/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={14} className={iconColor} />
          <span className="text-sm font-semibold text-[#2d2010]">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-[#9a8a72]" /> : <ChevronDown size={14} className="text-[#9a8a72]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-[#d8d0c0] pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Test harness ─────────────────────────────────────────────────────────────

function TestHarness({ locationId }: { locationId: string }) {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ ts: string; msg: string; type: "info" | "success" | "error" }[]>([]);

  const addLog = useCallback((msg: string, type: "info" | "success" | "error" = "info") => {
    setLog((l) => [...l.slice(-19), { ts: new Date().toLocaleTimeString(), msg, type }]);
  }, []);

  const simulate = useCallback(async () => {
    setRunning(true);
    setLog([]);
    addLog(`Simulating injection for ${locationId}...`);
    await new Promise(r => setTimeout(r, 300));
    addLog("window.revenuePulse.getStatus() → {ready: true, status: 'ready'}");
    await new Promise(r => setTimeout(r, 400));
    addLog("injectOrder() called with 2 items");
    await new Promise(r => setTimeout(r, 350));
    addLog("order:item → {item: 'Classic Burger', success: true, via: 'snapshot'}", "success");
    await new Promise(r => setTimeout(r, 350));
    addLog("order:item → {item: 'Fries', success: true, via: 'dom-fuzzy'}", "success");
    await new Promise(r => setTimeout(r, 300));
    addLog("order:done → {durationMs: 1402, success: true}", "success");
    addLog("DOM CustomEvent dispatched: revenuePulse:order:done");
    setRunning(false);
  }, [locationId, addLog]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[#9a8a72]">Simulated injection run against config</p>
        <div className="flex gap-2">
          <button
            onClick={() => setLog([])}
            disabled={running}
            className="flex items-center gap-1 text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-40"
          >
            <RefreshCcw size={9} /> Clear
          </button>
          <button
            onClick={simulate}
            disabled={running}
            className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-50"
          >
            {running ? <><RefreshCcw size={9} className="animate-spin" /> Running…</> : <><Play size={9} /> Run Test</>}
          </button>
        </div>
      </div>
      <div className="bg-[#ece6d6] border border-[#d8d0c0] rounded-xl p-3 min-h-[120px] max-h-48 overflow-y-auto font-mono text-[10px] space-y-1">
        {log.length === 0 ? (
          <span className="text-[#b8a890]">// Press Run Test to simulate an injection…</span>
        ) : log.map((l, i) => (
          <div key={i} className={cn(
            l.type === "success" ? "text-emerald-600" :
            l.type === "error" ? "text-red-500" : "text-[#6b5c42]"
          )}>
            <span className="text-[#b8a890]">{l.ts} </span>{l.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SdkPage() {
  const configs = useQuery(api.restaurantConfigs.listAll, {});
  const [selectedId, setSelectedId] = useState<string>("");

  const selectedConfig = configs?.find(c => c.locationId === selectedId) ?? configs?.[0] ?? null;

  const handleDownloadBundle = useCallback(() => {
    if (!selectedConfig && (!configs || configs.length === 0)) {
      toast.error("No config found — complete the onboarding wizard first");
      return;
    }
    const cfg = selectedConfig;
    downloadText("revenue-pulse-agent.js", generateAgentJS(cfg), "application/javascript");
    setTimeout(() => downloadText("restaurant-config.json", generateConfigJSON(cfg), "application/json"), 300);
    setTimeout(() => downloadText("README.md", generateReadme(cfg), "text/markdown"), 600);
    toast.success("Bundle downloaded — 3 files");
  }, [selectedConfig, configs]);

  const handleDownloadJS = useCallback(() => {
    downloadText("revenue-pulse-agent.js", generateAgentJS(selectedConfig), "application/javascript");
    toast.success("revenue-pulse-agent.js downloaded");
  }, [selectedConfig]);

  const handleCopyJS = useCallback(() => {
    navigator.clipboard.writeText(generateAgentJS(selectedConfig));
    toast.success("Agent JS copied to clipboard");
  }, [selectedConfig]);

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">

      {/* Top bar */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-5 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/hub" className="text-[#6b5c42] hover:text-[#2d2010] cursor-pointer transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Package size={13} className="text-violet-400" />
            </div>
            <span className="text-sm font-bold text-[#2d2010]">RevenuePlus SDK</span>
          </div>
          <span className="text-[10px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5">v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          {configs && configs.length > 0 && (
            <select
              value={selectedId || selectedConfig?.locationId || ""}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-[11px] text-[#2d2010] font-mono focus:outline-none focus:border-violet-500/40 cursor-pointer"
            >
              {configs.map(c => (
                <option key={c.locationId} value={c.locationId}>{c.storeName} ({c.locationId})</option>
              ))}
            </select>
          )}
          <button
            onClick={handleDownloadBundle}
            className="flex items-center gap-1.5 text-xs bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer"
          >
            <Download size={12} /> Download Bundle
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-violet-400" />
                <span className="text-xs font-bold tracking-widest text-violet-400 uppercase">Agent Bridge SDK</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">window.revenuePulse</h1>
              <p className="text-[#8b949e] text-sm leading-relaxed max-w-lg">
                Drop one script into any POS browser tab. It maps your DOM selectors, 
                indexes your menu, and exposes a standardized API so the AI voice agent 
                can inject orders in under 2 seconds — no backend required.
              </p>
            </div>
            <div className="hidden md:flex flex-col gap-2 shrink-0 ml-6">
              <button onClick={handleDownloadJS} className="flex items-center gap-1.5 text-[11px] bg-[#ece6d6] border border-[#cec6b4] hover:border-violet-500/40 text-[#6b5c42] hover:text-violet-600 rounded-lg px-3 py-2 transition-all cursor-pointer">
                <Download size={11} /> revenue-pulse-agent.js
              </button>
              <button onClick={() => downloadText("restaurant-config.json", generateConfigJSON(selectedConfig), "application/json")} className="flex items-center gap-1.5 text-[11px] bg-[#ece6d6] border border-[#cec6b4] hover:border-violet-500/40 text-[#6b5c42] hover:text-violet-600 rounded-lg px-3 py-2 transition-all cursor-pointer">
                <Download size={11} /> restaurant-config.json
              </button>
              <button onClick={() => downloadText("README.md", generateReadme(selectedConfig), "text/markdown")} className="flex items-center gap-1.5 text-[11px] bg-[#ece6d6] border border-[#cec6b4] hover:border-violet-500/40 text-[#6b5c42] hover:text-violet-600 rounded-lg px-3 py-2 transition-all cursor-pointer">
                <Download size={11} /> README.md
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Injection time", value: "< 2s" },
              { label: "Dependencies", value: "Zero" },
              { label: "Integration methods", value: "3" },
            ].map(s => (
              <div key={s.label} className="bg-[#ece6d6]/60 border border-violet-500/15 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-[#2d2010]">{s.value}</p>
                <p className="text-[10px] text-[#6b5c42]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Config status */}
        {selectedConfig ? (
          <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#2d2010]">Config loaded — {selectedConfig.storeName}</p>
              <p className="text-[10px] text-[#9a8a72] font-mono">{selectedConfig.locationId} · v{selectedConfig.configVersion} · {selectedConfig.menuSnapshot?.length ?? 0} menu items</p>
            </div>
            <Link to="/onboarding" className="flex items-center gap-1 text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1 transition-colors">
              <ExternalLink size={9} /> Edit config
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
            <Activity size={14} className="text-yellow-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-[#2d2010]">No config — bundle uses placeholder values</p>
              <p className="text-[10px] text-[#9a8a72]">Complete the onboarding wizard to bake your real selectors into the agent.</p>
            </div>
            <Link to="/onboarding" className="flex items-center gap-1.5 text-[10px] text-violet-400 border border-violet-500/25 rounded-lg px-2.5 py-1.5 hover:bg-violet-500/10 cursor-pointer transition-colors">
              Start wizard <ExternalLink size={9} />
            </Link>
          </div>
        )}

        {/* Installation */}
        <Section title="Installation" icon={Terminal} iconColor="text-[#388bfd]" defaultOpen>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] text-[#8b949e] mb-2">Option 1 — Script tag (recommended)</p>
              <CodeBlock lang="html" code={`<!-- Add to the POS page's <head> -->
<script src="revenue-pulse-agent.js"></script>`} />
            </div>
            <div>
              <p className="text-[11px] text-[#8b949e] mb-2">Option 2 — DevTools console injection</p>
              <CodeBlock code={`var s = document.createElement('script');
s.src = './revenue-pulse-agent.js';
document.head.appendChild(s);
// → [RevenuePulse] ready · ${selectedConfig?.storeName ?? "Your Restaurant"} · N items indexed`} />
            </div>
            <div>
              <p className="text-[11px] text-[#8b949e] mb-2">Option 3 — Bookmarklet</p>
              <CodeBlock code={`javascript:(function(){var s=document.createElement('script');s.src='https://your-cdn.com/revenue-pulse-agent.js';document.head.appendChild(s)})();`} />
            </div>
          </div>
        </Section>

        {/* API reference */}
        <Section title="API Reference" icon={Code2} iconColor="text-emerald-400" defaultOpen>
          <div className="space-y-5">

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">revenuePulse.injectOrder(order)</span>
                <span className="text-[9px] text-[#484f58]">→ Promise&lt;result&gt;</span>
              </div>
              <CodeBlock code={`window.revenuePulse.injectOrder({
  orderId: "ORD-001",           // unique ID
  customer: "Sarah Chen",       // caller name
  type: "pickup",               // pickup | delivery | dine-in
  items: [
    { name: "Classic Burger", quantity: 2, modifiers: ["no onions"] },
    { name: "Fries",          quantity: 1, modifiers: [] }
  ]
});
// Returns: { success: true, results: [...], durationMs: 1402 }`} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold font-mono text-[#388bfd] bg-[#388bfd]/10 border border-[#388bfd]/20 rounded px-2 py-0.5">revenuePulse.getStatus()</span>
                <span className="text-[9px] text-[#484f58]">→ StatusObject</span>
              </div>
              <CodeBlock code={`const s = window.revenuePulse.getStatus();
// {
//   ready: true,
//   status: "ready",             // initializing | ready | injecting | partial | error
//   locationId: "${selectedConfig?.locationId ?? "your-location-id"}",
//   configVersion: ${selectedConfig?.configVersion ?? 1},
//   lastOrder: { ... } | null,
//   lastInjectionMs: 1402 | null
// }`} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-0.5">revenuePulse.on(event, fn)</span>
              </div>
              <CodeBlock code={`window.revenuePulse.on('ready',        (d) => console.log('ready, items:', d.itemCount));
window.revenuePulse.on('order:start',  (d) => console.log('injecting:', d.order.orderId));
window.revenuePulse.on('order:item',   (d) => console.log(d.item, d.success ? '✓' : '✗'));
window.revenuePulse.on('order:done',   (d) => console.log('done in', d.durationMs + 'ms'));
window.revenuePulse.on('order:error',  (d) => console.error('error:', d.error));
window.revenuePulse.on('status:change',(d) => console.log('status →', d.status));`} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5">postMessage (cross-frame)</span>
              </div>
              <CodeBlock code={`// From parent window into POS iframe
posIframe.contentWindow.postMessage({
  type: 'rp:inject',
  order: { orderId: 'X', customer: 'Guest', type: 'pickup', items: [...] }
}, '*');

// Query status
posIframe.contentWindow.postMessage({ type: 'rp:status' }, '*');
window.addEventListener('message', (e) => {
  if (e.data.type === 'rp:status:response') {
    console.log(e.data.status);
  }
});`} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-2 py-0.5">DOM Events</span>
              </div>
              <CodeBlock code={`// Agent also dispatches native CustomEvents on document
document.addEventListener('revenuePulse:ready', (e) => console.log(e.detail));
document.addEventListener('revenuePulse:order:done', (e) => console.log(e.detail));
document.addEventListener('revenuePulse:order:error', (e) => console.error(e.detail));`} />
            </div>

          </div>
        </Section>

        {/* Events table */}
        <Section title="Events Reference" icon={Layers} iconColor="text-yellow-400">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[#d8d0c0]">
                  <th className="text-left text-[#9a8a72] font-semibold pb-2 pr-4">Event</th>
                  <th className="text-left text-[#9a8a72] font-semibold pb-2 pr-4">Trigger</th>
                  <th className="text-left text-[#9a8a72] font-semibold pb-2">Payload</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                {[
                  ["ready", "Agent initialized & selectors validated", "{ locationId, itemCount }"],
                  ["order:start", "injectOrder() called", "{ order }"],
                  ["order:item", "Each item processed", "{ item: string, success: bool, via: string }"],
                  ["order:done", "All items complete", "{ order, results[], durationMs, success }"],
                  ["order:error", "Injection failed (container missing etc)", "{ error: string }"],
                  ["status:change", "Internal status transitions", "{ status: string }"],
                ].map(([ev, trigger, payload]) => (
                  <tr key={ev} className="border-b border-[#e0d8c8]">
                    <td className="py-2 pr-4 font-mono text-emerald-600">{ev}</td>
                    <td className="py-2 pr-4 text-[#6b5c42]">{trigger}</td>
                    <td className="py-2 font-mono text-[#9a8a72] text-[9px]">{payload}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Test harness */}
        <Section title="Test Harness" icon={Activity} iconColor="text-cyan-400" defaultOpen>
          <TestHarness locationId={selectedConfig?.locationId ?? "demo"} />
        </Section>

        {/* View source */}
        <Section title="View Agent Source" icon={Globe} iconColor="text-[#484f58]">
          <div className="flex justify-end gap-2 mb-3">
            <button onClick={handleCopyJS} className="flex items-center gap-1.5 text-[10px] text-[#6b5c42] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 cursor-pointer">
              <Copy size={10} /> Copy
            </button>
            <button onClick={handleDownloadJS} className="flex items-center gap-1.5 text-[10px] text-violet-600 border border-violet-500/25 rounded-lg px-2.5 py-1.5 hover:bg-violet-500/10 cursor-pointer">
              <Download size={10} /> Download .js
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <CodeBlock code={generateAgentJS(selectedConfig).slice(0, 2000) + "\n// … (download to view full source)"} />
          </div>
        </Section>

      </div>
    </div>
  );
}
