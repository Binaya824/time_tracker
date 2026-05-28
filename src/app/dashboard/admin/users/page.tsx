"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "employee" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editUser ? `/api/users/${editUser._id}` : "/api/users";
      const method = editUser ? "PUT" : "POST";
      const body = editUser ? { name: form.name, role: form.role } : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }

      setShowModal(false);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    fetchUsers();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-6 sm:mb-8 gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Manage team members</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Add User
        </button>
      </div>

      {/* ── Desktop table / Mobile card list ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No users found</div>
        ) : (
          <>
            {/* Desktop table — hidden on small screens */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <Badge variant={u.role} />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(u._id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list — shown only on small screens */}
            <div className="sm:hidden divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u._id} className="p-4 flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                      <Badge variant={u.role} />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(u._id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <Modal
          title={editUser ? "Edit User" : "Create User"}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {!editUser && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editUser ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete confirmation ── */}
      {deleteId && (
        <ConfirmDialog
          title="Delete User"
          message="This will permanently delete the user account. This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}