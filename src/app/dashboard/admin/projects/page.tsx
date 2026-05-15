"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Link from "next/link";

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
    name: "",
    description: "",
    status: "active",
    managers: [] as string[],
    employees: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, uRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/users"),
    ]);
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
      name: p.name,
      description: p.description,
      status: p.status,
      managers: p.managers.map((m) => m._id),
      employees: p.employees.map((e) => e._id),
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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? All tasks will also be removed.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Create and manage projects</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + New Project
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-4xl mb-3">📁</p>
          <p className="text-slate-600 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started</p>
          <button onClick={openCreate} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p._id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{p.name}</h3>
                  {p.description && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{p.description}</p>
                  )}
                </div>
                <Badge variant={p.status} />
              </div>

              <div className="space-y-2 mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Managers</p>
                  <p className="text-sm text-slate-700">
                    {p.managers.length > 0
                      ? p.managers.map((m) => m.name).join(", ")
                      : "None assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Employees</p>
                  <p className="text-sm text-slate-700">
                    {p.employees.length > 0
                      ? `${p.employees.length} employee${p.employees.length !== 1 ? "s" : ""}`
                      : "None assigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 text-sm text-center py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                >
                  Edit
                </button>
                <Link
                  href={`/dashboard/admin/projects/${p._id}`}
                  className="flex-1 text-sm text-center py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-blue-600"
                >
                  View Tasks
                </Link>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="flex-1 text-sm text-center py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={editProject ? "Edit Project" : "New Project"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Assign Managers */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Managers</label>
              {managerUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No managers available. Create manager users first.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {managerUsers.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={form.managers.includes(u._id)}
                        onChange={() => setForm({ ...form, managers: toggleSelect(form.managers, u._id) })}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Assign Employees */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
              {employeeUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No employees available.</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {employeeUsers.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={form.employees.includes(u._id)}
                        onChange={() => setForm({ ...form, employees: toggleSelect(form.employees, u._id) })}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving..." : editProject ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
