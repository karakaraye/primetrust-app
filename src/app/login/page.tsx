"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Truck,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed. Please check credentials.");
        setLoading(false);
        return;
      }

      const destination = data.user?.role === "OPERATIONS_STAFF" ? "/waybills" : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setError("Network or server error. Please try again.");
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white font-black text-2xl shadow-xl shadow-brand-500/30 mb-4 ring-4 ring-brand-500/20">
            PTL
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            LOGISTICS OPERATIONS SYSTEM
          </h2>
          <p className="mt-1 text-xs text-brand-400 font-semibold tracking-widest uppercase">
            Port Harcourt Office (PHC) ⇄ Abia Office (ABI)
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. phc.staff@logisticsops.ng"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert("Please use default demo password: password123 or contact Super Administrator.")}
                  className="text-xs text-brand-400 hover:text-brand-300 transition"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-brand-600 focus:ring-brand-500/30"
                />
                <span className="text-xs text-slate-400 font-medium">Keep me signed in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
            >
              {loading ? (
                <span className="animate-pulse">Authenticating staff...</span>
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-center mb-3">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                1-Click Demo Accounts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials("phc.staff@logisticsops.ng")}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500 text-left transition group"
              >
                <div className="font-bold text-slate-200 group-hover:text-blue-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>PHC Staff</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Port Harcourt Desk</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("phc.admin@logisticsops.ng")}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500 text-left transition group"
              >
                <div className="font-bold text-slate-200 group-hover:text-indigo-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>PHC Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">PHC Branch Manager</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("abi.staff@logisticsops.ng")}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500 text-left transition group"
              >
                <div className="font-bold text-slate-200 group-hover:text-emerald-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Abia Staff</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Aba Desk Operations</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("abi.admin@logisticsops.ng")}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-teal-500 text-left transition group"
              >
                <div className="font-bold text-slate-200 group-hover:text-teal-400 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Abia Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Abia Branch Manager</div>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("admin@logisticsops.ng")}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500 text-left transition group sm:col-span-2"
              >
                <div className="font-bold text-slate-200 group-hover:text-purple-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Super Administrator</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Global System HQ (All Branches)</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              Default password for all demo accounts: <code className="text-brand-300 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
