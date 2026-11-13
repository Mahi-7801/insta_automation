import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Radio,
  AtSign,
  Zap,
  Shield,
  Inbox,
  Sparkles,
  Link2,
  BarChart3,
  CreditCard,
  Receipt,
  Settings,
  LifeBuoy,
  Menu,
  X,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  MessageCircle,
  Send,
  Lock,
} from "lucide-react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { useTheme } from "../../lib/ThemeContext.jsx";
import { usePlan, SECTION_FEATURES } from "../../lib/PlanContext.jsx";

const NAV = [
  { section: "Overview", items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true, section: "overview" }] },
  {
    section: "Automations",
    items: [
      { to: "/dashboard/dm-automation", label: "DM Automation", icon: MessageSquare, section: "dm-automation" },
      { to: "/dashboard/post-automation", label: "Post Comments", icon: FileText, section: "post-automation" },
      { to: "/dashboard/reel-automation", label: "Reel Comments", icon: Send, section: "reel-automation" },
      { to: "/dashboard/story-automation", label: "Story Automation", icon: ImageIcon, section: "story-automation" },
      { to: "/dashboard/live-automation", label: "Live Automation", icon: Radio, section: "live-automation" },
      { to: "/dashboard/mentions", label: "Mentions", icon: AtSign, section: "mentions" },
      { to: "/dashboard/global-triggers", label: "Global Triggers", icon: Zap, section: "global-triggers" },
      { to: "/dashboard/comment-moderation", label: "Comment Moderation", icon: Shield, section: "comment-moderation" },
    ],
  },
  {
    section: "Messaging",
    items: [
      { to: "/dashboard/reply-templates", label: "Reply Templates", icon: MessageCircle, section: "reply-templates" },
      { to: "/dashboard/inbox-menu", label: "Inbox Menu", icon: Inbox, section: "inbox-menu" },
      { to: "/dashboard/convo-starter", label: "Convo Starters", icon: Sparkles, section: "convo-starter" },
      { to: "/dashboard/suggest-more", label: "Suggest More", icon: Sparkles, section: "suggest-more" },
      { to: "/dashboard/welcome-message", label: "Welcome Message", icon: Send, section: "welcome-message" },
    ],
  },
  {
    section: "Growth",
    items: [{ to: "/dashboard/super-profile", label: "Super Profile", icon: Link2, section: "super-profile" }],
  },
  {
    section: "Account",
    items: [
      { to: "/dashboard/analytics", label: "Analytics", icon: BarChart3, section: "analytics" },
      { to: "/dashboard/my-plan", label: "My Plan", icon: CreditCard, section: "my-plan" },
      { to: "/dashboard/transactions", label: "Transactions", icon: Receipt, section: "transactions" },
      { to: "/dashboard/account-settings", label: "Account Settings", icon: Settings, section: "account-settings" },
      { to: "/dashboard/support", label: "Support", icon: LifeBuoy, section: "support" },
    ],
  },
];

export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { hasFeature } = usePlan();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/login?message=" + encodeURIComponent("You must be logged in to view this page."), {
        replace: true,
      });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="text-center">
          <img src="/images/logo-96.webp" alt="" className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading your account...</p>
        </div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="h-16 sm:h-[68px] flex items-center justify-between px-5 border-b border-neutral-200/70 dark:border-white/[0.07]">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo-96.webp" alt="DM Panda" className="h-8 w-auto" />
          <span className="font-black text-lg tracking-tight hidden sm:block">DM Panda</span>
        </Link>
        <button onClick={() => setOpen(false)} className="lg:hidden p-2" aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="px-3 mb-2 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const featureKey = SECTION_FEATURES[item.section];
                const locked = featureKey ? !hasFeature(featureKey) : false;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-[#405DE6] to-[#833AB4] text-white shadow-md shadow-purple-500/20"
                          : locked
                          ? "text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {locked && <Lock className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-neutral-200/70 dark:border-white/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.04]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#405DE6] to-[#833AB4] text-white text-xs font-black flex items-center justify-center shrink-0">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold truncate">{user?.name || "Account"}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.email || ""}</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            aria-label="Logout"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0b] text-gray-900 dark:text-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[264px] bg-white dark:bg-[#101012] border-r border-neutral-200/70 dark:border-white/[0.07] z-40">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 z-50 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-[#101012] z-[60] transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      {/* Main */}
      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 h-16 sm:h-[68px] bg-white/85 dark:bg-[#101012]/85 backdrop-blur-md border-b border-neutral-200/70 dark:border-white/[0.07] flex items-center justify-between px-4 sm:px-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 -ml-2" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">
                {NAV.flatMap((g) => g.items).find((i) => location.pathname === i.to)?.label || "Dashboard"}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                Instagram automation workspace
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/pricing"
              className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#405DE6] to-[#833AB4] text-white shadow-md shadow-purple-500/20"
            >
              Upgrade
            </Link>

            <div className="relative">
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#405DE6] to-[#833AB4] text-white text-xs font-black flex items-center justify-center">
                  {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {accountOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#161618] shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-neutral-100 dark:border-white/[0.07]">
                      <p className="text-sm font-bold truncate">{user?.name || "Account"}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                    </div>
                    <Link
                      to="/dashboard/account-settings"
                      onClick={() => setAccountOpen(false)}
                      className="block px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                    >
                      Account Settings
                    </Link>
                    <button
                      onClick={async () => {
                        await logout();
                        navigate("/");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
