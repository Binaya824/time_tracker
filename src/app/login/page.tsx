"use client";

import { useState } from "react";
import { Eye, EyeOff, Timer, ArrowRight, KeyRound, Sparkles } from "lucide-react";

function InputField({ label, type = "text", value, onChange, placeholder, required = false,
  showToggle, onToggle, showValue }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; showToggle?: boolean; onToggle?: () => void; showValue?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      <div className="relative">
        <input
          type={showToggle ? (showValue ? "text" : "password") : type}
          value={value} onChange={e => onChange(e.target.value)}
          required={required} placeholder={placeholder}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white
            text-sm text-slate-900 placeholder:text-slate-400
            focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10
            hover:border-slate-400 transition-all duration-200 pr-11"
        />
        {showToggle && (
          <button type="button" onClick={onToggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400
              hover:text-indigo-500 transition-colors duration-200 cursor-pointer">
            {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Login failed"); return; }
      window.location.href = `/dashboard/${data.user.role}`;
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSuccessMessage("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Reset failed"); return; }
      setSuccessMessage("Password reset! Redirecting...");
      setResetEmail(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => { setMode("login"); setSuccessMessage(""); }, 2000);
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  const switchMode = (next: "login" | "reset") => { setMode(next); setError(""); setSuccessMessage(""); };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12
        bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-600/15 rounded-full blur-3xl" />

        <div className="relative text-center max-w-sm">
          <div className="relative inline-block mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600
              flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40 animate-float">
              <Timer className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full
              bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
            Time<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Tracker</span>
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Manage projects, track time, and measure team performance all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[{ v: "3", l: "Roles" }, { v: "∞", l: "Projects" }, { v: "Live", l: "Tracking" }].map(s => (
              <div key={s.l} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xl font-black text-white">{s.v}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-6 sm:p-10">
        <div className="lg:hidden mb-8 text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600
            flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Timer className="w-7 h-7 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">TimeTracker</h1>
        </div>

        <div className="w-full max-w-sm animate-scale-in">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
            <div className="mb-6">
              {mode === "reset" && (
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <KeyRound className="w-5 h-5 text-indigo-600" strokeWidth={1.75} />
                </div>
              )}
              <h2 className="text-2xl font-black text-slate-900">
                {mode === "login" ? "Welcome back" : "Reset Password"}
              </h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {mode === "login" ? "Sign in to your workspace" : "Enter your email and a new password"}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-scale-in">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm animate-scale-in">
                {successMessage}
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <InputField label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
                <InputField label="Password" value={password} onChange={setPassword} placeholder="••••••••" required
                  showToggle onToggle={() => setShowPassword(v => !v)} showValue={showPassword} />

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 mt-1
                    bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                    py-3 px-4 rounded-lg font-bold text-sm
                    hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5
                    hover:shadow-xl hover:shadow-indigo-500/30
                    active:scale-[0.98] active:translate-y-0
                    transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span>
                    : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
                </button>

                <p className="text-center text-sm text-slate-500 pt-1">
                  Forgot your password?{" "}
                  <button type="button" onClick={() => switchMode("reset")}
                    className="text-indigo-600 hover:text-indigo-500 font-bold transition-colors cursor-pointer">Reset it</button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <InputField label="Email address" type="email" value={resetEmail} onChange={setResetEmail} placeholder="you@example.com" required />
                <InputField label="New Password" value={newPassword} onChange={setNewPassword} placeholder="••••••••" required
                  showToggle onToggle={() => setShowNewPassword(v => !v)} showValue={showNewPassword} />
                <InputField label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" required
                  showToggle onToggle={() => setShowConfirmPassword(v => !v)} showValue={showConfirmPassword} />

                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 mt-1
                    bg-gradient-to-r from-indigo-600 to-violet-600 text-white
                    py-3 px-4 rounded-lg font-bold text-sm
                    hover:from-indigo-500 hover:to-violet-500 hover:-translate-y-0.5
                    hover:shadow-xl hover:shadow-indigo-500/30
                    active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer">
                  {loading
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Resetting...</span>
                    : "Reset Password"}
                </button>

                <p className="text-center text-sm text-slate-500 pt-1">
                  Remember it?{" "}
                  <button type="button" onClick={() => switchMode("login")}
                    className="text-indigo-600 hover:text-indigo-500 font-bold transition-colors cursor-pointer">Back to sign in</button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
