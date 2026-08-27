import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScanLine, Map, Play, CheckCircle2, XCircle, Copy,
  RotateCcw, Download, AlertCircle, Info, Save,
  ChevronDown, ChevronUp, Zap, FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ── Types ──────────────────────────────────────────────────────────────────────

type SelectorMap = {
  container: string;
  item: string;
  nameSelector: string;
  priceSelector: string;
  addButton: string;
};

type ExtractedItem = {
  item_name: string;
  item_price: string;
  pos_element_selector: string;
  add_button_selector: string;
};

type TestResult = {
  key: keyof SelectorMap;
  matches: number;
  samples: string[];
  valid: boolean;
  error?: string;
};

const SELECTOR_FIELDS: { key: keyof SelectorMap; label: string; placeholder: string; hint: string; required: boolean }[] = [
  { key: "container",    label: "Menu Container",       placeholder: "#menu-wrapper",    hint: "Root wrapping all items",             required: true },
  { key: "item",         label: "Menu Item",            placeholder: ".menu-item",       hint: "Each individual item node",           required: true },
  { key: "nameSelector", label: "Item Name",            placeholder: ".item-name",       hint: "Element/attribute with item name",    required: true },
  { key: "priceSelector",label: "Item Price",           placeholder: ".price",           hint: "Element/attribute with price",        required: true },
  { key: "addButton",    label: "Add-to-Cart Button",   placeholder: ".add-to-cart",     hint: "Button injectAIOrder() fires",        required: false },
];

const SAMPLE_HTML = `<div id="menu-wrapper">
  <div class="menu-item" data-item-id="pos-item-001">
    <h3 class="item-name" data-item-name="Classic Smash Burger">Classic Smash Burger</h3>
    <span class="price" data-item-price="12.99">$12.99</span>
    <button class="add-to-cart" data-action="add">Add</button>
  </div>
  <div class="menu-item" data-item-id="pos-item-002">
    <h3 class="item-name" data-item-name="Double Stack Burger">Double Stack Burger</h3>
    <span class="price" data-item-price="15.99">$15.99</span>
    <button class="add-to-cart" data-action="add">Add</button>
  </div>
  <div class="menu-item" data-item-id="pos-item-003">
    <h3 class="item-name" data-item-name="Pepperoni Pizza">Pepperoni Pizza</h3>
    <span class="price" data-item-price="15.99">$15.99</span>
    <button class="add-to-cart" data-action="add">Add</button>
  </div>
</div>`;

// ── DOM helpers ────────────────────────────────────────────────────────────────

function parseHTML(html: string): Document | null {
  try { return new DOMParser().parseFromString(html, "text/html"); } catch { return null; }
}

function resolveText(el: Element, selector: string): string {
  try { const c = el.querySelector(selector); if (c) return c.textContent?.trim() ?? ""; } catch { /* not a selector */ }
  const attr = el.getAttribute(selector);
  if (attr) return attr;
  try { if (el.matches(selector)) return el.textContent?.trim() ?? ""; } catch { /* ignore */ }
  return "";
}

function runTest(doc: Document, key: keyof SelectorMap, sel: string, selectors: SelectorMap): TestResult {
  if (!sel.trim()) return { key, matches: 0, samples: [], valid: false, error: "No selector entered" };
  try {
    if (key === "container") {
      const els = Array.from(doc.querySelectorAll(sel));
      return { key, matches: els.length, samples: els.slice(0, 3).map((e) => `<${e.tagName.toLowerCase()}${e.id ? ` id="${e.id}"` : ""}>`), valid: els.length > 0 };
    }
    const container = selectors.container ? doc.querySelector(selectors.container) ?? doc.body : doc.body;
    if (key === "item") {
      const els = Array.from(container.querySelectorAll(sel));
      return { key, matches: els.length, samples: els.slice(0, 3).map((e) => e.getAttribute("data-item-id") ?? e.textContent?.trim().slice(0, 30) ?? ""), valid: els.length > 0 };
    }
    const items = Array.from(container.querySelectorAll(selectors.item || "*"));
    if (key === "nameSelector" || key === "priceSelector") {
      const resolved = items.map((it) => resolveText(it, sel)).filter(Boolean);
      return { key, matches: resolved.length, samples: resolved.slice(0, 3), valid: resolved.length > 0 };
    }
    if (key === "addButton") {
      let found = 0; const samples: string[] = [];
      for (const it of items) {
        try { const btn = it.querySelector(sel); if (btn) { found++; if (samples.length < 3) samples.push(btn.textContent?.trim() ?? btn.tagName); } } catch { /* skip */ }
      }
      return { key, matches: found, samples, valid: found > 0 };
    }
    return { key, matches: 0, samples: [], valid: false };
  } catch (e) {
    return { key, matches: 0, samples: [], valid: false, error: `Invalid: ${String(e)}` };
  }
}

function extractItems(doc: Document, selectors: SelectorMap): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  try {
    const container = selectors.container ? doc.querySelector(selectors.container) ?? doc.body : doc.body;
    Array.from(container.querySelectorAll(selectors.item)).forEach((el, idx) => {
      const name = resolveText(el, selectors.nameSelector) || `Item ${idx + 1}`;
      const price = resolveText(el, selectors.priceSelector) || "0.00";
      const id = el.getAttribute("data-item-id") ?? el.getAttribute("id") ?? `item-${idx + 1}`;
      items.push({
        item_name: name,
        item_price: price.replace(/[^0-9.]/g, ""),
        pos_element_selector: `[data-item-id="${id}"]`,
        add_button_selector: selectors.addButton ? `[data-item-id="${id}"] ${selectors.addButton}` : `[data-item-id="${id}"] button`,
      });
    });
  } catch { /* ignore */ }
  return items;
}

// ── Injection queue ────────────────────────────────────────────────────────────

type QueueEntry = { id: string; selector: string; label: string; status: "pending" | "running" | "success" | "failed"; orderId?: string; durationMs?: number };

function simulateInject(selector: string): { success: boolean; orderId: string; message: string } {
  // Simulated DOM injection — in production this fires against a real POS iframe
  const success = !selector.includes("error") && Math.random() > 0.15;
  return {
    success,
    orderId: `rp-${Date.now().toString(36)}`,
    message: success ? "Injected via MouseEvent click" : "Add button not found",
  };
}

function delay(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SelectorMapperPanel() {
  const configs = useQuery(api.restaurantConfigs.listAll, {});
  const saveConfig = useMutation(api.restaurantConfigs.saveConfig);

  // ── Selector mapper state ──────────────────────────────────────────────────
  const [html, setHtml] = useState(SAMPLE_HTML);
  const [usingSample, setUsingSample] = useState(true);
  const [selectors, setSelectors] = useState<SelectorMap>({ container: "", item: "", nameSelector: "", priceSelector: "", addButton: "" });
  const [testResults, setTestResults] = useState<Partial<Record<keyof SelectorMap, TestResult>>>({});
  const [testing, setTesting] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [extracted, setExtracted] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveTarget, setSaveTarget] = useState("");

  const activeHtml = usingSample ? SAMPLE_HTML : html;

  const runTests = useCallback(() => {
    if (!activeHtml.trim()) { toast.error("Paste HTML first"); return; }
    setTesting(true);
    setTimeout(() => {
      const doc = parseHTML(activeHtml);
      if (!doc) { toast.error("Cannot parse HTML"); setTesting(false); return; }
      const results: Partial<Record<keyof SelectorMap, TestResult>> = {};
      for (const f of SELECTOR_FIELDS) {
        results[f.key] = runTest(doc, f.key, selectors[f.key], selectors);
      }
      setTestResults(results);
      const allValid = SELECTOR_FIELDS.filter((f) => f.required).every((f) => results[f.key]?.valid);
      toast[allValid ? "success" : "error"](allValid ? "All required selectors matched" : "Some selectors need attention");
      setTesting(false);
    }, 80);
  }, [activeHtml, selectors]);

  const handleExtract = useCallback(() => {
    const doc = parseHTML(activeHtml);
    if (!doc) { toast.error("Cannot parse HTML"); return; }
    const items = extractItems(doc, selectors);
    setExtractedItems(items);
    setExtracted(true);
    toast[items.length > 0 ? "success" : "error"](items.length > 0 ? `Extracted ${items.length} items` : "No items found — check selectors");
  }, [activeHtml, selectors]);

  const handleSave = useCallback(async () => {
    if (!saveTarget.trim()) { toast.error("Enter a location ID to save to"); return; }
    setSaving(true);
    try {
      await saveConfig({
        locationId: saveTarget,
        storeName: saveTarget,
        selectorMap: selectors,
        menuSnapshot: extractedItems.length > 0 ? extractedItems : undefined,
      });
      toast.success(`Config saved → ${saveTarget}`);
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  }, [saveTarget, selectors, extractedItems, saveConfig]);

  const handleLoadConfig = useCallback((cfg: typeof configs extends (infer T)[] | null | undefined ? T : never) => {
    if (!cfg) return;
    setSelectors(cfg.selectorMap);
    setSaveTarget(cfg.locationId);
    setTestResults({});
    setExtracted(false);
    toast.success(`Loaded config: ${cfg.locationId}`);
  }, []);

  // ── Injection queue state ──────────────────────────────────────────────────
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [customSelector, setCustomSelector] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef(false);

  const addToQueue = useCallback((selector: string, label: string) => {
    setQueue((q) => [...q, { id: `qe-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, selector, label, status: "pending" }]);
  }, []);

  const runQueue = useCallback(async () => {
    if (running) return;
    setRunning(true);
    abortRef.current = false;
    // Reset to pending
    setQueue((q) => q.map((e) => ({ ...e, status: "pending" as const, orderId: undefined, durationMs: undefined })));
    await delay(80);

    const snapshot = [...queue];
    for (let i = 0; i < snapshot.length; i++) {
      if (abortRef.current) break;
      const entry = snapshot[i];
      setQueue((q) => q.map((e) => e.id === entry.id ? { ...e, status: "running" as const } : e));
      await delay(300 + Math.random() * 300);
      const t0 = Date.now();
      const result = simulateInject(entry.selector);
      const dur = Date.now() - t0;
      setQueue((q) => q.map((e) => e.id === entry.id ? { ...e, status: result.success ? "success" as const : "failed" as const, orderId: result.success ? result.orderId : undefined, durationMs: dur } : e));
      if (i < snapshot.length - 1) await delay(200);
    }
    setRunning(false);
    const finalQueue = queue;
    const successes = finalQueue.filter((e) => e.status === "success").length;
    toast[successes === finalQueue.length ? "success" : "error"](
      `Queue done: ${successes}/${finalQueue.length} succeeded`
    );
  }, [running, queue]);

  const statusIcon = (s: QueueEntry["status"]) => {
    if (s === "success") return <CheckCircle2 size={12} className="text-emerald-400" />;
    if (s === "failed") return <XCircle size={12} className="text-red-400" />;
    if (s === "running") return <RotateCcw size={12} className="text-[#388bfd] animate-spin" />;
    return <div className="w-3 h-3 rounded-full border border-[#d8d0c0]" />;
  };

  const allRequiredValid = SELECTOR_FIELDS.filter((f) => f.required).every((f) => testResults[f.key]?.valid);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#2d2010] flex items-center gap-2">
            <Map size={14} className="text-emerald-400" /> Selector Mapper + Injection Queue
          </h2>
          <p className="text-[11px] text-[#9a8a72] mt-0.5">Live DOM selector testing · menu extraction · injection simulation</p>
        </div>
        {allRequiredValid && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <CheckCircle2 size={10} /> Ready
          </div>
        )}
      </div>

      {/* Saved configs */}
      {configs && configs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2">Saved Configs — click to load</p>
          <div className="flex flex-wrap gap-2">
            {configs.map((cfg) => (
              <button
                key={cfg._id}
                onClick={() => handleLoadConfig(cfg)}
                className="flex items-center gap-1.5 text-[10px] font-mono bg-[#faf6ed] border border-[#d8d0c0] hover:border-emerald-500/40 text-[#6b5c42] hover:text-[#2d2010] rounded-lg px-2.5 py-1.5 transition-all cursor-pointer"
              >
                <FileJson size={10} className="text-emerald-400" /> {cfg.locationId}
                <span className="text-[#9a8a72]">v{cfg.configVersion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* HTML input */}
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">POS HTML Source</p>
          <button
            onClick={() => setUsingSample(!usingSample)}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded border transition-all cursor-pointer",
              usingSample ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#f0ead8] border-[#d8d0c0] text-[#6b5c42] hover:text-[#2d2010]"
            )}
          >
            {usingSample ? "Using sample" : "Load sample"}
          </button>
        </div>
        <textarea
          value={usingSample ? SAMPLE_HTML : html}
          onChange={(e) => { setUsingSample(false); setHtml(e.target.value); setTestResults({}); setExtracted(false); }}
          rows={5}
          placeholder="Paste POS page HTML..."
          className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-3 py-2 text-[10px] font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40 resize-none"
        />
      </div>

      {/* Selector fields */}
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">DOM Selectors</p>
          <button
            onClick={runTests}
            disabled={testing}
            className="flex items-center gap-1.5 text-[10px] bg-[#f0ead8] border border-[#d8d0c0] hover:border-[#388bfd]/40 text-[#6b5c42] hover:text-[#2d2010] rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {testing ? <><RotateCcw size={10} className="animate-spin" /> Testing...</> : <><Play size={10} /> Test All</>}
          </button>
        </div>
        <div className="space-y-2">
          {SELECTOR_FIELDS.map((f) => {
            const r = testResults[f.key];
            return (
              <div key={f.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[#6b5c42]">
                    {f.label}{f.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {r && (
                    <span className={cn("text-[9px] font-mono", r.valid ? "text-emerald-400" : "text-red-400")}>
                      {r.valid ? `✓ ${r.matches} match${r.matches !== 1 ? "es" : ""}` : (r.error ?? "0 matches")}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={selectors[f.key]}
                  onChange={(e) => {
                    setSelectors((s) => ({ ...s, [f.key]: e.target.value }));
                    setTestResults((t) => { const n = { ...t }; delete n[f.key]; return n; });
                  }}
                  placeholder={f.placeholder}
                  className={cn(
                    "w-full bg-[#ece6d6] border rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none transition-colors",
                    r?.valid ? "border-emerald-500/40" : r && !r.valid ? "border-red-500/40" : "border-[#d8d0c0] focus:border-emerald-500/40"
                  )}
                />
                {r?.valid && r.samples.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.samples.map((s, j) => (
                      <span key={j} className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded px-1.5 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Extract + save */}
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">
            Menu Schema {extracted && <span className="text-emerald-400 normal-case">({extractedItems.length} items)</span>}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExtract}
              className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-3 py-1.5 transition-all cursor-pointer"
            >
              <ScanLine size={10} /> {extracted ? "Re-extract" : "Extract Menu"}
            </button>
            {extracted && extractedItems.length > 0 && (
              <button onClick={() => setJsonOpen(!jsonOpen)} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer">
                {jsonOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {jsonOpen && extractedItems.length > 0 && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="relative">
                <pre className="text-[9px] font-mono text-[#2d2010] bg-[#ece6d6] border border-[#cec6b4] rounded-lg p-3 overflow-x-auto max-h-40 overflow-y-auto">
                  {JSON.stringify(extractedItems.slice(0, 4), null, 2)}{extractedItems.length > 4 ? `\n// ... ${extractedItems.length - 4} more` : ""}
                </pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(extractedItems, null, 2)); toast.success("JSON copied"); }}
                  className="absolute top-2 right-2 text-[#9a8a72] hover:text-[#2d2010] cursor-pointer"
                >
                  <Copy size={11} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save to Convex */}
        <div className="flex gap-2">
          <input
            type="text"
            value={saveTarget}
            onChange={(e) => setSaveTarget(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            placeholder="location-id"
            className="flex-1 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
          />
          <button
            onClick={handleSave}
            disabled={saving || !saveTarget.trim()}
            className="flex items-center gap-1.5 text-[10px] bg-[#388bfd]/10 border border-[#388bfd]/25 text-[#388bfd] hover:bg-[#388bfd]/20 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={10} /> {saving ? "Saving..." : "Save Config"}
          </button>
        </div>
      </div>

      {/* Injection queue */}
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">
            Injection Queue ({queue.length} items)
          </p>
          <div className="flex gap-2">
            {queue.length > 0 && (
              <>
                <button
                  onClick={() => { abortRef.current = true; setRunning(false); }}
                  disabled={!running}
                  className="text-[10px] text-red-400 border border-red-500/25 rounded-lg px-2.5 py-1 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-30"
                >
                  Stop
                </button>
                <button
                  onClick={runQueue}
                  disabled={running || queue.length === 0}
                  className="flex items-center gap-1.5 text-[10px] bg-[#388bfd]/10 border border-[#388bfd]/25 text-[#388bfd] hover:bg-[#388bfd]/20 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {running ? <><RotateCcw size={10} className="animate-spin" /> Running...</> : <><Play size={10} /> Run Queue</>}
                </button>
                <button onClick={() => setQueue([])} className="text-[10px] text-[#9a8a72] hover:text-[#2d2010] cursor-pointer px-2">Clear</button>
              </>
            )}
          </div>
        </div>

        {/* Quick add from extracted items */}
        {extractedItems.length > 0 && (
          <div>
            <p className="text-[9px] text-[#9a8a72] mb-1.5">Add from extracted menu:</p>
            <div className="flex flex-wrap gap-1.5">
              {extractedItems.slice(0, 6).map((item, i) => (
                <button
                  key={i}
                  onClick={() => { addToQueue(item.pos_element_selector, item.item_name); toast(`Added: ${item.item_name}`); }}
                  className="flex items-center gap-1 text-[9px] font-mono bg-[#f0ead8] border border-[#cec6b4] hover:border-emerald-500/40 text-[#6b5c42] hover:text-emerald-400 rounded px-2 py-1 transition-all cursor-pointer"
                >
                  <Zap size={8} /> {item.item_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual selector add */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customSelector}
            onChange={(e) => setCustomSelector(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customSelector.trim()) {
                addToQueue(customSelector.trim(), customSelector.trim());
                setCustomSelector("");
              }
            }}
            placeholder='[data-item-id="pos-item-001"] or press Enter'
            className="flex-1 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
          />
          <button
            onClick={() => { if (customSelector.trim()) { addToQueue(customSelector.trim(), customSelector.trim()); setCustomSelector(""); } }}
            className="text-[10px] bg-[#ece6d6] border border-[#d8d0c0] text-[#6b5c42] hover:text-[#2d2010] rounded-lg px-3 py-1.5 cursor-pointer"
          >
            + Add
          </button>
        </div>

        {/* Queue rows */}
        {queue.length === 0 ? (
          <div className="text-center py-4 text-[#b8a890] text-[10px]">Queue is empty — add items above or from extracted menu</div>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {queue.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2.5 bg-[#f0ead8] border border-[#cec6b4] rounded-lg px-3 py-2">
                {statusIcon(entry.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#2d2010] truncate">{entry.label}</p>
                  <p className="text-[9px] font-mono text-[#9a8a72] truncate">{entry.selector}</p>
                </div>
                {entry.orderId && <span className="text-[9px] font-mono text-emerald-400">{entry.orderId}</span>}
                {entry.durationMs && <span className="text-[9px] text-[#9a8a72]">{entry.durationMs}ms</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-start gap-1.5 bg-[#f0ead8] border border-[#cec6b4] rounded-lg px-3 py-2">
          <Info size={11} className="text-[#9a8a72] shrink-0 mt-0.5" />
          <p className="text-[9px] text-[#9a8a72] leading-relaxed">
            Queue runs a simulated injection with 15% random failure rate for testing retry logic. In production, the agent fires a real <code className="text-[#388bfd]">MouseEvent("click")</code> on the POS DOM.
          </p>
        </div>
      </div>

    </div>
  );
}
