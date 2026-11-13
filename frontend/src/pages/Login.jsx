import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, ArrowLeft, Sparkles, BarChart3, ShieldCheck } from "lucide-react";
import Seo from "../components/Seo.jsx";
import { post } from "../lib/api.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { useToast } from "../lib/ToastContext.jsx";
import { useContent, resolveIcon } from "../lib/content.jsx";

const FALLBACK_PERKS = [
  { icon: "Sparkles", title: "Smart Automation", description: "Automated message sequences for Reels, posts, and Stories that work 24/7." },
  { icon: "BarChart3", title: "Performance Analytics", description: "Track engagement, clicks, and conversion performance in one dashboard." },
  { icon: "ShieldCheck", title: "Meta API Compliant", description: "Official Graph API integrations ensuring full account safety." },
];

export default function Login() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh, isAuthenticated, setUser, user } = useAuth();
  const { showSuccess, showError } = useToast();
  const { value: loginContent } = useContent("login");
  const PERKS = (loginContent?.perks || FALLBACK_PERKS).map((p) => ({
    ...p,
    icon: resolveIcon(p.icon) || Sparkles,
  }));

  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [notice, setNotice] = useState(params.get("message") || params.get("error") || "");

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Please enter a valid email address.";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters long.";
    if (mode === "register") {
      if (!form.name.trim()) errs.name = "Please enter your full name.";
      if (form.password !== form.confirm) errs.confirm = "Passwords do not match.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setNotice("");
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === "login") {
        const data = await post("/api/auth/login", { email: form.email, password: form.password });
        if (data && data.user) setUser(data.user);
        else await refresh();
        showSuccess("Welcome back!");
        const dest = (data && data.user && data.user.role === "admin") ? "/admin" : "/dashboard";
        navigate(dest, { replace: true });
      } else {
        const data = await post("/api/auth/register", {
          name: form.name,
          email: form.email,
          password: form.password,
        });
        if (data && data.user) setUser(data.user);
        showSuccess(data && data.requiresVerification ? data.message : "Registration successful!");
        if (data && data.requiresVerification) {
          setNotice(data.message);
          setMode("login");
        } else {
          const dest = (data && data.user && data.user.role === "admin") ? "/admin" : "/dashboard";
          navigate(dest, { replace: true });
        }
      }
    } catch (err) {
      showError(err.message || "An error occurred. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setNotice("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showError("Please enter a valid email address first.");
      return;
    }
    setBusy(true);
    try {
      await post("/api/auth/forgot-password", { email: form.email });
      showSuccess("Password reset link sent! Check your email.");
    } catch (err) {
      showError(err.message || "Failed to send reset email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-gray-900 dark:text-gray-100">
      <Seo
        title="Login & Register | DM Panda"
        description="Sign in to your DM Panda dashboard. Join thousands of creators and businesses who use DM Panda to save time and boost engagement on Instagram."
        keywords="login dm panda, signup dm panda, dm panda register, instagram automation console"
        noIndex
      />

      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Form side */}
        <div className="flex items-center justify-center px-4 sm:px-8 pt-24 pb-16">
          <div className="w-full max-w-md">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-7"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Homepage
            </Link>

            <div className="flex items-center gap-2.5 mb-7">
              <img src="/images/logo-96.webp" alt="DM Panda Logo" className="h-10 w-auto" />
              <span className="text-2xl font-black tracking-tight">DM Panda</span>
            </div>

            <div className="rounded-3xl border border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] p-6 sm:p-8 shadow-sm">
              <div className="flex gap-2 p-1.5 rounded-2xl bg-white dark:bg-neutral-950 border border-gray-100 dark:border-white/[0.06] mb-6">
                {[
                  { id: "login", label: "Sign In" },
                  { id: "register", label: "Create Account" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMode(m.id);
                      setErrors({});
                      setNotice("");
                      setParams(m.id === "register" ? { mode: "register" } : {});
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      mode === m.id
                        ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <h1 className="text-2xl font-black mb-1">{mode === "login" ? "Welcome Back!" : "Create Your Account"}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {mode === "login"
                  ? "Sign in to continue to your dashboard."
                  : "Join thousands of creators and businesses who use DM Panda to save time and boost engagement on Instagram."}
              </p>

              {notice && (
                <div className="mb-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                  {notice}
                </div>
              )}

              <form onSubmit={submit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                    <input
                      value={form.name}
                      onChange={set("name")}
                      placeholder="Jane Doe"
                      className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15"
                      required
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="you@example.com"
                    className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15"
                    required
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={set("password")}
                      placeholder="••••••••"
                      className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 pr-11 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                {mode === "register" && (
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
                    <input
                      type="password"
                      value={form.confirm}
                      onChange={set("confirm")}
                      placeholder="••••••••"
                      className="w-full text-sm rounded-xl border border-gray-300 dark:border-neutral-700 px-3.5 py-3 bg-white dark:bg-neutral-950 focus:outline-none focus:border-ig-purple focus:ring-2 focus:ring-ig-purple/15"
                      required
                    />
                    {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
                  </div>
                )}

                {mode === "login" && (
                  <div className="flex justify-end">
                    <button type="button" onClick={forgot} className="text-xs font-semibold text-ig-purple hover:underline">
                      Forgot password?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {mode === "login" ? "Sign In" : "Create Account"}
                </button>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" /> or <span className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => showError("Google sign-in requires OAuth credentials configured on the server.")}
                  className="w-full py-3.5 rounded-xl bg-white dark:bg-white/[0.05] border border-gray-300 dark:border-white/15 text-gray-900 dark:text-white font-bold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2.5"
                >
                  <svg className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
                  </svg>
                  Sign in with Google
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setParams(mode === "login" ? { mode: "register" } : {});
                  }}
                  className="font-bold text-ig-purple hover:underline"
                >
                  {mode === "login" ? "Create Your Account" : "Sign in"}
                </button>
              </p>
            </div>

            <p className="mt-5 text-center text-xs text-gray-500 dark:text-gray-400">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Branding side */}
        <div className="hidden lg:flex relative items-center justify-center bg-gray-900 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 30% 20%, rgba(64,93,230,0.35) 0%, rgba(131,58,180,0.25) 40%, transparent 70%), radial-gradient(ellipse at 80% 80%, rgba(253,29,29,0.2) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 max-w-md px-10 text-center">
            <img
              src="/images/Meta_Business_logo_260.webp"
              alt="Meta Business Partner"
              className="h-14 w-auto mx-auto mb-8 opacity-90"
            />
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              Automate Instagram DMs, comments &amp; stories.
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-9">
              Certified Meta Business Partner since 2021. Trusted by 22,000+ creators and brands for safe, compliant,
              100% cloud-based automation.
            </p>
            <div className="space-y-4 text-left">
              {PERKS.map((p) => (
                <div key={p.title} className="flex items-start gap-3.5 rounded-2xl bg-white/[0.06] border border-white/10 p-4">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-[#405DE6] to-[#833AB4] flex items-center justify-center text-white">
                    <p.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{p.title}</p>
                    <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-gray-500">No credit card required · Free plan forever</p>
          </div>
        </div>
      </div>
    </div>
  );
}
