"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, FolderKanban, Users, TrendingUp,
  Clock, CheckSquare, LogOut, Menu, X, Timer, CalendarDays,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "manager" | "employee";
  name: string;
  email: string;
}

const roleConfig = {
  admin: {
    gradient: "from-indigo-600 to-indigo-700",
    activeBg: "bg-indigo-600",
    activeText: "text-white",
    badge: "bg-indigo-500/20 text-indigo-300",
    avatarGrad: "from-indigo-500 to-violet-500",
  },
  manager: {
    gradient: "from-emerald-600 to-emerald-700",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
    badge: "bg-emerald-500/20 text-emerald-300",
    avatarGrad: "from-emerald-500 to-teal-500",
  },
  employee: {
    gradient: "from-violet-600 to-violet-700",
    activeBg: "bg-violet-600",
    activeText: "text-white",
    badge: "bg-violet-500/20 text-violet-300",
    avatarGrad: "from-violet-500 to-purple-500",
  },
};

const adminLinks = [
  { href: "/dashboard/admin",             label: "Overview",    Icon: LayoutDashboard },
  { href: "/dashboard/admin/projects",    label: "Projects",    Icon: FolderKanban },
  { href: "/dashboard/admin/users",       label: "Users",       Icon: Users },
  { href: "/dashboard/admin/performance", label: "Performance", Icon: TrendingUp },
  { href: "/dashboard/admin/timelogs",    label: "Daily Logs",  Icon: Clock },
  { href: "/dashboard/admin/leaves",      label: "Leaves",      Icon: CalendarDays },
];
const managerLinks = [
  { href: "/dashboard/manager",             label: "Overview",    Icon: LayoutDashboard },
  { href: "/dashboard/manager/projects",    label: "My Projects", Icon: FolderKanban },
  { href: "/dashboard/manager/performance", label: "Performance", Icon: TrendingUp },
  { href: "/dashboard/manager/timelogs",    label: "Daily Logs",  Icon: Clock },
  { href: "/dashboard/manager/leaves",      label: "Leaves",      Icon: CalendarDays },
];
const employeeLinks = [
  { href: "/dashboard/employee",       label: "My Tasks", Icon: CheckSquare },
  { href: "/dashboard/employee/leave", label: "Leave",    Icon: CalendarDays },
];

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cfg   = roleConfig[role];
  const links = role === "admin" ? adminLinks : role === "manager" ? managerLinks : employeeLinks;

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const roleBadge = { admin: "Admin", manager: "Manager", employee: "Employee" }[role];

  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <>
      {/* Hamburger (mobile) */}
      <button
        aria-label="Toggle sidebar"
        onClick={() => setSidebarOpen(p => !p)}
        className={`fixed top-3 left-3 z-[200] md:hidden w-9 h-9 rounded-lg flex items-center justify-center
          bg-gradient-to-br ${cfg.gradient} shadow-md transition-all duration-200 hover:opacity-90 active:scale-95`}
      >
        {sidebarOpen ? <X className="w-4 h-4 text-white" /> : <Menu className="w-4 h-4 text-white" />}
      </button>

      {/* Backdrop */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[99] bg-black/50 md:hidden animate-fade-in" />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-[100]
        w-64 h-full flex-shrink-0 flex flex-col
        bg-slate-900 text-white
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Brand */}
        <div className={`px-5 py-5 bg-gradient-to-br ${cfg.gradient}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Timer className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-none">TimeTracker</h1>
              <p className="text-[11px] text-white/60 mt-0.5">Project Management</p>
            </div>
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cfg.avatarGrad}
              flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-sm`}>
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{name}</p>
              <p className="text-[11px] text-slate-400 truncate">{email}</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-md ${cfg.badge}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
            {roleBadge}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {links.map(({ href, label, Icon }, i) => {
            const active = href === pathname || (href !== `/dashboard/${role}` && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-slide-in-left group flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-all duration-150
                  ${active
                    ? `${cfg.activeBg} ${cfg.activeText} shadow-sm`
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={() => setShowConfirm(true)} disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              text-slate-400 hover:bg-red-500/10 hover:text-red-400
              transition-all duration-150 disabled:opacity-50 cursor-pointer">
            <LogOut className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Logout confirm */}
      {showConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4 animate-scale-in">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Sign out?</h2>
            </div>
            <p className="text-sm text-slate-500 mb-5 pl-[52px]">You&apos;ll need to sign back in to continue.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200
                  rounded-lg hover:bg-slate-50 transition-colors cursor-pointer active:scale-95">
                Cancel
              </button>
              <button onClick={handleLogout} disabled={loggingOut}
                className="px-4 py-2 text-sm font-bold text-white
                  bg-gradient-to-r from-red-500 to-rose-500
                  rounded-lg hover:from-red-400 hover:to-rose-400
                  hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5
                  transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95">
                {loggingOut ? "Signing out..." : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}