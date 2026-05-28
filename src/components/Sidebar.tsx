"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface SidebarProps {
  role: "admin" | "manager" | "employee";
  name: string;
  email: string;
}

const roleColors = {
  admin: "bg-indigo-600",
  manager: "bg-emerald-600",
  employee: "bg-violet-600",
};

const adminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: "📊" },
  { href: "/dashboard/admin/projects", label: "Projects", icon: "📁" },
  { href: "/dashboard/admin/users", label: "Users", icon: "👥" },
  { href: "/dashboard/admin/performance", label: "Performance", icon: "📈" },
  { href: "/dashboard/admin/timelogs", label: "Daily Logs", icon: "🕐" },
];

const managerLinks = [
  { href: "/dashboard/manager", label: "Overview", icon: "📊" },
  { href: "/dashboard/manager/projects", label: "My Projects", icon: "📁" },
  { href: "/dashboard/manager/performance", label: "Performance", icon: "📈" },
  { href: "/dashboard/manager/timelogs", label: "Daily Logs", icon: "🕐" },
];

const employeeLinks = [
  { href: "/dashboard/employee", label: "My Tasks", icon: "✅" },
];

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links =
    role === "admin"
      ? adminLinks
      : role === "manager"
      ? managerLinks
      : employeeLinks;

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const roleBadge = {
    admin: "Admin",
    manager: "Manager",
    employee: "Employee",
  }[role];

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* ── Hamburger button (mobile only) ── */}
      <button
        aria-label="Toggle sidebar"
        onClick={() => setSidebarOpen((prev) => !prev)}
        className={`fixed top-3 left-3 z-[200] md:hidden flex flex-col items-center justify-center gap-[5px]
          w-[38px] h-[38px] rounded-lg shadow-lg transition-colors duration-200
          ${roleColors[role]} hover:opacity-90`}
      >
        {/* Line 1 */}
        <span
          className={`block w-[18px] h-[2px] bg-white rounded transition-transform duration-300 origin-center
            ${sidebarOpen ? "translate-y-[7px] rotate-45" : ""}`}
        />
        {/* Line 2 */}
        <span
          className={`block w-[18px] h-[2px] bg-white rounded transition-all duration-300
            ${sidebarOpen ? "opacity-0 scale-x-0" : ""}`}
        />
        {/* Line 3 */}
        <span
          className={`block w-[18px] h-[2px] bg-white rounded transition-transform duration-300 origin-center
            ${sidebarOpen ? "-translate-y-[7px] -rotate-45" : ""}`}
        />
      </button>

      {/* ── Backdrop overlay (mobile only) ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[99] bg-black/50 md:hidden transition-opacity duration-300"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-[100]
          w-64 h-full flex-shrink-0 flex flex-col
          bg-slate-900 text-white
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className={`p-5 ${roleColors[role]}`}>
          <h1 className="text-xl font-bold tracking-tight">TimeTracker</h1>
          <p className="text-xs opacity-75 mt-0.5">Project Management</p>
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${roleColors[role]}`}
            >
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-xs text-slate-400 truncate">{email}</p>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                {roleBadge}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => {
            const active =
              link.href === pathname ||
              (link.href !== `/dashboard/${role}` &&
                pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-slate-700 text-white font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
          >
            <span>🚪</span>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* ── Logout confirmation modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80 mx-4">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              Confirm Logout
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loggingOut ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}