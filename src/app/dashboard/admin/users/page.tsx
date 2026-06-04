"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { UserPlus, Pencil, Trash2, Users } from "lucide-react";

interface User { _id: string; name: string; email: string; role: "admin" | "manager" | "employee"; createdAt: string; }

const inputCls = `w-full px-4 py-3 rounded-xl border border-white/60
  bg-white text-sm text-slate-900 placeholder:text-slate-400
  focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15
  focus:bg-white hover:border-slate-300
  transition-all duration-200`;

const avatarGrad = (role: string) =>
  role === "admin" ? "from-indigo-500 to-violet-500" :
  role === "manager" ? "from-emerald-500 to-teal-500" : "from-violet-500 to-purple-500";

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
    const data = await (await fetch("/api/users")).json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => { setEditUser(null); setForm({ name: "", email: "", password: "", role: "employee" }); setError(""); setShowModal(true); };
  const openEdit = (u: User) => { setEditUser(u); setForm({ name: u.name, email: u.email, password: "", role: u.role }); setError(""); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const url = editUser ? `/api/users/${editUser._id}` : "/api/users";
      const body = editUser ? { name: form.name, role: form.role } : form;
      const res = await fetch(url, { method: editUser ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setShowModal(false); fetchUsers();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/users/${deleteId}`, { method: "DELETE" });
    setDeleteId(null); fetchUsers();
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-7 gap-4 animate-fade-in-up">
        <div>
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1.5">Admin Portal</p>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Users</h1>
          <p className="text-slate-500 mt-1">Manage your team members and roles</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
            bg-gradient-to-r from-indigo-600 to-violet-600
            hover:from-indigo-500 hover:to-violet-500 hover:shadow-xl hover:shadow-indigo-500/35 hover:-translate-y-0.5
            transition-all duration-200 cursor-pointer active:scale-95 shadow-lg shadow-indigo-500/25
            self-start sm:self-auto">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in-up delay-150">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7 text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-400 font-medium">No users found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {["Name", "Email", "Role", "Joined", "Actions"].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest
                        ${i === 4 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/30">
                  {users.map((u, i) => (
                    <tr key={u._id} className="group hover:bg-slate-50 transition-all duration-150 animate-fade-in-up"
                      style={{ animationDelay: `${i * 50}ms` }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGrad(u.role)}
                            flex items-center justify-center text-sm font-bold text-white flex-shrink-0
                            shadow-md group-hover:scale-110 transition-transform duration-200`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-slate-900">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{u.email}</td>
                      <td className="px-6 py-4"><Badge variant={u.role} /></td>
                      <td className="px-6 py-4 text-sm text-slate-400 tabular-nums">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)}
                            className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50/80
                              transition-all duration-150 cursor-pointer active:scale-90" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteId(u._id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50/80
                              transition-all duration-150 cursor-pointer active:scale-90" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-white/30">
              {users.map((u, i) => (
                <div key={u._id} className="p-4 flex items-start gap-3 animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarGrad(u.role)}
                    flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-md`}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                      <Badge variant={u.role} />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{u.email}</p>
                    <p className="text-xs text-slate-400 mt-1">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center gap-3 mt-2.5">
                      <button onClick={() => openEdit(u)} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 cursor-pointer">
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button onClick={() => setDeleteId(u._id)} className="inline-flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-400 cursor-pointer">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editUser ? "Edit User" : "Add New User"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-5 p-6">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
              <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="John Doe" />
            </div>
            {!editUser && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                  <input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={inputCls} placeholder="••••••••" />
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Role</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className={`${inputCls} cursor-pointer`}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-semibold border border-slate-200/60 rounded-xl
                  bg-white hover:bg-slate-50 text-slate-600 transition-all duration-150 cursor-pointer active:scale-95">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2.5 text-sm font-bold text-white rounded-xl
                  bg-gradient-to-r from-indigo-600 to-violet-600
                  hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5
                  transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-95">
                {saving ? "Saving..." : editUser ? "Update User" : "Create User"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteId && (
        <ConfirmDialog title="Delete User"
          message="This will permanently delete the user account. This action cannot be undone."
          onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
      )}
    </div>
  );
}
