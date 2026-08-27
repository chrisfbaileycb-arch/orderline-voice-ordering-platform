import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Link } from "react-router-dom";
import {
  Lock, Eye, EyeOff, ArrowRight, Plus, Search, ExternalLink,
  Edit2, Trash2, ChevronDown, X, Check, AlertTriangle,
  Building2, Phone, Mail, User, Globe, Zap, RefreshCcw,
  MoreHorizontal, Download, Activity, Package, Map,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

// ── Types ─────────────────────────────────────────────────────────────────────

type Config = Doc<"restaurantConfigs">;
type Status = "active" | "pending" | "trial" | "churned";

const STATUS_META: Record<Status, { label: string; color: string; dot: string }> = {
  active:  { label: "Active",  color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",  dot: "bg-emerald-400" },
  pending: { label: "Pending", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",     dot: "bg-yellow-400" },
  trial:   { label: "Trial",   color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",        dot: "bg-emerald-400" },
  churned: { label: "Churned", color: "text-[#9a8a72] bg-[#ece6d6] border-[#cec6b4]",              dot: "bg-[#9a8a72]" },
};

function statusMeta(s: string | undefined) {
  return STATUS_META[(s ?? "pending") as Status] ?? STATUS_META.pending;
}

// ── PIN gate ──────────────────────────────────────────────────────────────────

const ADMIN_PIN = "1234";
const SESSION_KEY = "orderline:admin-unlocked";

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const [show, setShow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const attempt = (val: string) => {
    if (val === ADMIN_PIN) {
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

  return (
    <div className="min-h-screen bg-[#f0ead8] flex flex-col">
      {/* Admin banner */}
      <div className="bg-emerald-500/15 border-b border-emerald-500/25 text-emerald-400 py-2 px-6 text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2">
        <Lock size={14} />
        Admin Console
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
              <Lock size={22} className="text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-[#2d2010] mb-1">Restaurant Admin</h1>
            <p className="text-[#6b5c42] text-sm">Authorized personnel only</p>
          </div>

          <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-2xl p-6">
            <motion.div
              animate={shake ? { x: [-8, 8, -8, 8, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex justify-center gap-3 mb-6"
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                    i < digits.length
                      ? "bg-emerald-400 border-emerald-400"
                      : "bg-transparent border-[#cec6b4]"
                  )}
                />
              ))}
            </motion.div>

            {show && digits.length > 0 && (
              <p className="text-center font-mono text-lg text-[#2d2010] mb-4 tracking-[0.5em]">
                {digits.padEnd(4, "·")}
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, idx) => (
                <button
                  key={idx}
                  onClick={() => k === "⌫" ? setDigits(d => d.slice(0, -1)) : k ? handleKey(k) : undefined}
                  disabled={!k}
                  className={cn(
                    "h-14 rounded-xl text-[#2d2010] text-lg font-semibold transition-all cursor-pointer",
                    k ? "bg-[#f0ead8] border border-[#cec6b4] hover:bg-[#ece6d6] hover:border-emerald-500/40 active:scale-95" : "opacity-0 pointer-events-none"
                  )}
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShow(!show)}
              className="w-full flex items-center justify-center gap-1.5 text-[#9a8a72] hover:text-[#6b5c42] text-xs mt-4 transition-colors cursor-pointer"
            >
              {show ? <EyeOff size={12} /> : <Eye size={12} />} {show ? "Hide" : "Show"} digits
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link to="/" className="text-[#9a8a72] hover:text-emerald-400 text-xs flex items-center gap-1 justify-center transition-colors">
              <ArrowRight size={11} className="rotate-180" /> Back to home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Add / Edit drawer ─────────────────────────────────────────────────────────

type FormData = {
  locationId: string;
  storeName: string;
  posUrl: string;
  twilioNumber: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: Status;
  notes: string;
};

const EMPTY_FORM: FormData = {
  locationId: "",
  storeName: "",
  posUrl: "",
  twilioNumber: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  status: "pending",
  notes: "",
};

function configToForm(c: Config): FormData {
  return {
    locationId: c.locationId,
    storeName: c.storeName,
    posUrl: c.posUrl ?? "",
    twilioNumber: c.twilioNumber ?? "",
    contactName: c.contactName ?? "",
    contactEmail: c.contactEmail ?? "",
    contactPhone: c.contactPhone ?? "",
    status: (c.status ?? "pending") as Status,
    notes: c.notes ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] text-[#9a8a72] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2 text-[12px] text-[#2d2010] placeholder-[#b8a890] focus:outline-none focus:border-emerald-500/50 transition-colors";

function RestaurantDrawer({
  mode,
  initial,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  initial?: Config;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormData>(initial ? configToForm(initial) : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const quickAdd = useMutation(api.restaurantConfigs.quickAdd);
  const updateDetails = useMutation(api.restaurantConfigs.updateDetails);
  const deleteConfig = useMutation(api.restaurantConfigs.deleteConfig);

  const set = (field: keyof FormData, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.locationId.trim() || !form.storeName.trim()) {
      toast.error("Location ID and store name are required");
      return;
    }
    setSaving(true);
    try {
      if (mode === "add") {
        await quickAdd({
          locationId: form.locationId.trim().toLowerCase().replace(/\s+/g, "-"),
          storeName: form.storeName.trim(),
          posUrl: form.posUrl || undefined,
          twilioNumber: form.twilioNumber || undefined,
          contactName: form.contactName || undefined,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          status: form.status,
          notes: form.notes || undefined,
        });
        toast.success(`${form.storeName} added`);
      } else {
        await updateDetails({
          locationId: form.locationId,
          storeName: form.storeName.trim(),
          posUrl: form.posUrl || undefined,
          twilioNumber: form.twilioNumber || undefined,
          contactName: form.contactName || undefined,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          status: form.status,
          notes: form.notes || undefined,
        });
        toast.success("Restaurant updated");
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message: string };
        toast.error(d.message);
      } else {
        toast.error("Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    setSaving(true);
    try {
      await deleteConfig({ locationId: initial.locationId });
      toast.success("Restaurant removed");
      onSaved();
      onClose();
    } catch {
      toast.error("Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/50" />
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full max-w-md bg-[#faf6ed] border-l border-[#d8d0c0] h-full overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#d8d0c0] sticky top-0 bg-[#faf6ed] z-10">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-emerald-400" />
            <span className="text-sm font-bold text-[#2d2010]">
              {mode === "add" ? "Add Restaurant" : "Edit Restaurant"}
            </span>
          </div>
          <button onClick={onClose} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 p-5 space-y-5">
          {/* Identity */}
          <div className="space-y-3">
            <p className="text-[9px] text-[#9a8a72] uppercase tracking-widest font-semibold leading-none">Identity</p>
            <Field label="Store name *">
              <input
                value={form.storeName}
                onChange={e => set("storeName", e.target.value)}
                placeholder="Charlie's Restaurant"
                className={inputCls}
                autoFocus
              />
            </Field>
            <Field label="Location ID *">
              <input
                value={form.locationId}
                onChange={e => set("locationId", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="charlies-chicago-01"
                disabled={mode === "edit"}
                className={cn(inputCls, mode === "edit" && "opacity-50 cursor-not-allowed")}
              />
              {mode === "add" && (
                <p className="text-[9px] text-[#9a8a72] mt-1">Lowercase, hyphens only. Cannot be changed after creation.</p>
              )}
            </Field>
            <Field label="Status">
              <div className="flex gap-2">
                {(["active", "trial", "pending", "churned"] as Status[]).map(s => (
                  <button
                    key={s}
                    onClick={() => set("status", s)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-semibold rounded-lg border cursor-pointer transition-all",
                      form.status === s
                        ? statusMeta(s).color
                        : "text-[#9a8a72] border-[#d8d0c0] hover:border-[#cec6b4]"
                    )}
                  >
                    {statusMeta(s).label}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Technical */}
          <div className="space-y-3">
            <p className="text-[9px] text-[#9a8a72] uppercase tracking-widest font-semibold leading-none">Technical</p>
            <Field label="POS URL">
              <input
                value={form.posUrl}
                onChange={e => set("posUrl", e.target.value)}
                placeholder="https://pos.heartland.us/restaurant/…"
                className={inputCls}
              />
            </Field>
            <Field label="Twilio number">
              <input
                value={form.twilioNumber}
                onChange={e => set("twilioNumber", e.target.value)}
                placeholder="+13125550100"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-[9px] text-[#9a8a72] uppercase tracking-widest font-semibold leading-none">Point of Contact</p>
            <Field label="Contact name">
              <input
                value={form.contactName}
                onChange={e => set("contactName", e.target.value)}
                placeholder="John Smith"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email">
                <input
                  value={form.contactEmail}
                  onChange={e => set("contactEmail", e.target.value)}
                  placeholder="john@example.com"
                  type="email"
                  className={inputCls}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.contactPhone}
                  onChange={e => set("contactPhone", e.target.value)}
                  placeholder="3125550100"
                  className={cn(inputCls, "font-mono")}
                />
              </Field>
            </div>
          </div>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Onboarding notes, contract details, special requirements…"
              rows={3}
              className={cn(inputCls, "resize-none")}
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#d8d0c0] space-y-2 sticky bottom-0 bg-[#faf6ed]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCcw size={13} className="animate-spin" /> : <Check size={13} />}
            {mode === "add" ? "Add Restaurant" : "Save Changes"}
          </button>

          {mode === "edit" && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 text-[11px] text-[#9a8a72] border border-[#d8d0c0] rounded-xl cursor-pointer hover:text-[#2d2010] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/25 rounded-xl cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  Confirm delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 text-[11px] text-[#9a8a72] hover:text-red-400 border border-[#d8d0c0] hover:border-red-500/25 rounded-xl cursor-pointer transition-colors"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Trash2 size={11} /> Remove restaurant
                </span>
              </button>
            )
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Restaurant card ───────────────────────────────────────────────────────────

function RestaurantCard({ config, onEdit }: { config: Config; onEdit: (c: Config) => void }) {
  const sm = statusMeta(config.status);
  const hasSelectors = config.selectorMap.container !== "";
  const menuCount = config.menuSnapshot?.length ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden hover:border-[#cec6b4] transition-colors"
    >
      {/* Top bar */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-[#2d2010] truncate">{config.storeName}</h3>
            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex items-center gap-1 shrink-0", sm.color)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", sm.dot)} />
              {sm.label}
            </span>
          </div>
          <p className="text-[10px] font-mono text-[#9a8a72]">{config.locationId}</p>
        </div>
        <button
          onClick={() => onEdit(config)}
          className="ml-3 p-1.5 rounded-lg text-[#9a8a72] hover:text-[#2d2010] hover:bg-[#ece6d6] cursor-pointer transition-all"
        >
          <Edit2 size={13} />
        </button>
      </div>

      {/* Details grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-y-2 gap-x-4 text-[10px]">
        {config.contactName && (
          <div className="flex items-center gap-1.5 text-[#6b5c42]">
            <User size={10} className="text-[#9a8a72] shrink-0" />
            <span className="truncate">{config.contactName}</span>
          </div>
        )}
        {config.contactEmail && (
          <div className="flex items-center gap-1.5 text-[#6b5c42]">
            <Mail size={10} className="text-[#9a8a72] shrink-0" />
            <span className="truncate">{config.contactEmail}</span>
          </div>
        )}
        {config.contactPhone && (
          <div className="flex items-center gap-1.5 text-[#6b5c42] font-mono">
            <Phone size={10} className="text-[#9a8a72] shrink-0" />
            <span>{config.contactPhone}</span>
          </div>
        )}
        {config.twilioNumber && (
          <div className="flex items-center gap-1.5 text-[#6b5c42] font-mono">
            <Zap size={10} className="text-[#9a8a72] shrink-0" />
            <span className="truncate">{config.twilioNumber}</span>
          </div>
        )}
        {config.posUrl && (
          <div className="col-span-2 flex items-center gap-1.5 text-[#6b5c42]">
            <Globe size={10} className="text-[#9a8a72] shrink-0" />
            <span className="truncate font-mono text-[9px]">{config.posUrl}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {config.notes && (
        <div className="mx-4 mb-3 px-2.5 py-2 bg-[#f0ead8]/60 rounded-lg border border-[#d8d0c0]">
          <p className="text-[10px] text-[#9a8a72] line-clamp-2">{config.notes}</p>
        </div>
      )}

      {/* Footer: badges + actions */}
      <div className="border-t border-[#d8d0c0] px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[9px] px-1.5 py-0.5 rounded border",
            hasSelectors
              ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/20"
              : "text-[#b8a890] border-[#d8d0c0]"
          )}>
            {hasSelectors ? "Selectors ✓" : "No selectors"}
          </span>
          {menuCount > 0 && (
            <span className="text-[9px] text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 px-1.5 py-0.5 rounded">
              {menuCount} items
            </span>
          )}
          <span className="text-[9px] text-[#b8a890] border border-[#d8d0c0] px-1.5 py-0.5 rounded font-mono">
            v{config.configVersion}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {config.posUrl && (
            <a
              href={config.posUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[9px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded px-2 py-1 cursor-pointer transition-colors"
            >
              <Globe size={9} /> POS
            </a>
          )}
          <Link
            to={`/bridge/${config.locationId}`}
            className="flex items-center gap-1 text-[9px] text-emerald-400 border border-emerald-500/25 rounded px-2 py-1 cursor-pointer hover:bg-emerald-500/10 transition-colors"
          >
            <ExternalLink size={9} /> Bridge
          </Link>
          <Link
            to={`/onboarding?locationId=${config.locationId}`}
            className="flex items-center gap-1 text-[9px] text-emerald-400 border border-emerald-500/25 rounded px-2 py-1 cursor-pointer hover:bg-emerald-500/10 transition-colors"
          >
            <Map size={9} /> Setup
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ configs }: { configs: Config[] }) {
  const counts = {
    total: configs.length,
    active: configs.filter(c => c.status === "active").length,
    trial: configs.filter(c => c.status === "trial").length,
    pending: configs.filter(c => c.status === "pending").length,
    withSelectors: configs.filter(c => c.selectorMap.container !== "").length,
  };

  return (
    <div className="grid grid-cols-5 gap-3">
      {[
        { label: "Total", value: counts.total, color: "text-[#2d2010]" },
        { label: "Active", value: counts.active, color: "text-emerald-400" },
        { label: "Trial", value: counts.trial, color: "text-emerald-400" },
        { label: "Pending", value: counts.pending, color: "text-yellow-400" },
        { label: "POS configured", value: counts.withSelectors, color: "text-emerald-400" },
      ].map(s => (
        <div key={s.label} className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl px-3 py-3 text-center">
          <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
          <p className="text-[9px] text-[#9a8a72] mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === "1");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [drawer, setDrawer] = useState<{ mode: "add" | "edit"; config?: Config } | null>(null);
  const [refresh, setRefresh] = useState(0);

  const configs = useQuery(api.restaurantConfigs.listAll, {});

  const filtered = (configs ?? []).filter(c => {
    const matchSearch =
      !search ||
      c.storeName.toLowerCase().includes(search.toLowerCase()) ||
      c.locationId.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (c.contactEmail ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleSaved = useCallback(() => setRefresh(r => r + 1), []);

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">

      {/* Top bar */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-5 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <Building2 size={13} className="text-emerald-400" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#2d2010]">Restaurant Admin</span>
            <span className="ml-2 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 font-semibold">PRIVATE</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pipeline"
            className="flex items-center gap-1 text-[10px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
          >
            <Activity size={10} /> Pipeline
          </Link>
          <Link
            to="/hub"
            className="flex items-center gap-1 text-[10px] text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer"
          >
            <Activity size={10} /> Hub
          </Link>
          <button
            onClick={() => { sessionStorage.removeItem(SESSION_KEY); setUnlocked(false); }}
            className="flex items-center gap-1 text-[10px] text-[#9a8a72] hover:text-[#6b5c42] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
          >
            <Lock size={10} /> Lock
          </button>
          <button
            onClick={() => setDrawer({ mode: "add" })}
            className="flex items-center gap-1.5 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer font-semibold"
          >
            <Plus size={12} /> Add Restaurant
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Stats */}
        {configs && configs.length > 0 && <StatsBar configs={configs} />}

        {/* Search + filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8a72]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, location ID, or contact…"
              className="w-full bg-[#faf6ed] border border-[#d8d0c0] rounded-xl pl-9 pr-4 py-2.5 text-[12px] text-[#2d2010] placeholder-[#9a8a72] focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5">
            {(["all", "active", "trial", "pending", "churned"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "text-[10px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all",
                  filterStatus === s
                    ? s === "all"
                      ? "text-[#2d2010] bg-[#ece6d6] border-[#cec6b4]"
                      : statusMeta(s).color
                    : "text-[#9a8a72] border-[#d8d0c0] hover:border-[#cec6b4] hover:text-[#2d2010]"
                )}
              >
                {s === "all" ? "All" : statusMeta(s).label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {configs === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#faf6ed] border border-[#d8d0c0] flex items-center justify-center mb-4">
              <Building2 size={22} className="text-[#b8a890]" />
            </div>
            <p className="text-[#2d2010] font-semibold mb-1">
              {search || filterStatus !== "all" ? "No restaurants match" : "No restaurants yet"}
            </p>
            <p className="text-[#9a8a72] text-sm mb-5">
              {search || filterStatus !== "all"
                ? "Try a different search or filter"
                : "Add your first restaurant to get started"}
            </p>
            {!search && filterStatus === "all" && (
              <button
                onClick={() => setDrawer({ mode: "add" })}
                className="flex items-center gap-1.5 text-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-xl px-4 py-2 cursor-pointer transition-all"
              >
                <Plus size={13} /> Add first restaurant
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => (
              <RestaurantCard
                key={c._id}
                config={c}
                onEdit={(cfg) => setDrawer({ mode: "edit", config: cfg })}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-[10px] text-[#b8a890] text-center">
            {filtered.length} of {configs?.length ?? 0} restaurants
            {filterStatus !== "all" && ` · filtered by ${filterStatus}`}
          </p>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {drawer && (
          <RestaurantDrawer
            mode={drawer.mode}
            initial={drawer.config}
            onClose={() => setDrawer(null)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
