import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Outlet } from "react-router-dom";
import { Phone } from "lucide-react";
import { SignInButton } from "@/components/ui/signin.tsx";

/**
 * Wraps operational routes that require authentication.
 * Shows a branded sign-in screen for unauthenticated visitors.
 */
export default function AuthGuard() {
  return (
    <>
      <AuthLoading>
        <div className="min-h-screen bg-[#f0ead8] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </AuthLoading>

      <Unauthenticated>
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
              Sign in to access your restaurant dashboard.
            </p>
            <SignInButton
              signInText="Sign in to OrderLine"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
            />
            <p className="text-[#c8b89a] text-xs mt-4">
              Don't have an account?{" "}
              <a href="/landing#cta" className="underline hover:text-[#6b5c42] transition-colors">
                Request early access
              </a>
            </p>
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        <Outlet />
      </Authenticated>
    </>
  );
}
