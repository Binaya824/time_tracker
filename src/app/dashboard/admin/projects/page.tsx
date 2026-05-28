"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";
import { FolderPlus, Pencil, Trash2, ListTodo, FolderKanban, UserCog, Users } from "lucide-react";

interface User { _id: string; name: string; email: string; role: string; }
interface Project {
  _id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "on_hold";
  managers: User[];
  employees: User[];
  createdAt: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", status: "active",
    managers: [] as string[], employees: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, uRes] = await Promise.all([fetch("/api/projects"), fetch("/api/users")]);
    const pData = await pRes.json();
    const uData = await uRes.json();
    setProjects(pData.projects ?? []);
    setUsers(uData.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const managerUsers = users.filter((u) => u.role === "manager");
  const employeeUsers = users.filter((u) => u.role === "employee");

  const openCreate = () => {
    setEditProject(null);
    setForm({ name: "", description: "", status: "active", managers: [], employees: [] });
    setError("");
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({
      name: p.name, description: p.description, status: p.status,
      managers: p.managers.map((m) => m._id), employees: p.employees.map((e) => e._id),
    });
    setError("");
    setShowModal(true);
  };

  const toggleSelect = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editProject ? `/api/projects/${editProject._id}` : "/api/projects";
      const method = editProject ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setShowModal(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchData();
  };

  const statusBorderColor = (status: string) =>
    status === "active" ? "border-l-emerald-500"
    : status === "completed" ? "border-l-blue-500"
    : "border-l-amber-400";

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-slate-500 mt-1 text-sm">Create and manage projects</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <FolderPlus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-7 h-7 text-indigo-400" strokeWidth={1.5} />
          </div>
          <p className="text-slate-700 font-semibold">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started</p>
          <button
            onClick={openCreate}
            className="mt-5 inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm"
          >
            <FolderPlus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p._id}
              className={`bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card border-l-4 ${statusBorderColor(p.status)} flex flex-col hover:shadow-card-hover transition-shadow duration-200`}
            >
              {/* Card body */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-slate-900 leading-snug truncate">{p.name}</h3>
                  <Badge variant={p.status} />
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5rem] mb-4">
                  {p.description || <span className="italic text-slate-300">No description</span>}
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <UserCog className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.managers.length} manager{p.managers.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-200" />
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.employees.length} employee{p.employees.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {p.managers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.managers.map((m) => (
                      <span
                        key={m._id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium ring-1 ring-indigo-100"
                      >
                        <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-[10px] font-bold">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        {m.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center border-t border-slate-100 divide-x divide-slate-100">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-bl-2xl cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <Link
                  href={`/dashboard/admin/projects/${p._id}`}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  Tasks
                </Link>
                <button
                  onClick={() => setDeleteId(p._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded-br-2xl cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editProject ? "Edit Project" : "New Project"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4 p-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Project Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50 focus:bg-white resize-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Managers</label>
              {managerUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No managers available. Create manager users first.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 scrollbar-thin">
                  {managerUsers.map((u) => (
                    <label key={u._id} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-2.5 py-1.5 rounded-lg">
                      <input
                        type="checkbox"
                        checked={form.managers.includes(u._id)}
                        onChange={() => setForm({ ...form, managers: toggleSelect(form.managers, u._id) })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700 font-medium">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
              {employeeUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No employees available.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 scrollbar-thin">
                  {employeeUsers.map((u) => (
                    <label key={u._id} className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 px-2.5 py-1.5 rounded-lg">
                      <input
                        type="checkbox"
                        checked={form.employees.includes(u._id)}
                        onChange={() => setForm({ ...form, employees: toggleSelect(form.employees, u._id) })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700 font-medium">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Saving..." : editProject ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Project"
          message="This will permanently delete the project and all its tasks. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
