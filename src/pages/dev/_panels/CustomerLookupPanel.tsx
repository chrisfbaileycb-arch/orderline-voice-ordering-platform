import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UserSearch, Phone, CheckCircle2, XCircle, Plus, Trash2,
  Star, ShoppingBag, Clock, Copy, Edit3, Save, X,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

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

const DEMO_PHONES = [
  { phone: "5550101", label: "Sarah Chen — VIP customer" },
  { phone: "5550202", label: "Mike Torres — Regular" },
  { phone: "5550303", label: "James Liu — New customer" },
  { phone: "9999999", label: "Unknown caller" },
];

export default function CustomerLookupPanel() {
  const allCustomers = useQuery(api.customers.listAll, {});
  const upsertCustomer = useMutation(api.customers.upsert);
  const deleteCustomer = useMutation(api.customers.deleteCustomer);

  const [searchPhone, setSearchPhone] = useState("");
  const [lookupPhone, setLookupPhone] = useState<string | null>(null);
  const lookedUp = useQuery(
    api.customers.lookupByPhone,
    lookupPhone !== null ? { phone: lookupPhone } : "skip"
  );

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ phone: "", name: "", email: "", paymentTokenHint: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleLookup = useCallback((phone: string) => {
    const n = normalizePhone(phone);
    if (!n) return;
    setLookupPhone(n);
    setSearchPhone(phone);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!addForm.phone.trim()) { toast.error("Phone is required"); return; }
    setSaving(true);
    try {
      await upsertCustomer({
        phone: addForm.phone,
        name: addForm.name || undefined,
        email: addForm.email || undefined,
        paymentTokenHint: addForm.paymentTokenHint || undefined,
        notes: addForm.notes || undefined,
      });
      toast.success(`Customer saved: ${addForm.phone}`);
      setAddForm({ phone: "", name: "", email: "", paymentTokenHint: "", notes: "" });
      setAddOpen(false);
    } catch {
      toast.error("Failed to save customer");
    } finally {
      setSaving(false);
    }
  }, [addForm, upsertCustomer]);

  const handleDelete = useCallback(async (phone: string) => {
    try {
      await deleteCustomer({ phone });
      toast.success("Customer deleted");
      if (lookupPhone === normalizePhone(phone)) setLookupPhone(null);
    } catch {
      toast.error("Failed to delete");
    }
  }, [deleteCustomer, lookupPhone]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#2d2010] flex items-center gap-2">
            <UserSearch size={14} className="text-violet-400" /> Customer Identity Lookup
          </h2>
          <p className="text-[11px] text-[#9a8a72] mt-0.5">Phone → profile resolution · live Convex queries</p>
        </div>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 text-[11px] bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-500/20 rounded-lg px-3 py-1.5 transition-all cursor-pointer"
        >
          <Plus size={11} /> Add Customer
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#faf6ed] border border-violet-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-[#2d2010]">New Customer</p>
                <button onClick={() => setAddOpen(false)} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer"><X size={13} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "phone", label: "Phone *", placeholder: "5550101" },
                  { key: "name", label: "Name", placeholder: "Sarah Chen" },
                  { key: "email", label: "Email", placeholder: "sarah@example.com" },
                  { key: "paymentTokenHint", label: "Card hint", placeholder: "•••• 4242" },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[10px] text-[#9a8a72] mb-1">{label}</label>
                    <input
                      type="text"
                      value={addForm[key]}
                      onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-violet-500/40"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] text-[#9a8a72] mb-1">Notes</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Allergies, preferences..."
                  className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg px-2.5 py-1.5 text-xs text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddOpen(false)} className="text-xs text-[#9a8a72] hover:text-[#2d2010] px-3 py-1.5 cursor-pointer">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs bg-violet-500/15 border border-violet-500/30 text-violet-400 hover:bg-violet-500/25 rounded-lg px-3 py-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save size={11} /> {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lookup search */}
      <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase">Phone Lookup</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9a8a72]" />
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup(searchPhone)}
              placeholder="Enter phone number..."
              className="w-full bg-[#ece6d6] border border-[#d8d0c0] rounded-lg pl-7 pr-3 py-2 text-xs text-[#2d2010] font-mono placeholder:text-[#b8a890] focus:outline-none focus:border-violet-500/40"
            />
          </div>
          <button
            onClick={() => handleLookup(searchPhone)}
            className="flex items-center gap-1.5 text-xs bg-violet-500/10 border border-violet-500/25 text-violet-400 hover:bg-violet-500/20 rounded-lg px-3 py-2 transition-all cursor-pointer"
          >
            <UserSearch size={12} /> Lookup
          </button>
        </div>

        {/* Demo quick-lookup */}
        <div className="flex flex-wrap gap-1.5">
          {DEMO_PHONES.map(({ phone, label }) => (
            <button
              key={phone}
              onClick={() => handleLookup(phone)}
              className="text-[10px] font-mono bg-[#f0ead8] border border-[#cec6b4] hover:border-violet-500/30 text-[#6b5c42] hover:text-violet-300 rounded px-2 py-1 transition-all cursor-pointer"
            >
              {phone}
            </button>
          ))}
        </div>

        {/* Result */}
        {lookupPhone !== null && (
          <div className={cn(
            "rounded-xl border p-4 transition-all",
            lookedUp === undefined ? "bg-[#f0ead8] border-[#cec6b4] animate-pulse" :
            lookedUp === null ? "bg-red-500/5 border-red-500/20" :
            "bg-emerald-500/5 border-emerald-500/20"
          )}>
            {lookedUp === undefined && (
              <p className="text-xs text-[#9a8a72] text-center">Looking up {formatPhone(lookupPhone)}...</p>
            )}
            {lookedUp === null && lookedUp !== undefined && (
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-red-400 shrink-0" />
                <div>
                  <p className="text-xs text-red-300 font-medium">No profile found</p>
                  <p className="text-[10px] text-[#9a8a72]">Guest caller · {formatPhone(lookupPhone)}</p>
                </div>
                <button
                  onClick={() => { setAddForm((f) => ({ ...f, phone: lookupPhone })); setAddOpen(true); }}
                  className="ml-auto text-[10px] text-violet-400 border border-violet-500/25 rounded px-2 py-1 hover:bg-violet-500/10 cursor-pointer"
                >
                  + Add profile
                </button>
              </div>
            )}
            {lookedUp && (
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-[#2d2010]">{lookedUp.name ?? "Unknown"}</p>
                      <p className="text-[10px] text-[#6b5c42] font-mono">{formatPhone(lookedUp.phone)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(lookedUp, null, 2)); toast.success("Profile JSON copied"); }}
                    className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer"
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { icon: ShoppingBag, label: "Orders", value: lookedUp.orderCount },
                    { icon: Star, label: "Points", value: lookedUp.loyaltyPoints },
                    { icon: Clock, label: "Last order", value: lookedUp.lastOrderAt ? elapsed(lookedUp.lastOrderAt) : "Never" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="bg-[#f0ead8] border border-[#cec6b4] rounded-lg p-2 text-center">
                      <Icon size={11} className="text-[#9a8a72] mx-auto mb-1" />
                      <p className="text-xs font-bold text-[#2d2010]">{value}</p>
                      <p className="text-[9px] text-[#9a8a72]">{label}</p>
                    </div>
                  ))}
                </div>
                {lookedUp.email && <p className="text-[10px] text-[#6b5c42]">{lookedUp.email}</p>}
                {lookedUp.paymentTokenHint && (
                  <p className="text-[10px] font-mono text-[#9a8a72]">Card: {lookedUp.paymentTokenHint}</p>
                )}
                {lookedUp.notes && <p className="text-[10px] text-yellow-400/80 italic">{lookedUp.notes}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All customers table */}
      <div>
        <p className="text-[10px] font-bold tracking-widest text-[#9a8a72] uppercase mb-2">
          All Customers ({allCustomers?.length ?? "…"})
        </p>
        <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl overflow-hidden">
          {!allCustomers || allCustomers.length === 0 ? (
            <div className="px-4 py-8 text-center space-y-2">
              <UserSearch size={22} className="text-[#b8a890] mx-auto" />
              <p className="text-xs text-[#9a8a72]">No customers yet</p>
              <p className="text-[10px] text-[#b8a890]">Add one above or seed from demo profiles</p>
            </div>
          ) : (
            allCustomers.map((c, i) => (
              <div key={c._id} className={cn("flex items-center gap-3 px-4 py-2.5 border-b border-[#cec6b4] last:border-0 group", i % 2 === 1 && "bg-[#f2ecdc]")}>
                <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-400">{(c.name ?? c.phone)[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#2d2010] truncate">{c.name ?? "—"}</span>
                    {c.paymentTokenHint && (
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1">TOKEN</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-[#9a8a72]">{formatPhone(c.phone)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-[#9a8a72]">{c.orderCount} orders</p>
                  <p className="text-[10px] text-[#b8a890]">{c.loyaltyPoints} pts</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleLookup(c.phone)} className="p-1 text-[#9a8a72] hover:text-violet-400 cursor-pointer">
                    <UserSearch size={12} />
                  </button>
                  <button onClick={() => handleDelete(c.phone)} className="p-1 text-[#9a8a72] hover:text-red-400 cursor-pointer">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
