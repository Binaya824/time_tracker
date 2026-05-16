"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
];

const managerLinks = [
  { href: "/dashboard/manager", label: "Overview", icon: "📊" },
  { href: "/dashboard/manager/projects", label: "My Projects", icon: "📁" },
];

const employeeLinks = [
  { href: "/dashboard/employee", label: "My Tasks", icon: "✅" },
];

export default function Sidebar({ role, name, email }: SidebarProps) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <aside className="w-64 h-full flex-shrink-0 flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className={`p-5 ${roleColors[role]}`}>
        <h1 className="text-xl font-bold tracking-tight">TimeTracker</h1>
        <p className="text-xs opacity-75 mt-0.5">Project Management</p>
      </div>

      {/* User info */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${roleColors[role]}`}
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
            (link.href !== `/dashboard/${role}` && pathname.startsWith(link.href));
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
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors disabled:opacity-50"
        >
          <span>🚪</span>
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}
