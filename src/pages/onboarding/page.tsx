import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2, XCircle, ChevronRight, ChevronLeft, Copy,
  Download, Play, RotateCcw, AlertCircle, Info, Zap,
  Map, ScanLine, Settings2, CheckCheck, ExternalLink,
  FileJson, Globe, Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { Link } from "react-router-dom";

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
  label: string;
  matches: number;
  samples: string[];
  valid: boolean;
  error?: string;
  required: boolean;
};

// ── Wizard steps ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Restaurant Info", icon: Settings2, desc: "Name, location ID, POS URL" },
  { id: 2, label: "Selector Mapper", icon: Map, desc: "Map your POS DOM selectors" },
  { id: 3, label: "Menu Extractor", icon: ScanLine, desc: "Preview & save your menu" },
  { id: 4, label: "Save & Deploy", icon: CheckCheck, desc: "Config saved, bundle ready" },
];

// ── Selector field definitions ─────────────────────────────────────────────────

const SELECTOR_FIELDS: {
  key: keyof SelectorMap;
  label: string;
  placeholder: string;
  hint: string;
  required: boolean;
}[] = [
  {
    key: "container",
    label: "Menu Container",
    placeholder: "#menu-wrapper, .pos-menu, [data-menu]",
    hint: "Root element wrapping all menu items",
    required: true,
  },
  {
    key: "item",
    label: "Menu Item",
    placeholder: ".menu-item, [data-item-id], li.product",
    hint: "Each individual menu item node inside the container",
    required: true,
  },
  {
    key: "nameSelector",
    label: "Item Name",
    placeholder: ".item-name, [data-name], h3.title",
    hint: "Element or attribute that contains the item name text",
    required: true,
  },
  {
    key: "priceSelector",
    label: "Item Price",
    placeholder: ".price, [data-price], span.cost",
    hint: "Element or attribute that contains the price",
    required: true,
  },
  {
    key: "addButton",
    label: "Add-to-Cart Button",
    placeholder: ".add-to-cart, button[data-add], [data-action='add']",
    hint: "Button that adds the item — this is what injectAIOrder() fires",
    required: false,
  },
];

// ── Sample POS HTML ────────────────────────────────────────────────────────────

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

// ── DOM parsing helpers ────────────────────────────────────────────────────────

function parseHTML(html: string): Document | null {
  try {
    return new DOMParser().parseFromString(html, "text/html");
  } catch {
    return null;
  }
}

function resolveText(el: Element, selector: string): string {
  try {
    const child = el.querySelector(selector);
    if (child) return child.textContent?.trim() ?? "";
  } catch {
    // not a valid selector — try attribute
  }
  const attrVal = el.getAttribute(selector);
  if (attrVal) return attrVal;
  try {
    if (el.matches(selector)) return el.textContent?.trim() ?? "";
  } catch { /* ignore */ }
  return "";
}

function runSelectorTest(doc: Document, field: (typeof SELECTOR_FIELDS)[number], selectors: SelectorMap): TestResult {
  const { key, label, required } = field;
  const sel = selectors[key].trim();

  if (!sel) {
    return { key, label, matches: 0, samples: [], valid: false, error: "No selector entered", required };
  }

  try {
    if (key === "container") {
      const els = Array.from(doc.querySelectorAll(sel));
      const samples = els.slice(0, 3).map((el) => `<${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ""}>`);
      return { key, label, matches: els.length, samples, valid: els.length > 0, required };
    }

    const container = selectors.container ? doc.querySelector(selectors.container) ?? doc.body : doc.body;

    if (key === "item") {
      const els = Array.from(container.querySelectorAll(sel));
      const samples = els.slice(0, 3).map(
        (el) => el.getAttribute("data-item-id") ?? el.getAttribute("data-item-name") ?? el.textContent?.trim().slice(0, 40) ?? el.tagName.toLowerCase()
      );
      return { key, label, matches: els.length, samples, valid: els.length > 0, required };
    }

    if (key === "nameSelector" || key === "priceSelector") {
      const items = Array.from(container.querySelectorAll(selectors.item || "*"));
      const resolved: string[] = [];
      for (const item of items) {
        const val = resolveText(item, sel);
        if (val) resolved.push(val);
      }
      return { key, label, matches: resolved.length, samples: resolved.slice(0, 3), valid: resolved.length > 0, required };
    }

    if (key === "addButton") {
      const items = Array.from(container.querySelectorAll(selectors.item || "*"));
      let found = 0;
      const samples: string[] = [];
      for (const item of items) {
        try {
          const btn = item.querySelector(sel);
          if (btn) {
            found++;
            const lbl = btn.textContent?.trim() ?? btn.getAttribute("data-action") ?? btn.tagName;
            if (samples.length < 3) samples.push(lbl);
          }
        } catch { /* skip invalid selector on item */ }
      }
      return { key, label, matches: found, samples, valid: found > 0, required };
    }

    return { key, label, matches: 0, samples: [], valid: false, required };
  } catch (err) {
    return { key, label, matches: 0, samples: [], valid: false, error: `Invalid selector: ${String(err)}`, required };
  }
}

function extractItems(doc: Document, selectors: SelectorMap): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  try {
    const container = selectors.container ? doc.querySelector(selectors.container) ?? doc.body : doc.body;
    const itemEls = Array.from(container.querySelectorAll(selectors.item));
    itemEls.forEach((el, idx) => {
      const name = resolveText(el, selectors.nameSelector) || `Item ${idx + 1}`;
      const price = resolveText(el, selectors.priceSelector) || "0.00";
      const id = el.getAttribute("data-item-id") ?? el.getAttribute("id") ?? `item-${idx + 1}`;
      const itemSel = `[data-item-id="${id}"]`;
      const addBtnSel = selectors.addButton ? `[data-item-id="${id}"] ${selectors.addButton}` : `[data-item-id="${id}"] button`;
      items.push({
        item_name: name,
        item_price: price.replace(/[^0-9.]/g, ""),
        pos_element_selector: itemSel,
        add_button_selector: addBtnSel,
      });
    });
  } catch { /* ignore parse errors */ }
  return items;
}

// ── Bundle generator ───────────────────────────────────────────────────────────

function generateBundle(storeName: string, locationId: string, selectors: SelectorMap, posUrl?: string): string {
  return `/**
 * revenue-pulse-agent.js
 * Generated by OrderLine RevenuePlus — ${new Date().toISOString()}
 * Store: ${storeName} (${locationId})
 */
(function() {
  const CONFIG = {
    store_name: ${JSON.stringify(storeName)},
    store_id: ${JSON.stringify(locationId)},
    pos_url: ${JSON.stringify(posUrl ?? "")},
    pos_selector_map: {
      container: ${JSON.stringify(selectors.container)},
      item: ${JSON.stringify(selectors.item)},
      name_selector: ${JSON.stringify(selectors.nameSelector)},
      price_selector: ${JSON.stringify(selectors.priceSelector)},
      add_button: ${JSON.stringify(selectors.addButton)},
    }
  };

  window.revenuePulse = {
    config: CONFIG,
    extractMenu: function() {
      var container = document.querySelector(CONFIG.pos_selector_map.container);
      if (!container) return [];
      return Array.from(container.querySelectorAll(CONFIG.pos_selector_map.item)).map(function(el, i) {
        var nameEl = el.querySelector(CONFIG.pos_selector_map.name_selector);
        var priceEl = el.querySelector(CONFIG.pos_selector_map.price_selector);
        var id = el.getAttribute("data-item-id") || ("item-" + (i+1));
        return {
          item_name: nameEl ? nameEl.textContent.trim() : (el.getAttribute("data-item-name") || ""),
          item_price: priceEl ? priceEl.textContent.trim().replace(/[^0-9.]/g,"") : (el.getAttribute("data-item-price") || "0"),
          pos_element_selector: '[data-item-id="' + id + '"]',
          add_button_selector: '[data-item-id="' + id + '"] ' + CONFIG.pos_selector_map.add_button,
        };
      });
    },
    injectOrder: function(selector, modifications) {
      var el = document.querySelector(selector);
      if (!el) return { success: false, message: "Element not found: " + selector };
      var btn = el.querySelector(CONFIG.pos_selector_map.add_button) || el.querySelector("button");
      if (!btn) return { success: false, message: "Add button not found inside: " + selector };
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      var orderId = "rp-" + Date.now().toString(36);
      console.log("[RevenuePulse] Injected:", selector, "→", orderId);
      return { success: true, order_id: orderId, selector: selector, modifications: modifications || [] };
    },
    clearCart: function() {
      console.log("[RevenuePulse] clearCart called");
      return true;
    },
  };

  window.injectAIOrder = function(selector, modifications) {
    return window.revenuePulse.injectOrder(selector, modifications);
  };

  window.addEventListener("message", function(event) {
    if (!event.data || event.data.source !== "revenuePulse-agent") return;
    var cmd = event.data.command;
    var response;
    if (cmd.action === "inject_order") {
      response = window.revenuePulse.injectOrder(cmd.payload.selector, cmd.payload.modifications);
    } else if (cmd.action === "extract_menu") {
      response = { items: window.revenuePulse.extractMenu() };
    } else if (cmd.action === "clear_cart") {
      response = { cleared: window.revenuePulse.clearCart() };
    }
    if (event.source) {
      event.source.postMessage({ source: "revenuePulse-bridge", response: response }, "*");
    }
  });

  console.log("[RevenuePulse] ✓ Agent bridge online —", CONFIG.store_name);
  console.log("[RevenuePulse] window.revenuePulse.extractMenu()");
  console.log("[RevenuePulse] window.injectAIOrder(selector)");
})();
`;
}

function generateConfig(storeName: string, locationId: string, selectors: SelectorMap, posUrl?: string): string {
  return JSON.stringify({
    store_name: storeName,
    store_id: locationId,
    pos_url: posUrl ?? "",
    pos_selector_map: {
      container: selectors.container,
      item: selectors.item,
      name_selector: selectors.nameSelector,
      price_selector: selectors.priceSelector,
      add_button: selectors.addButton,
    },
  }, null, 2);
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const saveConfig = useMutation(api.restaurantConfigs.saveConfig);

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Step 1: restaurant info
  const [storeName, setStoreName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [posUrl, setPosUrl] = useState("");

  // Step 2: selector mapper
  const [pastedHtml, setPastedHtml] = useState("");
  const [usingSample, setUsingSample] = useState(false);
  const [selectors, setSelectors] = useState<SelectorMap>({
    container: "",
    item: "",
    nameSelector: "",
    priceSelector: "",
    addButton: "",
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testing, setTesting] = useState(false);

  // Step 3: menu extractor
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  const activeHtml = usingSample ? SAMPLE_HTML : pastedHtml;

  // ── Step 1 validation ────────────────────────────────────────────────────────
  const step1Valid = storeName.trim().length >= 2 && locationId.trim().length >= 2;

  const handleLocationIdInput = (val: string) => {
    // Auto-slug: lowercase, hyphens only
    setLocationId(val.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"));
  };

  // ── Step 2: run selector tests ───────────────────────────────────────────────
  const runTests = useCallback(() => {
    if (!activeHtml.trim()) {
      toast.error("Paste your POS HTML or load the sample first");
      return;
    }
    setTesting(true);
    setTimeout(() => {
      const doc = parseHTML(activeHtml);
      if (!doc) {
        toast.error("Failed to parse HTML");
        setTesting(false);
        return;
      }
      const results: Record<string, TestResult> = {};
      for (const field of SELECTOR_FIELDS) {
        results[field.key] = runSelectorTest(doc, field, selectors);
      }
      setTestResults(results);
      const allRequiredValid = SELECTOR_FIELDS.filter((f) => f.required).every((f) => results[f.key]?.valid);
      if (allRequiredValid) {
        toast.success("All required selectors matched — ready to extract menu");
      } else {
        toast("Some selectors need adjustment");
      }
      setTesting(false);
    }, 80);
  }, [activeHtml, selectors]);

  const step2Valid =
    SELECTOR_FIELDS.filter((f) => f.required).every((f) => testResults[f.key]?.valid) &&
    Object.keys(testResults).length > 0;

  // ── Step 3: extract menu ─────────────────────────────────────────────────────
  const handleExtract = useCallback(() => {
    const doc = parseHTML(activeHtml);
    if (!doc) {
      toast.error("Cannot parse HTML — go back to Step 2");
      return;
    }
    const items = extractItems(doc, selectors);
    setExtractedItems(items);
    setHasExtracted(true);
    if (items.length > 0) {
      toast.success(`Extracted ${items.length} menu item${items.length !== 1 ? "s" : ""}`);
    } else {
      toast.error("No items found — check your selectors in Step 2");
    }
  }, [activeHtml, selectors]);

  // ── Step 4: save & generate bundle ──────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig({
        locationId,
        storeName,
        posUrl: posUrl || undefined,
        selectorMap: selectors,
        menuSnapshot: extractedItems.length > 0 ? extractedItems : undefined,
      });
      toast.success(`Config saved for ${storeName}`);
    } catch {
      toast.error("Failed to save config");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBundle = () => {
    const bundle = generateBundle(storeName, locationId, selectors, posUrl);
    downloadTextFile(bundle, `revenue-pulse-agent-${locationId}.js`);
    toast.success("revenue-pulse-agent.js downloaded");
  };

  const handleDownloadConfig = () => {
    const config = generateConfig(storeName, locationId, selectors, posUrl);
    downloadTextFile(config, `restaurant-config-${locationId}.json`);
    toast.success("restaurant-config.json downloaded");
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const stepBg = (n: number) => {
    if (n < step) return "bg-emerald-500 border-emerald-500 text-white";
    if (n === step) return "bg-emerald-500 border-emerald-500 text-white";
    return "bg-[#ece6d6] border-[#cec6b4] text-[#6b5c42]";
  };

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">
      {/* Header */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Zap size={15} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#2d2010]">RevenuePlus — Restaurant Onboarding</h1>
            <p className="text-[10px] text-[#6b5c42]">Connect any POS in minutes</p>
          </div>
        </div>
        <Link to="/hub" className="text-[#6b5c42] hover:text-[#2d2010] transition-colors text-xs border border-[#cec6b4] rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <Globe size={12} /> System Map
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={cn("flex items-center gap-2 shrink-0", s.id < step && "cursor-pointer")}
              >
                <div className={cn("w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all", stepBg(s.id))}>
                  {s.id < step ? <CheckCircle2 size={14} /> : s.id}
                </div>
                <span className={cn("text-xs font-medium hidden sm:block", s.id === step ? "text-[#2d2010]" : s.id < step ? "text-emerald-600" : "text-[#9a8a72]")}>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-px mx-3", step > s.id ? "bg-emerald-500/40" : "bg-[#cec6b4]")} />
              )}
            </div>
          ))}
        </div>

        {/* Step panels */}
        <AnimatePresence mode="wait">
          {/* ── Step 1: Restaurant Info ── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-[#2d2010] mb-1">Restaurant Information</h2>
                  <p className="text-[12px] text-[#6b5c42]">This becomes the identity of your POS integration config.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-[#6b5c42] mb-1.5">Store Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Mario's Pizza"
                      className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2.5 text-sm text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-[#6b5c42] mb-1.5">Location ID <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={locationId}
                      onChange={(e) => handleLocationIdInput(e.target.value)}
                      placeholder="marios-chicago-01"
                      className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2.5 text-sm text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                    <p className="text-[11px] text-[#9a8a72] mt-1">Lowercase letters, numbers, and hyphens only. This is a permanent identifier.</p>
                  </div>

                  <div>
                    <label className="block text-xs text-[#6b5c42] mb-1.5">POS Online Order URL <span className="text-[#9a8a72]">(optional)</span></label>
                    <input
                      type="url"
                      value={posUrl}
                      onChange={(e) => setPosUrl(e.target.value)}
                      placeholder="https://your-pos-system.com/order"
                      className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2.5 text-sm text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                    <p className="text-[11px] text-[#9a8a72] mt-1">The URL loaded in the bridge right pane for order entry.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-5">
                <Button
                  disabled={!step1Valid}
                  onClick={() => setStep(2)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                >
                  Next: Selector Mapper <ChevronRight size={15} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Selector Mapper ── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="space-y-4">

                {/* Concierge option — featured at the top */}
                <div className="bg-emerald-500/8 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#2d2010] mb-1">Let us do this for you</p>
                    <p className="text-[12px] text-[#6b5c42] leading-relaxed">
                      This step requires looking up technical codes from your POS page. If that sounds tricky, our team can handle it for free — just send us access and we'll have you live in 24 hours.
                    </p>
                  </div>
                  <a
                    href="mailto:setup@orderline.app?subject=Concierge POS Setup&body=Hi, I'd like help setting up my POS integration for: "
                    className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-lg px-4 py-2.5 text-sm transition-colors"
                  >
                    <Headphones size={14} /> Request Free Setup
                  </a>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#d8d0c0]" />
                  <span className="text-xs text-[#9a8a72]">or set it up yourself</span>
                  <div className="flex-1 h-px bg-[#d8d0c0]" />
                </div>

                {/* HTML input */}
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-[#2d2010]">Step 1 — Paste POS HTML</h2>
                      <p className="text-[11px] text-[#6b5c42] mt-0.5">
                        Open your POS page in Chrome, right-click a menu item, choose "Inspect", then copy the surrounding HTML and paste it here.
                        Or load our sample to see how it works.
                      </p>
                    </div>
                    <button
                      onClick={() => { setUsingSample(!usingSample); setPastedHtml(usingSample ? "" : SAMPLE_HTML); }}
                      className={cn(
                        "text-[11px] px-3 py-1.5 rounded-lg border transition-all shrink-0",
                        usingSample
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                          : "bg-[#ece6d6] border-[#cec6b4] text-[#6b5c42] hover:text-[#2d2010]"
                      )}
                    >
                      {usingSample ? "Using sample" : "Load sample"}
                    </button>
                  </div>
                  <textarea
                    value={usingSample ? SAMPLE_HTML : pastedHtml}
                    onChange={(e) => { setUsingSample(false); setPastedHtml(e.target.value); setTestResults({}); }}
                    rows={6}
                    placeholder="Paste your POS page HTML here..."
                    className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2.5 text-[11px] font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/60 resize-none transition-colors"
                  />
                </div>

                {/* Selector fields */}
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-[#2d2010]">Step 2 — Map DOM Selectors</h2>
                      <p className="text-[11px] text-[#6b5c42] mt-0.5">Define how the agent navigates your POS DOM to find items and inject orders.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={runTests}
                      disabled={testing || !activeHtml.trim()}
                      className="bg-[#ece6d6] hover:bg-[#d8d0c0] text-[#2d2010] border border-[#cec6b4] text-xs gap-1.5"
                    >
                      {testing ? <><RotateCcw size={11} className="animate-spin" /> Testing...</> : <><Play size={11} /> Test Selectors</>}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {SELECTOR_FIELDS.map((field) => {
                      const result = testResults[field.key];
                      return (
                        <div key={field.key}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-[#6b5c42]">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {result && (
                              <div className={cn("flex items-center gap-1.5 text-[10px] font-mono", result.valid ? "text-emerald-400" : "text-red-400")}>
                                {result.valid
                                  ? <><CheckCircle2 size={10} /> {result.matches} match{result.matches !== 1 ? "es" : ""}</>
                                  : <><XCircle size={10} /> {result.error ?? "0 matches"}</>}
                              </div>
                            )}
                          </div>
                          <input
                            type="text"
                            value={selectors[field.key]}
                            onChange={(e) => {
                              setSelectors((prev) => ({ ...prev, [field.key]: e.target.value }));
                              setTestResults((prev) => { const next = { ...prev }; delete next[field.key]; return next; });
                            }}
                            placeholder={field.placeholder}
                            className={cn(
                              "w-full bg-[#ece6d6] border rounded-lg px-3 py-2 text-xs font-mono text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none transition-colors",
                              result?.valid ? "border-emerald-500/40 focus:border-emerald-500/60" : result && !result.valid ? "border-red-500/40 focus:border-red-500/60" : "border-[#cec6b4] focus:border-emerald-500/60"
                            )}
                          />
                          <p className="text-[10px] text-[#9a8a72] mt-1">{field.hint}</p>
                          {result?.valid && result.samples.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {result.samples.map((s, i) => (
                                <span key={i} className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Info note */}
                <div className="flex gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
                  <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#8b949e] leading-relaxed">
                    All selectors are tested against the HTML you pasted — not a live page. For live POS pages, open the browser DevTools (F12) and inspect the DOM to find the right selectors, then test them here.
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-5">
                <Button variant="ghost" onClick={() => setStep(1)} className="text-[#6b5c42] hover:text-[#2d2010] gap-1.5">
                  <ChevronLeft size={15} /> Back
                </Button>
                <Button
                  disabled={!step2Valid}
                  onClick={() => setStep(3)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                >
                  Next: Extract Menu <ChevronRight size={15} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Menu Extractor ── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="space-y-4">
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-[#2d2010]">Menu Schema Extractor</h2>
                      <p className="text-[11px] text-[#6b5c42] mt-0.5">
                        Parse the POS HTML using your selectors → structured JSON schema the AI agent uses for every call.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleExtract}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs gap-1.5"
                    >
                      <ScanLine size={12} /> {hasExtracted ? "Re-extract" : "Extract Menu"}
                    </Button>
                  </div>

                  {!hasExtracted && (
                    <div className="flex items-center gap-2 bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-4 py-6 justify-center">
                      <ScanLine size={20} className="text-[#9a8a72]" />
                      <p className="text-sm text-[#9a8a72]">Click "Extract Menu" to parse your POS HTML</p>
                    </div>
                  )}

                  {hasExtracted && extractedItems.length === 0 && (
                    <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-4">
                      <AlertCircle size={15} className="text-red-400 shrink-0" />
                      <p className="text-xs text-red-300">No items extracted. Go back to Step 2 and verify your selectors match your POS HTML.</p>
                    </div>
                  )}

                  {extractedItems.length > 0 && (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {extractedItems.map((item, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#2d2010] truncate">{item.item_name}</p>
                            <p className="text-[10px] font-mono text-[#9a8a72] mt-0.5 truncate">{item.pos_element_selector}</p>
                          </div>
                          <span className="text-xs text-emerald-400 font-mono shrink-0">${item.item_price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {extractedItems.length > 0 && (
                  <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                    <h3 className="text-xs font-semibold text-[#6b5c42] mb-3">JSON Preview — what the AI agent receives</h3>
                    <pre className="text-[10px] font-mono text-[#2d2010] bg-[#ece6d6] border border-[#d8d0c0] rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                      {JSON.stringify(extractedItems.slice(0, 3), null, 2)}
                      {extractedItems.length > 3 ? `\n// ... ${extractedItems.length - 3} more items` : ""}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-5">
                <Button variant="ghost" onClick={() => setStep(2)} className="text-[#6b5c42] hover:text-[#2d2010] gap-1.5">
                  <ChevronLeft size={15} /> Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!hasExtracted}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white gap-2"
                >
                  Next: Save & Deploy <ChevronRight size={15} />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Step 4: Save & Deploy ── */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#2d2010] mb-4">Configuration Summary</h2>
                  <div className="space-y-2">
                    {[
                      { label: "Store Name", value: storeName },
                      { label: "Location ID", value: locationId },
                      { label: "POS URL", value: posUrl || "Not set" },
                      { label: "Menu Items", value: extractedItems.length > 0 ? `${extractedItems.length} items extracted` : "None extracted" },
                      { label: "Container Selector", value: selectors.container },
                      { label: "Item Selector", value: selectors.item },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-[#d8d0c0] last:border-0">
                        <span className="text-[11px] text-[#6b5c42] shrink-0">{label}</span>
                        <span className="text-[11px] text-[#2d2010] font-mono text-right truncate max-w-[60%]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save to Convex */}
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#2d2010]">Save Configuration</h3>
                      <p className="text-[11px] text-[#6b5c42] mt-0.5">Persists to Convex — the bridge will use this config automatically.</p>
                    </div>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs gap-1.5"
                    >
                      {isSaving ? <><RotateCcw size={11} className="animate-spin" /> Saving...</> : <><CheckCheck size={12} /> Save Config</>}
                    </Button>
                  </div>
                </div>

                {/* Download bundle */}
                <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[#2d2010] mb-1">Integration Bundle</h3>
                  <p className="text-[11px] text-[#6b5c42] mb-4">
                    Drop <code className="text-emerald-600">revenue-pulse-agent.js</code> into any POS page (bookmarklet or script tag). Load the config JSON. Your AI voice agent is live — no POS API key required.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={handleDownloadBundle}
                      className="flex items-center gap-3 bg-[#ece6d6] border border-[#cec6b4] hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <Download size={15} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#2d2010] group-hover:text-emerald-600 transition-colors">revenue-pulse-agent.js</p>
                        <p className="text-[10px] text-[#9a8a72]">Full agent bridge · {extractedItems.length} items embedded</p>
                      </div>
                    </button>

                    <button
                      onClick={handleDownloadConfig}
                      className="flex items-center gap-3 bg-[#ece6d6] border border-[#cec6b4] hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <FileJson size={15} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#2d2010] group-hover:text-emerald-600 transition-colors">restaurant-config.json</p>
                        <p className="text-[10px] text-[#9a8a72]">Selector map + store info</p>
                      </div>
                    </button>
                  </div>

                  {/* Webhook reference */}
                  <div className="mt-4 bg-[#ece6d6] border border-[#d8d0c0] rounded-lg p-4">
                    <p className="text-[11px] text-[#6b5c42] font-semibold mb-2">Required Webhook Endpoints</p>
                    <div className="space-y-1.5">
                      {[
                        { method: "POST", path: "/api/order", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", desc: "AI agent pushes captured orders here" },
                        { method: "GET", path: "/api/menu-schema", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", desc: "Returns full menu JSON for agent pre-call load" },
                        { method: "GET", path: "/api/customer-lookup", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", desc: "Resolves caller phone → saved profile" },
                      ].map(({ method, path, color, desc }) => (
                        <div key={path} className="flex items-center gap-2 text-[10px] font-mono">
                          <span className={cn("px-1.5 py-0.5 rounded border text-[9px] font-bold", color)}>{method}</span>
                          <span className="text-[#2d2010]">{path}</span>
                          <span className="text-[#9a8a72] font-sans">— {desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3 bg-[#faf6ed] border border-[#cec6b4] rounded-xl p-4">
                  <div className="flex-1">
                    <p className="text-xs text-[#2d2010] font-medium">Ready to test?</p>
                    <p className="text-[11px] text-[#6b5c42]">Open the bridge page for {storeName || "this restaurant"} and run a test order.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-[#6b5c42] hover:text-[#2d2010] text-xs">
                      Start Over
                    </Button>
                    <Button
                      onClick={() => navigate(`/bridge/${locationId}`)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white text-xs gap-1.5"
                    >
                      Open Bridge <ExternalLink size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
