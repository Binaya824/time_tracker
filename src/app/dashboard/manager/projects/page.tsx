"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";

const PAGE_SIZE = 8;

interface User { _id: string; name: string; email: string; }
interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  managers: User[];
  employees: User[];
  createdAt: string;
}

export default function ManagerProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => { setProjects(d.projects ?? []); setLoading(false); });
  }, []);

  const totalPages = Math.ceil(projects.length / PAGE_SIZE);
  const paged = projects.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
        <p className="text-slate-500 mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""} assigned to you</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No projects assigned yet.
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3 font-medium">Project</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Managers</th>
                  <th className="text-center px-5 py-3 font-medium">Employees</th>
                  <th className="text-left px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/manager/projects/${p._id}`)}
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={p.status as "active" | "completed" | "on_hold"} />
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {p.managers.map((m) => m.name).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                        {p.employees.length}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-emerald-600 font-medium text-xs hover:underline">Manage →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, projects.length)} of {projects.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 text-sm rounded-lg font-medium ${
                      n === page
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
