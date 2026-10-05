import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Phone, ArrowRight } from "lucide-react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

/**
 * Wraps operational routes that require authentication.
 * Uses Firebase Authentication with a preview demo option for immediate exploration.
 */
export default function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth();

  const [demoMode, setDemoMode] = useState<boolean>(() => {
    return localStorage.getItem("orderline_demo_mode") === "true";
  });

  const enterDemo = () => {
    localStorage.setItem("orderline_demo_mode", "true");
    setDemoMode(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0ead8] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated || demoMode) {
    return <Outlet />;
  }

  return (
    <div
      className="min-h-screen bg-[#f0ead8] flex flex-col items-center justify-center px-4"
      style={{ backgroundImage: `radial-gradient(ellipse at 50% 0%, #e8dfc8 0%, #f0ead8 70%)` }}
    >
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 mb-5">
          <Phone size={24} className="text-emerald-500" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-[#2d2010] mb-2 tracking-tight">
          OrderLine
        </h1>
        <p className="text-[#9a8a72] text-sm mb-8 leading-relaxed">
          Sign in with your Google account to access your restaurant dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <SignInButton
            signInText="Sign in with Google"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
          />
          <button
            type="button"
            onClick={enterDemo}
            className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-md border border-[#c8b89a] text-[#4d3b24] hover:bg-[#e4dcbc] text-sm font-medium transition-colors"
          >
            <span>Continue to Demo Mode</span>
            <ArrowRight size={15} />
          </button>
        </div>
        <p className="text-[#c8b89a] text-xs mt-4">
          Powered by Firebase & Gemini Voice AI
        </p>
      </div>
    </div>
  );
}
