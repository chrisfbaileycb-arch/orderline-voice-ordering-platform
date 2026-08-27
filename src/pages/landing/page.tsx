import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "motion/react";
import {
  Phone, Zap, CheckCircle2, ArrowRight, Star,
  Clock, Shield, TrendingUp, RefreshCw,
  ChevronDown, Menu, X, Mic2, Play, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils.ts";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Phone,
    title: "Never Miss a Call",
    desc: "OrderLine answers every call, even during the dinner rush. No hold music. No missed orders. No revenue left on the table.",
  },
  {
    icon: Zap,
    title: "Real-Time POS Entry",
    desc: "The order hits your kitchen screen before the customer hangs up. No re-keying. No typos. No lag.",
  },
  {
    icon: RefreshCw,
    title: "Works With Every POS",
    desc: "Toast, Square, Clover, Lightspeed, Revel, Aloha — if it has a browser-based terminal, OrderLine works with it.",
  },
  {
    icon: Shield,
    title: "Zero Payment Data Risk",
    desc: "OrderLine handles name, items, and pickup time only. No card numbers. No PCI scope. No liability.",
  },
  {
    icon: TrendingUp,
    title: "Power of the Big Chains",
    desc: "Domino's and McDonald's spend millions on phone AI. OrderLine gives your independent restaurant the same edge.",
  },
  {
    icon: Clock,
    title: "More Time to Cook",
    desc: "Your staff stops answering phones and starts focusing on the food. That's the whole point.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "You sign up in 2 minutes",
    desc: "Tell us your restaurant name, phone number, POS system, and preferred AI voice. That's it.",
    icon: Phone,
  },
  {
    num: "02",
    title: "We handle everything",
    desc: "Our team maps your POS, sets up your Twilio phone number, configures the AI voice agent, and runs a full test.",
    icon: RefreshCw,
  },
  {
    num: "03",
    title: "We verify on a Zoom call",
    desc: "You watch a live test order go through your POS in real time. If everything looks great, we go live on your chosen date.",
    icon: Zap,
  },
];

const POS_CONFIRMED = [
  { name: "Square", confirmed: true },
  { name: "Heartland / Genius", confirmed: true },
  { name: "Toast", confirmed: false },
  { name: "Clover", confirmed: false },
  { name: "SpotOn", confirmed: false },
  { name: "Lightspeed", confirmed: false },
];

const TESTIMONIALS = [
  {
    quote: "After years of working as a dispatcher for an online order system company, this will be a game changer for small businesses.",
    name: "Krystal",
    role: "Former Dispatcher, Online Order Systems",
    rating: 5,
  },
  {
    quote: "After all the years of going out to eat at restaurants, when I saw this, it feels like I can actually order easier and understand the menu more clearly.",
    name: "Victoria",
    role: "Restaurant Customer",
    rating: 5,
  },
  {
    quote: "After working side by side in a restaurant with my stepfather, this system was what we needed to stay open.",
    name: "Jacob",
    role: "Restaurant Industry",
    rating: 5,
  },
  {
    quote: "I've worked a lot of restaurants and independents always struggled to have modifiers and functionality effectively work well. This is really going to actually be something special.",
    name: "Brianna",
    role: "Restaurant Industry Veteran",
    rating: 5,
  },
];

const POS_OPTIONS = [
  "Square", "Heartland / Genius", "Toast", "Clover",
  "SpotOn", "Lightspeed", "Other",
];

const VOICE_OPTIONS: { value: "female" | "male" | "neutral" | "calm_professional"; label: string; desc: string }[] = [
  { value: "female", label: "Female", desc: "Warm & friendly" },
  { value: "male", label: "Male", desc: "Clear & direct" },
  { value: "neutral", label: "Neutral", desc: "Gender-neutral" },
  { value: "calm_professional", label: "Calm Pro", desc: "Polished tone" },
];

// ─── Components ───────────────────────────────────────────────────────────────

function Navbar({ onCTA }: { onCTA: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
            <Phone size={16} className="text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">OrderLine</span>
          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] hidden sm:inline-flex font-semibold">BETA</Badge>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How It Works</a>
          <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          <a href="#pos" className="hover:text-gray-900 transition-colors">POS</a>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={onCTA}
            size="sm"
            className="hidden md:flex bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-1.5 shadow-sm shadow-emerald-200"
          >
            Get Started <ArrowRight size={14} />
          </Button>
          <button onClick={() => setOpen(!open)} className="md:hidden text-gray-600 hover:text-gray-900 cursor-pointer">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {["how-it-works", "features", "pricing", "pos"].map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="block text-gray-600 hover:text-gray-900 font-medium capitalize">
              {id.replace(/-/g, " ")}
            </a>
          ))}
          <Button onClick={() => { onCTA(); setOpen(false); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold">
            Get Started
          </Button>
        </div>
      )}
    </nav>
  );
}

// ─── Signup Form ──────────────────────────────────────────────────────────────

type FormState = {
  contactName: string;
  restaurantName: string;
  restaurantPhone: string;
  email: string;
  locationCount: "1" | "2-3" | "4-10" | "10+";
  posSystem: string;
  posOther: string;
  voicePreference: "female" | "male" | "neutral" | "calm_professional";
  termsAgreed: boolean;
};

const EMPTY_FORM: FormState = {
  contactName: "",
  restaurantName: "",
  restaurantPhone: "",
  email: "",
  locationCount: "1",
  posSystem: "",
  posOther: "",
  voicePreference: "calm_professional",
  termsAgreed: false,
};

function SignupForm({ ctaRef }: { ctaRef: React.RefObject<HTMLDivElement | null> }) {
  const submitSignup = useMutation(api.signups.submit);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const effectivePOS = form.posSystem === "Other" ? form.posOther : form.posSystem;
  const canSubmit =
    form.contactName.trim().length >= 2 &&
    form.restaurantName.trim().length >= 2 &&
    form.restaurantPhone.trim().length >= 7 &&
    form.email.includes("@") &&
    effectivePOS.trim().length > 0 &&
    form.termsAgreed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await submitSignup({
        contactName: form.contactName.trim(),
        restaurantName: form.restaurantName.trim(),
        restaurantPhone: form.restaurantPhone.trim(),
        email: form.email.trim(),
        locationCount: form.locationCount,
        posSystem: effectivePOS.trim(),
        voicePreference: form.voicePreference,
        termsAgreed: true,
      });
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-10 text-center max-w-lg mx-auto"
      >
        <CheckCircle2 size={44} className="text-emerald-500 mx-auto mb-4" />
        <p className="text-2xl font-bold text-gray-900 mb-2">You{"'"}re in.</p>
        <p className="text-gray-500 text-sm leading-relaxed">
          We{"'"}ll email you within 24 hours to schedule your onboarding call.
          In the meantime, feel free to reach out at{" "}
          <a href="mailto:hello@orderline.app" className="text-emerald-600 underline font-medium">hello@orderline.app</a>.
        </p>
      </motion.div>
    );
  }

  return (
    <div ref={ctaRef}>
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-4">
      {/* Contact info */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">Your name <span className="text-red-500">*</span></label>
          <Input
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Marco Rossi"
            required
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-emerald-400/20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">Email <span className="text-red-500">*</span></label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="marco@mariospizza.com"
            required
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-emerald-400/20"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">Restaurant name <span className="text-red-500">*</span></label>
          <Input
            value={form.restaurantName}
            onChange={(e) => set("restaurantName", e.target.value)}
            placeholder="Mario's Pizza"
            required
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-emerald-400/20"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">Restaurant phone <span className="text-red-500">*</span></label>
          <Input
            type="tel"
            value={form.restaurantPhone}
            onChange={(e) => set("restaurantPhone", e.target.value)}
            placeholder="+1 (312) 555-0100"
            required
            className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-400 focus:ring-emerald-400/20"
          />
          <p className="text-[10px] text-gray-400 mt-1">The number OrderLine will answer for you</p>
        </div>
      </div>

      {/* POS + locations */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">POS system <span className="text-red-500">*</span></label>
          <select
            value={form.posSystem}
            onChange={(e) => set("posSystem", e.target.value)}
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer"
          >
            <option value="">Select your POS...</option>
            {POS_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {form.posSystem === "Other" && (
            <Input
              value={form.posOther}
              onChange={(e) => set("posOther", e.target.value)}
              placeholder="Name your POS system"
              className="mt-2 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 text-sm"
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-600 font-medium mb-1.5">Number of locations</label>
          <div className="flex gap-1.5 flex-wrap">
            {(["1", "2-3", "4-10", "10+"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => set("locationCount", v)}
                className={cn(
                  "flex-1 min-w-[2.5rem] py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                  form.locationCount === v
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voice preference */}
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-1.5 flex items-center gap-1.5">
          <Mic2 size={11} /> AI voice preference
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => set("voicePreference", v.value)}
              className={cn(
                "py-2.5 px-2 rounded-xl border text-left transition-all cursor-pointer",
                form.voicePreference === v.value
                  ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200"
                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
              )}
            >
              <p className={cn("text-xs font-semibold", form.voicePreference === v.value ? "text-emerald-700" : "text-gray-900")}>
                {v.label}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Terms */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => set("termsAgreed", !form.termsAgreed)}
            className={cn(
              "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer",
              form.termsAgreed
                ? "bg-emerald-500 border-emerald-500"
                : "bg-white border-gray-300"
            )}
          >
            {form.termsAgreed && <Checkmark size={10} className="text-white" />}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            I understand this is a managed service: OrderLine{"'"}s team handles POS setup, Twilio provisioning, and AI configuration on my behalf.
            I agree to the{" "}
            <a href="#" className="underline hover:text-gray-900 font-medium">Terms of Service</a> and{" "}
            <a href="#" className="underline hover:text-gray-900 font-medium">Privacy Policy</a>.
            One-time onboarding: <strong className="text-gray-900">$250</strong>. Monthly: <strong className="text-gray-900">$250/month</strong>.
          </p>
        </label>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || submitting}
        size="lg"
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold gap-2 h-12 shadow-sm shadow-emerald-200 disabled:opacity-40"
      >
        {submitting ? "Submitting..." : "Request Onboarding"} {!submitting && <ArrowRight size={15} />}
      </Button>

      <p className="text-center text-gray-400 text-xs">
        No credit card now. We{"'"}ll send a payment link after your onboarding call.
      </p>
    </form>
    </div>
  );
}

// tiny checkmark for the form checkbox
function Checkmark({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}>
      <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const ctaRef = useRef<HTMLDivElement>(null);

  function scrollToCTA() {
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <Navbar onCTA={scrollToCTA} />

      {/* ── Hero ── */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-emerald-50 to-transparent rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Social proof bar */}
            <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-1.5 shadow-sm mb-8">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-xs text-gray-500 font-medium">Trusted by restaurant owners</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Never miss a call.
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">Never lose an order.</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
              OrderLine answers your phone, takes the full order with modifiers, and enters it into your POS — before the customer hangs up.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button
                onClick={scrollToCTA}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base gap-2 px-8 h-13 shadow-lg shadow-emerald-200/50"
              >
                Get Started Free <ArrowRight size={16} />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 gap-2 h-13 font-medium"
                asChild
              >
                <a href="#how-it-works">
                  See how it works <ChevronDown size={16} />
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10 text-sm text-gray-400 font-medium">
              <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" /> Fully managed setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" /> Zero payment data</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" /> Cancel anytime</span>
            </div>
          </motion.div>

          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-16 relative rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/60"
          >
            <img
              src="https://images.unsplash.com/photo-1778792447408-b22ad88daa37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NzIwMTN8MHwxfHNlYXJjaHwyfHxyZXN0YXVyYW50JTIwcGhvbmUlMjBvcmRlcmluZyUyMGtpdGNoZW4lMjBjb3VudGVyJTIwbW9kZXJuJTIwY2xlYW58ZW58MHx8fHwxNzg2ODU3Mjg2fDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Restaurant worker using OrderLine touch screen system"
              className="w-full object-cover aspect-[16/9]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-full px-5 py-2 shadow-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-700">Order entering POS in real time</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section className="py-12 px-4 sm:px-6 border-y border-gray-100">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-500">700M+</div>
            <div className="text-gray-500 text-sm mt-1 font-medium">calls go unanswered yearly</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">$0</div>
            <div className="text-gray-500 text-sm mt-1 font-medium">POS integration fees</div>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-gray-900">100%</div>
            <div className="text-gray-500 text-sm mt-1 font-medium">of calls answered</div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-emerald-600 font-semibold text-sm mb-3 uppercase tracking-wide">How It Works</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">You sign up. We handle everything.</h2>
            <p className="text-gray-500 text-lg font-medium max-w-2xl mx-auto">No technical setup. No POS integration work. Just tell us what you need.</p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <FadeIn key={step.num} delay={i * 0.12}>
                <div className="relative bg-white border border-gray-100 rounded-2xl p-7 h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5">
                    <step.icon size={22} className="text-emerald-500" />
                  </div>
                  <div className="text-xs font-bold text-emerald-500 mb-2 uppercase tracking-widest">Step {step.num}</div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <ArrowRight size={14} className="text-emerald-500" />
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <p className="text-emerald-600 font-semibold text-sm mb-3 uppercase tracking-wide">Features</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">Everything your front desk does. Automated.</h2>
            <p className="text-gray-500 text-lg font-medium">OrderLine handles the call so your team handles the food.</p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 0.08}>
                <div className="bg-white rounded-2xl border border-gray-100 p-7 h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <f.icon size={20} className="text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── POS Compatibility ── */}
      <section id="pos" className="py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <p className="text-emerald-600 font-semibold text-sm mb-3 uppercase tracking-wide">Compatibility</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">Tested. Verified. Ready.</h2>
            <p className="text-gray-500 text-lg font-medium mb-12">
              We personally test every POS integration before launch.<br className="hidden sm:block" />
              Green means verified and ready. Grey means testing in progress.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {POS_CONFIRMED.map((pos) => (
                <div
                  key={pos.name}
                  className={cn(
                    "relative rounded-2xl border-2 px-5 py-5 text-sm font-semibold transition-all",
                    pos.confirmed
                      ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-400"
                  )}
                >
                  {pos.confirmed && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                      <Check size={11} className="text-white" />
                    </div>
                  )}
                  <span>{pos.name}</span>
                  {!pos.confirmed && (
                    <p className="text-[10px] text-gray-400 font-normal mt-1">Coming soon</p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-sm mt-8 font-medium">
              More POS systems unlocked as we complete real-world testing.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-emerald-600 font-semibold text-sm mb-3 uppercase tracking-wide">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">What people are saying</h2>
            <p className="text-gray-500 font-medium">Feedback from people who know the restaurant industry firsthand.</p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <blockquote className="text-gray-600 text-sm leading-relaxed flex-1 mb-5">{'"'}{t.quote}{'"'}</blockquote>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{t.role}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <FadeIn className="text-center mb-14">
            <p className="text-emerald-600 font-semibold text-sm mb-3 uppercase tracking-wide">Pricing</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">Simple, honest pricing.</h2>
            <p className="text-gray-500 text-lg font-medium">One price. Everything included. No surprises.</p>
          </FadeIn>

          <FadeIn>
            <div className="grid sm:grid-cols-2 gap-6">
              {/* Onboarding */}
              <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col shadow-sm">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">One-Time Setup</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-gray-900">$250</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Paid once, after your Zoom verification call</p>
                <ul className="space-y-3 flex-1">
                  {[
                    "Full POS integration by our team",
                    "Twilio number provisioning",
                    "AI voice agent configuration",
                    "Live Zoom test run",
                    "Go-live on your chosen date",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check size={15} className="text-gray-400 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Monthly */}
              <div className="relative bg-white border-2 border-emerald-500 rounded-2xl p-8 flex flex-col shadow-lg shadow-emerald-100/50">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-emerald-500 text-white border-0 font-bold text-xs px-4 py-1 shadow-sm">MOST POPULAR</Badge>
                </div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">Monthly Service</p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-5xl font-extrabold text-gray-900">$250</span>
                  <span className="text-gray-400 text-sm mb-1.5 font-medium">/mo</span>
                </div>
                <p className="text-gray-500 text-sm mb-6">Per location. Cancel anytime.</p>
                <ul className="space-y-3 flex-1">
                  {[
                    "Unlimited calls answered",
                    "Real-time POS order entry",
                    "AI voice agent always on",
                    "Call analytics dashboard",
                    "Priority support",
                    "Menu updates on request",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check size={15} className="text-emerald-500 mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-center text-gray-400 text-xs mt-6">
              Multi-location pricing available — <a href="mailto:hello@orderline.app" className="underline hover:text-gray-600 font-medium">contact us</a> for a quote.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Signup Form ── */}
      <section id="signup" className="py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <FadeIn className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <Phone size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight tracking-tight">
              Ready to stop<br className="hidden sm:block" /> answering phones?
            </h2>
            <p className="text-gray-500 text-lg font-medium">
              Sign up below. We{"'"}ll reach out within 24 hours — no credit card required.
            </p>
          </FadeIn>

          <FadeIn>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
              <SignupForm ctaRef={ctaRef} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Phone size={12} className="text-white" />
            </div>
            <span className="font-bold text-gray-700">OrderLine</span>
          </div>
          <p className="font-medium">&copy; {new Date().getFullYear()} OrderLine. All rights reserved.</p>
          <div className="flex gap-5 font-medium">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
            <a href="mailto:hello@orderline.app" className="hover:text-gray-600 transition-colors">Contact</a>
            <Link to="/dev" className="opacity-20 hover:opacity-60 transition-opacity text-[10px] font-mono">
              dev
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
