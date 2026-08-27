import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Link } from "react-router-dom";
import {
  Phone, Save, ChevronLeft, Settings, Store,
  Globe, Settings2, User, Mail, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SignInButton } from "@/components/ui/signin.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b border-[#e8e0d0] last:border-0">
      <div className="sm:w-44 shrink-0">
        <p className="text-sm font-medium text-[#2d2010]">{label}</p>
        {hint && <p className="text-xs text-[#9a8a72] mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const configs = useQuery(api.restaurantConfigs.listAll);
  const updateDetails = useMutation(api.restaurantConfigs.updateDetails);

  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [storeName, setStoreName] = useState("");
  const [posUrl, setPosUrl] = useState("");
  const [twilioNumber, setTwilioNumber] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const selectedConfig = configs?.find((c) => c.locationId === selectedLocationId) ?? null;

  function loadConfig(locationId: string) {
    const cfg = configs?.find((c) => c.locationId === locationId);
    if (!cfg) return;
    setSelectedLocationId(locationId);
    setStoreName(cfg.storeName ?? "");
    setPosUrl(cfg.posUrl ?? "");
    setTwilioNumber(cfg.twilioNumber ?? "");
    setContactName(cfg.contactName ?? "");
    setContactEmail(cfg.contactEmail ?? "");
    setContactPhone(cfg.contactPhone ?? "");
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedLocationId) return;
    setIsSaving(true);
    try {
      await updateDetails({
        locationId: selectedLocationId,
        storeName: storeName || undefined,
        posUrl: posUrl || undefined,
        twilioNumber: twilioNumber || undefined,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
      });
      setSaved(true);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save — please try again");
    } finally {
      setIsSaving(false);
    }
  }

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    trial: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    pending: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
    churned: "bg-red-500/15 text-red-500 border-red-500/30",
  };

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">
      {/* Header */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Settings size={15} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#2d2010]">Settings</h1>
            <p className="text-[10px] text-[#6b5c42]">Manage your restaurant configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-[#6b5c42] hover:text-[#2d2010] transition-colors text-xs border border-[#cec6b4] rounded-lg px-3 py-1.5 flex items-center gap-1.5"
          >
            <ChevronLeft size={12} /> Dashboard
          </Link>
          <SignInButton signOutText="Sign out" size="sm" className="text-xs bg-[#ece6d6] hover:bg-[#d8d0c0] text-[#2d2010] border border-[#cec6b4]" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-6">
        {/* Location picker sidebar */}
        <div className="md:w-60 shrink-0">
          <p className="text-xs font-semibold text-[#6b5c42] uppercase tracking-wider mb-3">Your Restaurants</p>
          {!configs ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-xl p-4 text-center">
              <Store size={20} className="text-[#9a8a72] mx-auto mb-2" />
              <p className="text-xs text-[#9a8a72]">No restaurants set up yet.</p>
              <Link to="/onboarding" className="text-emerald-600 text-xs underline mt-1 block">
                Set up your first restaurant
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {configs.map((cfg) => (
                <button
                  key={cfg.locationId}
                  onClick={() => loadConfig(cfg.locationId)}
                  className={cn(
                    "w-full text-left rounded-xl border px-3 py-2.5 transition-all cursor-pointer",
                    selectedLocationId === cfg.locationId
                      ? "bg-emerald-500/10 border-emerald-500/40"
                      : "bg-[#faf6ed] border-[#d8d0c0] hover:border-[#b8a890]"
                  )}
                >
                  <p className="text-sm font-medium text-[#2d2010] truncate">{cfg.storeName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-[#9a8a72] truncate">{cfg.locationId}</span>
                    {cfg.status && (
                      <Badge className={cn("text-[9px] px-1.5 py-0 border shrink-0", statusColors[cfg.status] ?? "")}>
                        {cfg.status}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          <Link
            to="/onboarding"
            className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            + Add a new restaurant
          </Link>
        </div>

        {/* Settings form */}
        <div className="flex-1">
          {!selectedConfig ? (
            <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-2xl p-10 text-center">
              <Settings size={28} className="text-[#c8b89a] mx-auto mb-3" />
              <p className="text-sm text-[#9a8a72]">Select a restaurant on the left to edit its settings.</p>
            </div>
          ) : (
            <div className="bg-[#faf6ed] border border-[#d8d0c0] rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#e8e0d0] flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-[#2d2010]">{selectedConfig.storeName}</h2>
                  <p className="text-xs text-[#9a8a72] font-mono">{selectedConfig.locationId}</p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  size="sm"
                  className={cn(
                    "gap-1.5 text-xs",
                    saved
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                  )}
                >
                  {saved ? (
                    <><CheckCircle2 size={13} /> Saved</>
                  ) : isSaving ? (
                    "Saving..."
                  ) : (
                    <><Save size={13} /> Save changes</>
                  )}
                </Button>
              </div>

              <div className="px-6">
                {/* Restaurant Info */}
                <p className="text-[10px] font-semibold text-[#9a8a72] uppercase tracking-wider pt-5 pb-1">
                  Restaurant Info
                </p>

                <FieldRow label="Store name" hint="Displayed to customers and in reports">
                  <Input
                    value={storeName}
                    onChange={(e) => { setStoreName(e.target.value); setSaved(false); }}
                    placeholder="Mario's Pizza"
                    className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890]"
                  />
                </FieldRow>

                <FieldRow label="POS order URL" hint="The URL the bridge opens in the right pane for order entry">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-[#9a8a72] shrink-0" />
                    <Input
                      value={posUrl}
                      onChange={(e) => { setPosUrl(e.target.value); setSaved(false); }}
                      placeholder="https://your-pos.com/order"
                      className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890]"
                    />
                  </div>
                </FieldRow>

                <FieldRow label="Twilio number" hint="The phone number OrderLine uses to answer calls for this location">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#9a8a72] shrink-0" />
                    <Input
                      value={twilioNumber}
                      onChange={(e) => { setTwilioNumber(e.target.value); setSaved(false); }}
                      placeholder="+13125550100"
                      className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890] font-mono"
                    />
                  </div>
                </FieldRow>

                {/* Contact Info */}
                <p className="text-[10px] font-semibold text-[#9a8a72] uppercase tracking-wider pt-5 pb-1">
                  Contact Info
                </p>

                <FieldRow label="Contact name" hint="Your name or your manager's name">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[#9a8a72] shrink-0" />
                    <Input
                      value={contactName}
                      onChange={(e) => { setContactName(e.target.value); setSaved(false); }}
                      placeholder="Marco Rossi"
                      className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890]"
                    />
                  </div>
                </FieldRow>

                <FieldRow label="Contact email" hint="We'll send order summaries and alerts here">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-[#9a8a72] shrink-0" />
                    <Input
                      value={contactEmail}
                      onChange={(e) => { setContactEmail(e.target.value); setSaved(false); }}
                      placeholder="marco@mariospizza.com"
                      className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890]"
                    />
                  </div>
                </FieldRow>

                <FieldRow label="Contact phone" hint="For urgent issues with your account">
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-[#9a8a72] shrink-0" />
                    <Input
                      value={contactPhone}
                      onChange={(e) => { setContactPhone(e.target.value); setSaved(false); }}
                      placeholder="+13125550199"
                      className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] placeholder:text-[#b8a890] font-mono"
                    />
                  </div>
                </FieldRow>

                {/* Advanced */}
                <p className="text-[10px] font-semibold text-[#9a8a72] uppercase tracking-wider pt-5 pb-1">
                  Advanced
                </p>
                <FieldRow label="POS selector config" hint="To update your POS selectors or menu, re-run the setup wizard">
                  <Link
                    to="/onboarding"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 underline transition-colors"
                  >
                    <Settings2 size={12} /> Re-run POS setup wizard
                  </Link>
                </FieldRow>

                <div className="pb-6" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
