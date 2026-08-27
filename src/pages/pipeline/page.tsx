import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import {
  Phone, Mail, User, Building2, Mic2, Globe, Check,
  ChevronRight, X, Edit3, Calendar, MessageSquare,
  ArrowRight, Link2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  Zap, Loader2, AlertCircle, CheckCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { format } from "date-fns";

type Signup = Doc<"signups">;

// ─── Pipeline stage config ────────────────────────────────────────────────────

const STAGES: {
  id: Signup["pipelineStage"];
  label: string;
  shortLabel: string;
  color: string;
  dot: string;
  desc: string;
}[] = [
  {
    id: "signed_up",
    label: "Signed Up",
    shortLabel: "Signed Up",
    color: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    dot: "bg-sky-500",
    desc: "New signup, not yet contacted",
  },
  {
    id: "zoom_scheduled",
    label: "Zoom Scheduled",
    shortLabel: "Zoom",
    color: "bg-violet-500/15 text-violet-600 border-violet-500/30",
    dot: "bg-violet-500",
    desc: "Intro call booked",
  },
  {
    id: "pos_mapped",
    label: "POS Mapped",
    shortLabel: "POS Mapped",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    dot: "bg-amber-500",
    desc: "POS selectors configured by onboarder",
  },
  {
    id: "twilio_live",
    label: "Twilio Live",
    shortLabel: "Twilio",
    color: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    dot: "bg-orange-500",
    desc: "Phone number provisioned and routed",
  },
  {
    id: "test_run",
    label: "Test Run",
    shortLabel: "Testing",
    color: "bg-teal-500/15 text-teal-600 border-teal-500/30",
    dot: "bg-teal-500",
    desc: "Live test orders verified on Zoom",
  },
  {
    id: "live",
    label: "Live",
    shortLabel: "Live",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    dot: "bg-emerald-500",
    desc: "Restaurant is fully live",
  },
  {
    id: "churned",
    label: "Churned",
    shortLabel: "Churned",
    color: "bg-red-500/10 text-red-500 border-red-500/25",
    dot: "bg-red-400",
    desc: "No longer a customer",
  },
];

function stageConfig(id: string) {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

const VOICE_LABELS: Record<string, string> = {
  female: "Female voice",
  male: "Male voice",
  neutral: "Neutral voice",
  calm_professional: "Calm & professional",
};

const POS_SYSTEMS = [
  "Toast", "Square", "Clover", "Lightspeed", "Revel Systems",
  "Aloha NCR", "Heartland", "PAX", "Brink POS", "Micros Oracle",
  "Lavu", "TouchBistro", "Upserve", "SpotOn", "Other",
];

// ─── Onboarding checklist definition ────────────────────────────────────────

type ChecklistStep = {
  id: string;
  label: string;
  description: string;
  advanceToStage?: Signup["pipelineStage"];
  actionLabel?: string;
};

const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    id: "welcome_email",
    label: "Send welcome email",
    description:
      "Email the contact to confirm we received their signup. Set expectations: expect a call within 1 business day.",
    actionLabel: "Compose email",
  },
  {
    id: "zoom_scheduled",
    label: "Schedule Zoom call",
    description:
      "Book the intro + POS screen-share call with the restaurant. Set the Zoom date field below then mark done.",
    advanceToStage: "zoom_scheduled",
    actionLabel: "Open calendar",
  },
  {
    id: "pos_mapped",
    label: "Map POS selectors",
    description:
      "During or after the Zoom, open the bridge for this location and configure the CSS selector map for their POS system.",
    advanceToStage: "pos_mapped",
    actionLabel: "Open bridge",
  },
  {
    id: "twilio_provisioned",
    label: "Provision Twilio number",
    description:
      "Buy a phone number in the restaurant's area code via Twilio. Configure the webhook to point at this location's bridge endpoint.",
    advanceToStage: "twilio_live",
    actionLabel: "Open Twilio",
  },
  {
    id: "test_call",
    label: "Run test call",
    description:
      "Call the new Twilio number and verify the AI agent answers, captures an order correctly, and forwards to POS.",
    advanceToStage: "test_run",
  },
  {
    id: "go_live",
    label: "Confirm go-live",
    description:
      "Restaurant call forwarding is set up to the Twilio number. Send the go-live confirmation email. Invoice sent.",
    advanceToStage: "live",
  },
];

// ─── Onboarding checklist component ─────────────────────────────────────────

function OnboardingChecklist({
  signup,
  linkedId,
}: {
  signup: Signup;
  linkedId: string;
}) {
  const markStep = useMutation(api.signups.markChecklistStep);
  const completed = new Set(signup.completedSteps ?? []);
  const doneCount = CHECKLIST_STEPS.filter((s) => completed.has(s.id)).length;
  const [expanded, setExpanded] = useState(true);

  async function toggle(step: ChecklistStep, nowDone: boolean) {
    try {
      await markStep({
        id: signup._id,
        stepId: step.id,
        done: nowDone,
        advanceToStage: nowDone ? step.advanceToStage : undefined,
      });
      if (nowDone && step.advanceToStage) {
        toast.success(`Stage advanced to "${step.advanceToStage.replace(/_/g, " ")}"`);
      }
    } catch {
      toast.error("Failed to update step");
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <p className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold">
          Onboarding Checklist
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-600">
            {doneCount}/{CHECKLIST_STEPS.length}
          </span>
          {expanded ? (
            <ChevronUp size={10} className="text-[#9a8a72]" />
          ) : (
            <ChevronDown size={10} className="text-[#9a8a72]" />
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-[#d8d0c0] overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${(doneCount / CHECKLIST_STEPS.length) * 100}%` }}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5 pt-1">
              {CHECKLIST_STEPS.map((step, i) => {
                const done = completed.has(step.id);
                const isPos = step.id === "pos_mapped";
                const actionHref =
                  step.id === "pos_mapped" && linkedId
                    ? `/bridge/${linkedId}`
                    : step.id === "zoom_scheduled"
                    ? "https://calendar.google.com"
                    : step.id === "twilio_provisioned"
                    ? "https://console.twilio.com"
                    : undefined;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      done
                        ? "bg-emerald-500/8 border-emerald-500/25"
                        : "bg-[#f0ead8] border-[#d8d0c0]"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Step number / check */}
                      <button
                        onClick={() => toggle(step, !done)}
                        className="shrink-0 mt-0.5 cursor-pointer"
                      >
                        {done ? (
                          <CheckCircle2 size={15} className="text-emerald-500" />
                        ) : (
                          <Circle size={15} className="text-[#c8b89a]" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-[#c8b89a] font-mono">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] font-bold",
                              done ? "text-emerald-600 line-through decoration-emerald-500/40" : "text-[#2d2010]"
                            )}
                          >
                            {step.label}
                          </span>
                          {step.advanceToStage && !done && (
                            <span className="text-[8px] text-violet-500 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5 shrink-0">
                              advances stage
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#9a8a72] leading-snug mt-0.5">
                          {step.description}
                        </p>
                        {!done && actionHref && step.actionLabel && (
                          <a
                            href={actionHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-violet-600 hover:text-violet-500 transition-colors"
                          >
                            <ArrowRight size={9} />
                            {isPos && !linkedId ? "Set location ID below first" : step.actionLabel}
                          </a>
                        )}
                        {done && (
                          <button
                            onClick={() => toggle(step, false)}
                            className="mt-1 text-[10px] text-[#c8b89a] hover:text-red-400 transition-colors cursor-pointer"
                          >
                            Undo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Automation panel ─────────────────────────────────────────────────────────

type AutoStep = {
  id: "schedule_zoom" | "provision_twilio" | "run_test_call";
  label: string;
  description: string;
  requiresField?: string;
  requiresLabel?: string;
};

const AUTO_STEPS: AutoStep[] = [
  {
    id: "schedule_zoom",
    label: "Schedule Zoom",
    description: "Sends a Zoom invite to the restaurant contact. Requires a Zoom date to be set.",
    requiresField: "zoomDate",
    requiresLabel: "Zoom date",
  },
  {
    id: "provision_twilio",
    label: "Provision Twilio",
    description: "Buys a local phone number and configures the webhook. Requires a location ID.",
    requiresField: "linkedLocationId",
    requiresLabel: "Location ID",
  },
  {
    id: "run_test_call",
    label: "Run test call",
    description: "Places an outbound call to the provisioned number to verify the AI agent.",
    requiresField: "linkedLocationId",
    requiresLabel: "Location ID + Twilio number on location",
  },
];

type AutoLogEntry = {
  stepId: string;
  status: "running" | "success" | "error";
  startedAt: number;
  finishedAt?: number;
  detail: string | null;
};

function AutomationPanel({ signup }: { signup: Signup }) {
  const triggerStep = useMutation(api.automation.orchestrator.triggerStep);
  const [running, setRunning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const log: AutoLogEntry[] = (signup.automationLog ?? []).slice().reverse();

  async function run(stepId: AutoStep["id"]) {
    setRunning(stepId);
    try {
      await triggerStep({ signupId: signup._id, stepId });
      toast.success("Step queued — check the log below for results.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-violet-500" />
          <p className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold">
            Automation
          </p>
          <span className="text-[8px] bg-violet-500/10 text-violet-500 border border-violet-500/20 rounded-full px-1.5 py-0.5 font-bold">
            STUB
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={10} className="text-[#9a8a72]" />
        ) : (
          <ChevronDown size={10} className="text-[#9a8a72]" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              {/* Info banner */}
              <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-3 text-[10px] text-violet-600 leading-snug">
                These buttons trigger backend actions. Steps are stubs until you wire in your Zoom/Twilio credentials — see the comments in{" "}
                <code className="font-mono text-[9px]">convex/automation/</code>.
              </div>

              {/* Step buttons */}
              {AUTO_STEPS.map((step) => {
                const isRunning = running === step.id;
                const lastRun = log.find((l) => l.stepId === step.id);
                return (
                  <div
                    key={step.id}
                    className="bg-[#f0ead8] border border-[#d8d0c0] rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-[#2d2010]">{step.label}</p>
                        <p className="text-[10px] text-[#9a8a72] leading-snug mt-0.5">{step.description}</p>
                      </div>
                      <button
                        onClick={() => run(step.id)}
                        disabled={isRunning}
                        className={cn(
                          "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                          isRunning
                            ? "bg-[#ece6d6] text-[#9a8a72] border-[#d8d0c0]"
                            : "bg-violet-500/15 text-violet-600 border-violet-500/30 hover:bg-violet-500/25"
                        )}
                      >
                        {isRunning ? (
                          <Loader2 size={10} className="animate-spin" />
                        ) : (
                          <Zap size={10} />
                        )}
                        {isRunning ? "Running…" : "Run"}
                      </button>
                    </div>
                    {lastRun && (
                      <div
                        className={cn(
                          "flex items-start gap-1.5 text-[10px] rounded-lg px-2.5 py-1.5 border",
                          lastRun.status === "success"
                            ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-600"
                            : lastRun.status === "error"
                            ? "bg-red-500/8 border-red-500/20 text-red-500"
                            : "bg-amber-500/8 border-amber-500/20 text-amber-600"
                        )}
                      >
                        {lastRun.status === "success" ? (
                          <CheckCircle size={10} className="shrink-0 mt-0.5" />
                        ) : lastRun.status === "error" ? (
                          <AlertCircle size={10} className="shrink-0 mt-0.5" />
                        ) : (
                          <Loader2 size={10} className="shrink-0 mt-0.5 animate-spin" />
                        )}
                        <span>{lastRun.detail ?? lastRun.status}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stage badge ──────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: Signup["pipelineStage"] }) {
  const cfg = stageConfig(stage);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.shortLabel}
    </span>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function SignupDrawer({ signup, onClose }: { signup: Signup; onClose: () => void }) {
  const updatePipeline = useMutation(api.signups.updatePipeline);
  const [stage, setStage] = useState(signup.pipelineStage);
  const [zoomDate, setZoomDate] = useState(signup.zoomDate ?? "");
  const [notes, setNotes] = useState(signup.onboarderNotes ?? "");
  const [linkedId, setLinkedId] = useState(signup.linkedLocationId ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePipeline({
        id: signup._id,
        pipelineStage: stage,
        zoomDate: zoomDate || undefined,
        onboarderNotes: notes || undefined,
        linkedLocationId: linkedId || undefined,
      });
      toast.success("Updated");
      onClose();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div className="flex-1 bg-black/40" />
      <motion.div
        initial={{ x: 64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 64, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-[#faf6ed] border-l border-[#d8d0c0] h-full flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#faf6ed] z-10 flex items-center justify-between px-5 py-4 border-b border-[#d8d0c0]">
          <div>
            <p className="text-sm font-bold text-[#2d2010]">{signup.restaurantName}</p>
            <p className="text-xs text-[#9a8a72]">{signup.contactName}</p>
          </div>
          <button onClick={onClose} className="text-[#9a8a72] hover:text-[#2d2010] cursor-pointer transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {/* Signup info */}
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold">Signup Info</p>
            <div className="bg-[#f0ead8] border border-[#d8d0c0] rounded-xl p-4 space-y-2.5 text-xs">
              {[
                { icon: User, label: signup.contactName },
                { icon: Building2, label: signup.restaurantName },
                { icon: Phone, label: signup.restaurantPhone },
                { icon: Mail, label: signup.email },
                { icon: Globe, label: `${signup.posSystem} · ${signup.locationCount} location${signup.locationCount === "1" ? "" : "s"}` },
                { icon: Mic2, label: VOICE_LABELS[signup.voicePreference] ?? signup.voicePreference },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 text-[#6b5c42]">
                  <Icon size={12} className="text-[#9a8a72] shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
              <div className="text-[#b8a890] text-[10px] pt-1 border-t border-[#d8d0c0]">
                Signed up {format(signup.createdAt, "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          </div>

          {/* Onboarding checklist */}
          <OnboardingChecklist signup={signup} linkedId={linkedId} />

          {/* Automation panel */}
          <AutomationPanel signup={signup} />

          {/* Pipeline stage */}
          <div className="space-y-2">
            <p className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold">Pipeline Stage</p>
            <div className="grid grid-cols-2 gap-1.5">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStage(s.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer",
                    stage === s.id
                      ? s.color
                      : "bg-[#f0ead8] border-[#d8d0c0] text-[#9a8a72] hover:border-[#b8a890]"
                  )}
                >
                  <span className="text-[10px] font-bold">{s.label}</span>
                  <span className="text-[9px] leading-snug opacity-70">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Zoom date */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold flex items-center gap-1.5">
              <Calendar size={10} /> Zoom / call date
            </label>
            <Input
              type="datetime-local"
              value={zoomDate}
              onChange={(e) => setZoomDate(e.target.value)}
              className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] text-xs"
            />
          </div>

          {/* Linked location */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold flex items-center gap-1.5">
              <Link2 size={10} /> Linked location ID
            </label>
            <Input
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              placeholder="e.g. marios-chicago-01"
              className="bg-[#ece6d6] border-[#cec6b4] text-[#2d2010] text-xs font-mono"
            />
            {linkedId && (
              <Link to={`/bridge/${linkedId}`} target="_blank" className="text-[10px] text-emerald-600 underline flex items-center gap-1">
                <ArrowRight size={9} /> Open bridge
              </Link>
            )}
          </div>

          {/* Onboarder notes */}
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase tracking-widest text-[#9a8a72] font-semibold flex items-center gap-1.5">
              <MessageSquare size={10} /> Onboarder notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="POS URL, special requirements, call notes, Twilio SID…"
              className="w-full bg-[#ece6d6] border border-[#cec6b4] rounded-lg px-3 py-2 text-xs text-[#2d2010] placeholder:text-[#b8a890] focus:outline-none focus:border-emerald-500/50 resize-none transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#faf6ed] border-t border-[#d8d0c0] px-5 py-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold gap-2"
          >
            <Check size={14} /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Signup card ──────────────────────────────────────────────────────────────

function SignupCard({ signup, onClick }: { signup: Signup; onClick: () => void }) {
  const cfg = stageConfig(signup.pipelineStage);
  const doneCount = (signup.completedSteps ?? []).length;
  const totalSteps = CHECKLIST_STEPS.length;
  const pct = Math.round((doneCount / totalSteps) * 100);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-[#faf6ed] border border-[#d8d0c0] hover:border-[#b8a890] rounded-xl p-4 cursor-pointer transition-colors group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#2d2010] truncate">{signup.restaurantName}</p>
          <p className="text-xs text-[#9a8a72] truncate">{signup.contactName}</p>
        </div>
        <StageBadge stage={signup.pipelineStage} />
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-[#9a8a72]">
          <Phone size={9} className="shrink-0" />
          <span className="font-mono truncate">{signup.restaurantPhone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#9a8a72]">
          <Globe size={9} className="shrink-0" />
          <span className="truncate">{signup.posSystem}</span>
          <span className="text-[#c8b89a]">·</span>
          <span>{signup.locationCount} loc.</span>
        </div>
        {signup.zoomDate && (
          <div className="flex items-center gap-1.5 text-[10px] text-violet-500">
            <Calendar size={9} className="shrink-0" />
            <span>{format(new Date(signup.zoomDate), "MMM d 'at' h:mm a")}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#ece6d6]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 h-1 rounded-full bg-[#d8d0c0] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] text-[#c8b89a] shrink-0">{doneCount}/{totalSteps}</span>
        </div>
        <ChevronRight size={12} className="text-[#c8b89a] group-hover:text-[#9a8a72] transition-colors ml-2" />
      </div>
    </motion.div>
  );
}

// ─── Stage column ─────────────────────────────────────────────────────────────

function StageColumn({
  stage,
  signups,
  onSelect,
}: {
  stage: (typeof STAGES)[number];
  signups: Signup[];
  onSelect: (s: Signup) => void;
}) {
  return (
    <div className="min-w-[230px] flex-1 flex flex-col gap-2">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border", stage.color)}>
        <span className={cn("w-2 h-2 rounded-full shrink-0", stage.dot)} />
        <span className="text-xs font-bold flex-1">{stage.label}</span>
        {signups.length > 0 && (
          <Badge className="bg-white/30 border-0 text-[10px] px-1.5 py-0">{signups.length}</Badge>
        )}
      </div>
      {/* Cards */}
      <div className="flex flex-col gap-2 flex-1">
        {signups.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-[#c8b89a] text-[10px] border border-dashed border-[#d8d0c0] rounded-xl">
            Empty
          </div>
        ) : (
          signups.map((s) => (
            <SignupCard key={s._id} signup={s} onClick={() => onSelect(s)} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main pipeline page ───────────────────────────────────────────────────────

export default function PipelinePage() {
  const signups = useQuery(api.signups.listAll);
  const [selected, setSelected] = useState<Signup | null>(null);
  const [filterStage, setFilterStage] = useState<Signup["pipelineStage"] | "all">("all");

  const filtered = (signups ?? []).filter(
    (s) => filterStage === "all" || s.pipelineStage === filterStage
  );

  const byStage = (stageId: Signup["pipelineStage"]) =>
    filtered.filter((s) => s.pipelineStage === stageId);

  const totalLive = (signups ?? []).filter((s) => s.pipelineStage === "live").length;
  const totalSignups = (signups ?? []).length;
  const totalPending = (signups ?? []).filter(
    (s) => !["live", "churned"].includes(s.pipelineStage)
  ).length;

  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#faf6ed]/95 backdrop-blur-md border-b border-[#d8d0c0] px-5 py-3.5">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Edit3 size={14} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#2d2010]">Onboarding Pipeline</p>
              <p className="text-[10px] text-[#9a8a72]">Every restaurant signup, start to live</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ece6d6] rounded-full border border-[#d8d0c0]">
              <span className="text-[#9a8a72]">Total signups</span>
              <span className="font-bold text-[#2d2010]">{totalSignups}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/25">
              <span className="text-amber-600">In progress</span>
              <span className="font-bold text-amber-600">{totalPending}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600">Live</span>
              <span className="font-bold text-emerald-600">{totalLive}</span>
            </div>
          </div>

          <Link
            to="/admin"
            className="text-xs text-[#9a8a72] hover:text-[#2d2010] border border-[#d8d0c0] rounded-lg px-3 py-1.5 transition-colors"
          >
            Restaurant Admin →
          </Link>
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="px-5 py-3 border-b border-[#d8d0c0] overflow-x-auto">
        <div className="flex items-center gap-2 max-w-screen-2xl mx-auto">
          <button
            onClick={() => setFilterStage("all")}
            className={cn(
              "shrink-0 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer",
              filterStage === "all"
                ? "bg-[#2d2010] text-[#f0ead8] border-[#2d2010]"
                : "text-[#9a8a72] border-[#d8d0c0] hover:border-[#b8a890]"
            )}
          >
            All stages
          </button>
          {STAGES.map((s) => {
            const count = (signups ?? []).filter((sig) => sig.pipelineStage === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => setFilterStage(filterStage === s.id ? "all" : s.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border transition-all cursor-pointer",
                  filterStage === s.id
                    ? s.color
                    : "text-[#9a8a72] border-[#d8d0c0] hover:border-[#b8a890]"
                )}
              >
                {s.shortLabel}
                {count > 0 && (
                  <span className="bg-current/20 rounded-full w-4 h-4 flex items-center justify-center text-[9px]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto px-5 py-6">
        <div className="flex gap-4 min-w-max max-w-screen-2xl mx-auto">
          {STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              signups={byStage(stage.id)}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <SignupDrawer
            signup={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
