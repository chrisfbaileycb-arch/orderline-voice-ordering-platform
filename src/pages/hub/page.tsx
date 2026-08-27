import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Globe, LayoutDashboard, PhoneCall, Cpu, BarChart2,
  ShoppingCart, ArrowRight, ExternalLink, Zap, Code2,
} from "lucide-react";

const SECTIONS = [
  {
    title: "Public-Facing",
    description: "What restaurant owners and customers see",
    color: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
    icon: Globe,
    iconColor: "text-blue-400 bg-blue-500/15",
    pages: [
      {
        label: "Marketing Landing Page",
        path: "/",
        desc: "The OrderLine sales page — hero, features, pricing, POS compatibility, testimonials, email waitlist.",
        tag: "Public",
        tagColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      },
      {
        label: "Customer Order Chat",
        path: "/order",
        desc: "Demo chat-based ordering for Osteria Bella — 18 menu items, cart, and order submission.",
        tag: "Customer",
        tagColor: "bg-green-500/15 text-green-400 border-green-500/30",
      },
    ],
  },
  {
    title: "Restaurant Operations",
    description: "Tools used by restaurant staff on a tablet or desktop",
    color: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20",
    icon: LayoutDashboard,
    iconColor: "text-yellow-400 bg-yellow-500/15",
    pages: [
      {
        label: "Live Call Dashboard",
        path: "/dashboard",
        desc: "Tablet view — shows who's on hold, who's being served by AI, and lets staff tap 'Answer Call' to take over. Loud audio alert when someone is holding.",
        tag: "Staff Tablet",
        tagColor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      },
      {
        label: "Kitchen Dashboard",
        path: "/kitchen",
        desc: "Live order board for kitchen staff — New, Confirmed, Preparing, Ready, Done columns. Tap to advance orders. Audio alert on new order. PIN-protected (1234).",
        tag: "Kitchen",
        tagColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      },
      {
        label: "Call Analytics",
        path: "/analytics",
        desc: "Per-location analytics — total calls, orders placed, conversion rate, 24h volume chart, and a filterable call log with expandable per-call details.",
        tag: "Manager",
        tagColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      },
    ],
  },
  {
    title: "AI POS Bridge",
    description: "The browser agent that enters phone orders into the POS system",
    color: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
    icon: Cpu,
    iconColor: "text-emerald-400 bg-emerald-500/15",
    pages: [
      {
        label: "Generic Demo Bridge",
        path: "/bridge",
        desc: "Split-screen demo — live order manifest on the left, simulated POS terminal on the right. Shows 3 test order scenarios and the HTTP endpoint.",
        tag: "Demo",
        tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      },
      {
        label: "Charlie's Restaurant Bridge",
        path: "/bridge/charlies-demo",
        desc: "Per-location bridge for Charlie's. Left pane shows real phone orders from Twilio. Right pane loads their Toast POS URL. Agent auto-enters orders.",
        tag: "Per-Location",
        tagColor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
      },
    ],
  },
  {
    title: "RevenuePlus — POS Integration",
    description: "Onboard any restaurant POS system in minutes",
    color: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
    icon: Zap,
    iconColor: "text-violet-400 bg-violet-500/15",
    pages: [
      {
        label: "Restaurant Onboarding Wizard",
        path: "/onboarding",
        desc: "3-step wizard: enter restaurant info → map POS DOM selectors → extract menu schema → save config to Convex and download the deployment bundle.",
        tag: "RevenuePlus",
        tagColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      },
      {
        label: "Agent Bridge SDK",
        path: "/sdk",
        desc: "window.revenuePulse API — injectOrder(), getStatus(), on(), postMessage bridge, DOM events. Download the baked agent bundle (JS + JSON + README) for any location.",
        tag: "SDK v1.0",
        tagColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      },
      {
        label: "Customer Identity Roster",
        path: "/customers",
        desc: "Phone → profile lookup. Loyalty tiers (Bronze → Platinum), call history per customer, order count, card-on-file hints. Profiles auto-create from incoming calls.",
        tag: "CRM",
        tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      },
      {
        label: "Restaurant Admin Panel",
        path: "/admin",
        desc: "PIN-protected operator console — add, edit, and manage all onboarded restaurants. Track status (Active/Trial/Pending), Twilio numbers, POS URLs, and contacts.",
        tag: "Admin",
        tagColor: "bg-violet-500/15 text-violet-400 border-violet-500/30",
      },
      {
        label: "Voice Order Simulator",
        path: "/simulator",
        desc: "Type or speak a natural order — AI parses it into structured items with per-item confidence scores, then injects into the POS bridge for end-to-end verification.",
        tag: "AI",
        tagColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
      },
    ],
  },
  {
    title: "Developer",
    description: "API docs, live order feed, and test harness for integrators",
    color: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20",
    icon: Code2,
    iconColor: "text-indigo-400 bg-indigo-500/15",
    pages: [
      {
        label: "Voice Agent Integration Guide",
        path: "/integration",
        desc: "Full API reference for POST /api/order — request schema, curl/JS/Python/Twilio examples, fuzzy match docs, live order feed, and test harness.",
        tag: "API Docs",
        tagColor: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
      },
    ],
  },
  {
    title: "Phone Call Flow",
    description: "Live Twilio IVR — these fire when a real call comes in",
    color: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
    icon: PhoneCall,
    iconColor: "text-rose-400 bg-rose-500/15",
    pages: [
      {
        label: "Twilio Webhook Entry",
        path: null,
        external: "https://vivid-corgi-575.convex.site/twilio/incoming?locationId=charlies-demo",
        desc: "Restaurant forwards their number here. Caller hears: Greeting → Pickup or Delivery? → Specials → AI Order or Hold for staff.",
        tag: "Twilio",
        tagColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
      },
      {
        label: "Order Push Endpoint",
        path: null,
        external: "https://vivid-corgi-575.convex.site/api/order",
        desc: "After AI captures the order, it's pushed here as JSON → appears live on the bridge page.",
        tag: "API",
        tagColor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      },
    ],
  },
];

const CALL_FLOW_STEPS = [
  { step: "1", label: "Caller dials restaurant", detail: "Restaurant has call forwarding set to their Twilio number" },
  { step: "2", label: "Greeting plays", detail: "Polly.Joanna: 'Thank you for calling [Name]! Pickup or delivery?'" },
  { step: "3a", label: "Pickup path", detail: "Daily specials play → 'Place order with AI or hold for staff?'" },
  { step: "3b", label: "Delivery path", detail: "SMS offer (if enabled) → links to DoorDash / Uber Eats. If SMS not ready, graceful fallback to pickup offer." },
  { step: "4a", label: "AI takes order", detail: "Speech captured → structured JSON → pushed to bridge → POS entry begins" },
  { step: "4b", label: "Staff hold queue", detail: "Hold music loops. Dashboard pings tablet with audio alert. Staff taps 'Answer Call' → call forwards back." },
  { step: "5", label: "Call logged", detail: "Every call writes to callLogs with flow path, duration, outcome, order, SMS status" },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[#f0ead8] text-[#2d2010]">
      {/* Header */}
      <div className="border-b border-[#d8d0c0] bg-[#faf6ed] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <Zap size={15} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#2d2010]">OrderLine — System Map</h1>
            <p className="text-[10px] text-[#6b5c42]">All pages and how they connect</p>
          </div>
        </div>
        <Link to="/" className="text-[#6b5c42] hover:text-[#2d2010] transition-colors text-xs border border-[#cec6b4] rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <Globe size={12} /> View Landing Page
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        {/* Page sections */}
        {SECTIONS.map((section) => (
          <motion.section
            key={section.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.iconColor}`}>
                <section.icon size={15} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#2d2010]">{section.title}</h2>
                <p className="text-[11px] text-[#6b5c42]">{section.description}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {section.pages.map((page) => {
                const inner = (
                  <div className={`group h-full bg-gradient-to-br ${section.color} border rounded-xl p-4 transition-all duration-200 hover:brightness-110`}>
                    <div className="flex items-start justify-between mb-2">
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 ${page.tagColor}`}>
                        {page.tag}
                      </span>
                      {page.path ? (
                        <ArrowRight size={14} className="text-[#9a8a72] group-hover:text-[#2d2010] transition-colors" />
                      ) : (
                        <ExternalLink size={14} className="text-[#9a8a72] group-hover:text-[#2d2010] transition-colors" />
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-[#2d2010] mb-1">{page.label}</h3>
                    <p className="text-[11px] text-[#6b5c42] leading-relaxed">{page.desc}</p>
                    {page.path && (
                      <p className="text-[10px] text-[#9a8a72] font-mono mt-2">{page.path}</p>
                    )}
                    {"external" in page && page.external && (
                      <p className="text-[10px] text-[#9a8a72] font-mono mt-2 break-all">{page.external}</p>
                    )}
                  </div>
                );

                if (page.path) {
                  return (
                    <Link key={page.label} to={page.path} className="cursor-pointer block">
                      {inner}
                    </Link>
                  );
                }
                const ext = "external" in page ? page.external : undefined;
                return (
                  <a key={page.label} href={ext} target="_blank" rel="noreferrer" className="cursor-pointer block">
                    {inner}
                  </a>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Call flow diagram */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-orange-400 bg-orange-500/15">
              <PhoneCall size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#2d2010]">Call Flow — Step by Step</h2>
              <p className="text-[11px] text-[#6b5c42]">What happens from the moment a customer calls</p>
            </div>
          </div>

          <div className="bg-[#faf6ed] border border-[#cec6b4] rounded-xl overflow-hidden">
            {CALL_FLOW_STEPS.map((s, i) => (
              <div
                key={s.step}
                className={`flex items-start gap-4 px-5 py-4 ${i < CALL_FLOW_STEPS.length - 1 ? "border-b border-[#d8d0c0]" : ""}`}
              >
                <div className="w-7 h-7 rounded-full bg-[#ece6d6] border border-[#cec6b4] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-mono text-[#6b5c42]">{s.step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#2d2010]">{s.label}</p>
                  <p className="text-[11px] text-[#6b5c42] mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-[#9a8a72] text-xs pb-4">
          OrderLine · Built with Hercules · All pages update in real time via Convex
        </p>
      </div>
    </div>
  );
}
