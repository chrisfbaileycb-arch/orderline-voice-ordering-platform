import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserSearch, Phone, Star, ShoppingBag, Clock, ArrowLeft,
  ChevronRight, Copy, Trash2, Plus, X, Save, Edit3,
  Award, PhoneCall, CheckCircle, MessageSquare, AlertCircle,
  PhoneForwarded, PhoneMissed,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Link } from "react-router-dom";

// ── Helpers ────────────────────────────────────────────────────────────────────

function normalizePhone(raw: string) { return raw.replace(/\D/g, ""); }

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `+1 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7)}`;
  return raw;
}

function elapsed(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

type Tier = "bronze" | "silver" | "gold" | "platinum";

function loyaltyTier(points: number): Tier {
  if (points >= 400) return "platinum";
  if (points >= 150) return "gold";
  if (points >= 50) return "silver";
  return "bronze";
}

const TIER_CONFIG: Record<Tier, { label: string; color: string; bg: string; border: string; next: number | null }> = {
  bronze:   { label: "Bronze",   color: "text-amber-600",  bg: "bg-amber-600/10",  border: "border-amber-600/25",  next: 50 },
  silver:   { label: "Silver",   color: "text-slate-300",  bg: "bg-slate-300/10",  border: "border-slate-300/25",  next: 150 },
  gold:     { label: "Gold",     color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/25", next: 400 },
  platinum: { label: "Platinum", color: "text-cyan-300",   bg: "bg-cyan-300/10",   border: "border-cyan-300/25",   next: null },
};

const OUTCOME_ICON: Record<string, React.ReactNode> = {
  order_placed:        <CheckCircle size={11} className="text-emerald-400" />,
  sms_sent:            <MessageSquare size={11} className="text-blue-400" />,
  forwarded_to_staff:  <PhoneForwarded size={11} className="text-yellow-400" />,
  dropped:             <PhoneMissed size={11} className="text-red-400" />,
  voicemail:           <AlertCircle size={11} className="text-[#9a8a72]" />,
};

// ── Profile drawer ────────────────────────────────────────────────────────────

type Customer = Doc<"customers">;
type CallLog = Doc<"callLogs">;

function ProfileDrawer({
  customer,
  onClose,
  onDelete,
}: {
  customer: Customer;
  onClose: () => void;
  onDelete: (phone: string) => void;
}) {
  const upsert = useMutation(api.customers.upsert);
  const callHistory = useQuery(api.customers.getCallHistory, { phone: customer.phone });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: customer.name ?? "",
    email: customer.email ?? "",
    paymentTokenHint: customer.paymentTokenHint ?? "",
    notes: customer.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const tier = loyaltyTier(customer.loyaltyPoints);
  const tierConf = TIER_CONFIG[tier];
  const progressPct = tierConf.next
    ? Math.min(100, Math.round((customer.loyaltyPoints / tierConf.next) * 100))
    : 100;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await upsert({
        phone: customer.phone,
        name: form.name || undefined,
        email: form.email || undefined,
        paymentTokenHint: form.paymentTokenHint || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Profile updated");
      setEditing(false);
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }, [upsert, customer.phone, form]);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="w-full md:w-[420px] shrink-0 bg-[#f0ead8] border-l border-[#d8d0c0] flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#d8d0c0] shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer">
            <ArrowLeft size={16} />
          </button>
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border font-bold text-sm", tierConf.bg, tierConf.border, tierConf.color)}>
            {(customer.name ?? customer.phone)[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-[#2d2010]">{customer.name ?? "—"}</p>
            <p className="text-[11px] font-mono text-[#9a8a72]">{formatPhone(customer.phone)}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setEditing(!editing)}
            className={cn("p-1.5 rounded-lg border transition-all cursor-pointer", editing ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "border-[#d8d0c0] text-[#9a8a72] hover:text-[#2d2010]")}
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => { navigator.clipboard.writeText(JSON.stringify(customer, null, 2)); toast.success("Copied JSON"); }}
            className="p-1.5 rounded-lg border border-[#d8d0c0] text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-all"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => onDelete(customer.phone)}
            className="p-1.5 rounded-lg border border-[#d8d0c0] text-[#9a8a72] hover:text-red-400 cursor-pointer transition-all"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Loyalty tier */}
        <div className={cn("rounded-xl border p-4", tierConf.bg, tierConf.border)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={14} className={tierConf.color} />
              <span className={cn("text-xs font-bold", tierConf.color)}>{tierConf.label} Member</span>
            </div>
            <span className={cn("text-lg font-bold", tierConf.color)}>{customer.loyaltyPoints} pts</span>
          </div>
          <div className="w-full h-1.5 bg-[#ece6d6]/60 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", tierConf.color.replace("text-", "bg-"))} style={{ width: `${progressPct}%` }} />
          </div>
          {tierConf.next && (
            <p className="text-[10px] text-[#6b5c42] mt-1.5">
              {tierConf.next - customer.loyaltyPoints} pts to {
                tier === "bronze" ? "Silver" : tier === "silver" ? "Gold" : "Platinum"
              }
            </p>
          )}
          {!tierConf.next && <p className="text-[10px] text-[#6b5c42] mt-1.5">Highest tier — 10 pts per order</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: ShoppingBag, label: "Orders", value: customer.orderCount },
            { icon: Star, label: "Points", value: customer.loyaltyPoints },
            { icon: Clock, label: "Last order", value: customer.lastOrderAt ? elapsed(customer.lastOrderAt) : "Never" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-3 text-center">
              <Icon size={13} className="text-[#9a8a72] mx-auto mb-1.5" />
              <p className="text-sm font-bold text-[#2d2010]">{value}</p>
              <p className="text-[10px] text-[#9a8a72]">{label}</p>
            </div>
          ))}
        </div>

        {/* Edit form */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#faf6ed] border border-emerald-500/20 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase leading-none">Edit Profile</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "name" as const, label: "Name", placeholder: "Sarah Chen" },
                    { key: "email" as const, label: "Email", placeholder: "sarah@example.com" },
                    { key: "paymentTokenHint" as const, label: "Card hint", placeholder: "•••• 4242" },
                  ]).map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="block text-[10px] text-[#9a8a72] mb-1">{label}</label>
                      <input
                        type="text"
                        value={form[key]}
                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-[10px] text-[#9a8a72] mb-1">Notes</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Allergies, preferences..."
                    className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditing(false)} className="text-xs text-[#9a8a72] hover:text-[#2d2010] px-3 py-1.5 cursor-pointer">Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save size={11} /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info fields */}
        {!editing && (
          <div className="space-y-2">
            {customer.email && (
              <div className="flex items-center justify-between bg-[#faf6ed] border border-[#d8d0c0] rounded-lg px-3 py-2">
                <span className="text-[11px] text-[#9a8a72]">Email</span>
                <span className="text-[11px] text-[#2d2010] font-mono">{customer.email}</span>
              </div>
            )}
            {customer.paymentTokenHint && (
              <div className="flex items-center justify-between bg-[#faf6ed] border border-[#d8d0c0] rounded-lg px-3 py-2">
                <span className="text-[11px] text-[#9a8a72]">Card on file</span>
                <span className="text-[11px] text-emerald-400 font-mono">{customer.paymentTokenHint}</span>
              </div>
            )}
            {customer.locationId && (
              <div className="flex items-center justify-between bg-[#faf6ed] border border-[#d8d0c0] rounded-lg px-3 py-2">
                <span className="text-[11px] text-[#9a8a72]">Home location</span>
                <span className="text-[11px] text-[#2d2010] font-mono">{customer.locationId}</span>
              </div>
            )}
            {customer.notes && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                <p className="text-[10px] text-yellow-400/70 italic">{customer.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Call history */}
        <div>
          <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2 leading-none">
            Call History ({callHistory?.length ?? "…"})
          </p>
          <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
            {callHistory === undefined ? (
              <div className="px-4 py-4 space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-10 bg-[#ece6d6] rounded animate-pulse" />
                ))}
              </div>
            ) : callHistory.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <PhoneCall size={18} className="text-[#b8a890] mx-auto mb-2" />
                <p className="text-[11px] text-[#9a8a72]">No calls recorded yet</p>
                <p className="text-[10px] text-[#b8a890]">Calls auto-link when this number dials in</p>
              </div>
            ) : (
              callHistory.map((log: CallLog, i: number) => (
                <div key={log._id} className={cn("flex items-center gap-3 px-3 py-2.5 border-b border-[#e0d8c8] last:border-0", i % 2 === 1 && "bg-[#ece6d6]/60")}>
                  <div className="shrink-0">{OUTCOME_ICON[log.outcome] ?? <PhoneCall size={11} className="text-[#9a8a72]" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#2d2010] capitalize">{log.outcome.replace(/_/g, " ")}</span>
                      {log.orderType && (
                        <span className="text-[9px] font-mono text-[#9a8a72] bg-[#faf6ed] border border-[#d8d0c0] rounded px-1">{log.orderType}</span>
                      )}
                    </div>
                    {log.orderCaptured && (
                      <p className="text-[9px] text-[#9a8a72] truncate mt-0.5">{log.orderCaptured}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-[#9a8a72]">{elapsed(log.startedAt)}</p>
                    {log.durationSeconds && <p className="text-[9px] text-[#b8a890]">{log.durationSeconds}s</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ── Add customer form ─────────────────────────────────────────────────────────

function AddForm({ onClose }: { onClose: () => void }) {
  const upsert = useMutation(api.customers.upsert);
  const [form, setForm] = useState({ phone: "", name: "", email: "", paymentTokenHint: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!form.phone.trim()) { toast.error("Phone is required"); return; }
    setSaving(true);
    try {
      await upsert({
        phone: form.phone,
        name: form.name || undefined,
        email: form.email || undefined,
        paymentTokenHint: form.paymentTokenHint || undefined,
        notes: form.notes || undefined,
      });
      toast.success(`Customer saved: ${formatPhone(form.phone)}`);
      onClose();
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }, [form, upsert, onClose]);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="bg-[#faf6ed] border border-emerald-500/20 rounded-xl p-4 space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-[#2d2010]">New Customer</p>
          <button onClick={onClose} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer"><X size={13} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: "phone" as const, label: "Phone *", placeholder: "5550101" },
            { key: "name" as const, label: "Name", placeholder: "Sarah Chen" },
            { key: "email" as const, label: "Email", placeholder: "sarah@example.com" },
            { key: "paymentTokenHint" as const, label: "Card hint", placeholder: "•••• 4242" },
          ]).map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] text-[#9a8a72] mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="block text-[10px] text-[#9a8a72] mb-1">Notes</label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Allergies, preferences..."
            className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/40"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs text-[#9a8a72] hover:text-[#2d2010] px-3 py-1.5 cursor-pointer">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Save size={11} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const allCustomers = useQuery(api.customers.listAll, {});
  const deleteCustomer = useMutation(api.customers.deleteCustomer);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = allCustomers?.filter((c) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.phone.includes(s) ||
      (c.name?.toLowerCase().includes(s) ?? false) ||
      (c.email?.toLowerCase().includes(s) ?? false)
    );
  }) ?? [];

  const handleDelete = useCallback(async (phone: string) => {
    try {
      await deleteCustomer({ phone });
      toast.success("Customer deleted");
      if (selected?.phone === normalizePhone(phone)) setSelected(null);
    } catch { toast.error("Failed to delete"); }
  }, [deleteCustomer, selected]);

  const tierCount = (tier: Tier) =>
    allCustomers?.filter((c) => loyaltyTier(c.loyaltyPoints) === tier).length ?? 0;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010] flex flex-col">
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-colors shrink-0 p-1 -ml-1">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <UserSearch size={13} className="text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-[#2d2010] whitespace-nowrap">Customer Identity</span>
            <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded px-1.5 py-0.5 hidden sm:inline">RevenuePlus</span>
          </div>
        </div>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 rounded-lg px-3 py-2 transition-all cursor-pointer shrink-0 whitespace-nowrap"
        >
          <Plus size={12} /> Add Customer
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left: customer list */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Stats */}
          <div className="px-5 py-4 border-b border-[#d8d0c0] grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["bronze", "silver", "gold", "platinum"] as Tier[]).map((tier) => {
              const conf = TIER_CONFIG[tier];
              const count = tierCount(tier);
              return (
                <div key={tier} className="rounded-xl border p-3 text-center bg-[#faf6ed] border-[#d8d0c0]">
                  <Award size={14} className={cn("mx-auto mb-1", conf.color)} />
                  <p className={cn("text-lg font-bold", conf.color)}>{count}</p>
                  <p className="text-[10px] text-[#6b5c42]">{conf.label}</p>
                </div>
              );
            })}
          </div>

          {/* Search + add */}
          <div className="px-5 py-3 border-b border-[#d8d0c0]">
            <AnimatePresence>{addOpen && <AddForm onClose={() => setAddOpen(false)} />}</AnimatePresence>
            <div className="relative">
              <UserSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9a8a72]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or email…"
                className="w-full bg-[#faf6ed] border border-[#cec6b4] rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#2d2010] placeholder:text-[#9a8a72] focus:outline-none focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            {allCustomers === undefined ? (
              <div className="p-5 space-y-2">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="h-16 bg-[#faf6ed] border border-[#d8d0c0] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <UserSearch size={32} className="text-[#d8d0c0]" />
                <p className="text-[#9a8a72] text-sm">{search ? "No customers match your search" : "No customers yet"}</p>
                {!search && (
                  <button onClick={() => setAddOpen(true)} className="text-xs text-emerald-400 border border-emerald-500/25 rounded-lg px-3 py-1.5 hover:bg-emerald-500/10 cursor-pointer mt-1">
                    Add first customer
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#d8d0c0]">
                {filtered.map((customer) => {
                  const tier = loyaltyTier(customer.loyaltyPoints);
                  const conf = TIER_CONFIG[tier];
                  const isSelected = selected?._id === customer._id;
                  return (
                    <motion.button
                      key={customer._id}
                      whileHover={{ backgroundColor: "rgba(88,166,255,0.03)" }}
                      onClick={() => setSelected(isSelected ? null : customer)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors cursor-pointer",
                        isSelected && "bg-emerald-500/5 border-r-2 border-r-emerald-500"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border font-bold shrink-0", conf.bg, conf.border, conf.color)}>
                        {(customer.name ?? customer.phone)[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#2d2010]">{customer.name ?? "—"}</span>
                          <span className={cn("text-[9px] font-bold border rounded-full px-1.5 py-0.5", conf.color, conf.bg, conf.border)}>{conf.label}</span>
                          {customer.paymentTokenHint && (
                            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1">TOKEN</span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-[#9a8a72]">{formatPhone(customer.phone)}</p>
                        {customer.notes && <p className="text-[10px] text-yellow-400/60 italic truncate">{customer.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#2d2010]">{customer.loyaltyPoints}</p>
                        <p className="text-[10px] text-[#9a8a72]">{customer.orderCount} orders</p>
                        {customer.lastOrderAt && <p className="text-[9px] text-[#b8a890]">{elapsed(customer.lastOrderAt)}</p>}
                      </div>
                      <ChevronRight size={14} className={cn("shrink-0 transition-colors", isSelected ? "text-emerald-400" : "text-[#b8a890]")} />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#d8d0c0] px-5 py-2.5 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-[#9a8a72]">
              {allCustomers?.length ?? 0} customers · profiles auto-created from incoming calls · 10 pts per order
            </span>
          </div>
        </div>

        {/* Right: profile drawer */}
        <AnimatePresence>
          {selected && (
            <ProfileDrawer
              customer={selected}
              onClose={() => setSelected(null)}
              onDelete={(phone) => handleDelete(phone)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
