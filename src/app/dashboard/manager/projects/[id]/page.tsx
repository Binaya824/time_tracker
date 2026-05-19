"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Link from "next/link";

const TASKS_PER_PAGE = 10;

interface User { _id: string; name: string; email: string; }
interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  type: "Feature" | "Bug" | "Research" | "Improvement" | "Deployment" | "Testing" | "Others";
  allowEmployeeStatusUpdate: boolean;
  assignedTo: User[];
  dueDate?: string;
  dueHour?: number;
  createdAt: string;
}
interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  employees: User[];
}
interface TimeUserSummary {
  name: string;
  email: string;
  totalSeconds: number;
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function ManagerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium",
    assignedTo: [] as string[], dueDate: "", dueHour: "",
    status: "todo", type: "Others", allowEmployeeStatusUpdate: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Task detail modal
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailSummary, setDetailSummary] = useState<TimeUserSummary[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalPages = Math.ceil(totalTasks / TASKS_PER_PAGE);

  const fetchTasks = useCallback(async (page: number) => {
    const res = await fetch(`/api/tasks?projectId=${projectId}&page=${page}&limit=${TASKS_PER_PAGE}`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setTotalTasks(data.total ?? 0);
  }, [projectId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const pRes = await fetch(`/api/projects/${projectId}`);
    if (!pRes.ok) { router.push("/dashboard/manager/projects"); return; }
    const pData = await pRes.json();
    setProject(pData.project);
    await fetchTasks(taskPage);
    setLoading(false);
  }, [projectId, router, fetchTasks, taskPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePageChange = async (newPage: number) => {
    setTaskPage(newPage);
    setLoading(true);
    await fetchTasks(newPage);
    setLoading(false);
  };

  // Open task detail modal
  const openDetail = async (t: Task) => {
    setDetailTask(t);
    setDetailSummary([]);
    setLoadingDetail(true);
    const res = await fetch(`/api/time-entries?taskId=${t._id}`);
    const data = await res.json();
    setDetailSummary(data.summary ?? []);
    setLoadingDetail(false);
  };

  // Create / Edit modal
  const openCreate = () => {
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assignedTo: [], dueDate: "", dueHour: "", status: "todo", type: "Others", allowEmployeeStatusUpdate: true });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (t: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTask(t);
    setForm({
      title: t.title, description: t.description, priority: t.priority,
      assignedTo: t.assignedTo.map((u) => u._id),
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      dueHour: t.dueHour != null ? String(t.dueHour) : "",
      status: t.status, type: t.type || "Others",
      allowEmployeeStatusUpdate: t.allowEmployeeStatusUpdate ?? true,
    });
    setFormError("");
    setShowModal(true);
  };

  const toggleEmployee = (id: string) => {
    setForm((f) => ({
      ...f,
      assignedTo: f.assignedTo.includes(id)
        ? f.assignedTo.filter((x) => x !== id)
        : [...f.assignedTo, id],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const url = editTask ? `/api/tasks/${editTask._id}` : "/api/tasks";
      const method = editTask ? "PUT" : "POST";
      const body = editTask
        ? { title: form.title, description: form.description, priority: form.priority, type: form.type, allowEmployeeStatusUpdate: form.allowEmployeeStatusUpdate, assignedTo: form.assignedTo, dueDate: form.dueDate || undefined, dueHour: form.dueHour ? Number(form.dueHour) : undefined, status: form.status }
        : { ...form, projectId, dueDate: form.dueDate || undefined, dueHour: form.dueHour ? Number(form.dueHour) : undefined };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowModal(false);
      await fetchTasks(taskPage);
      const pRes = await fetch(`/api/projects/${projectId}`);
      const pData = await pRes.json();
      setProject(pData.project);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    const newTotal = totalTasks - 1;
    const newTotalPages = Math.ceil(newTotal / TASKS_PER_PAGE);
    const newPage = taskPage > newTotalPages && newTotalPages > 0 ? newTotalPages : taskPage;
    setTaskPage(newPage);
    await fetchTasks(newPage);
    setTotalTasks((t) => t - 1);
  };

  if (loading && !project) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!project) return null;

  return (
    <div className="p-8">
      <div className="mb-5">
        <Link href="/dashboard/manager/projects" className="text-sm text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
      </div>

      {/* Project header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && <p className="text-slate-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={project.status as "active" | "completed" | "on_hold"} />
            <span className="text-sm text-slate-500">{project.employees.length} employees</span>
            <button
              onClick={openCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + New Task
            </button>
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Tasks</h2>
          <span className="text-xs text-slate-400">{totalTasks} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-3">No tasks yet</p>
            <button onClick={openCreate} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
              Create First Task
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3 font-medium">Title</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Priority</th>
                <th className="text-left px-5 py-3 font-medium">Type</th>
                <th className="text-left px-5 py-3 font-medium">Assigned To</th>
                <th className="text-left px-5 py-3 font-medium">Due Date</th>
                <th className="text-right px-5 py-3 font-medium">Est. Hrs</th>
                <th className="text-right px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((t) => (
                <tr
                  key={t._id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => openDetail(t)}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{t.title}</p>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>}
                  </td>
                  <td className="px-5 py-3"><Badge variant={t.status} /></td>
                  <td className="px-5 py-3"><Badge variant={t.priority} /></td>
                  <td className="px-5 py-3"><Badge variant={t.type as any} /></td>
                  <td className="px-5 py-3 text-slate-600">
                    {t.assignedTo.length > 0
                      ? t.assignedTo.map((u) => (
                          <span key={u._id} className="inline-block bg-slate-100 text-slate-700 text-xs rounded-full px-2 py-0.5 mr-1 mb-0.5">
                            {u.name}
                          </span>
                        ))
                      : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">
                    {t.dueHour ? `${t.dueHour}h` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => openEdit(t, e)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => handleDelete(t._id, e)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {(taskPage - 1) * TASKS_PER_PAGE + 1}–{Math.min(taskPage * TASKS_PER_PAGE, totalTasks)} of {totalTasks}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(taskPage - 1)}
                disabled={taskPage === 1}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => handlePageChange(n)}
                  className={`w-8 h-8 text-sm rounded-lg font-medium ${
                    n === taskPage
                      ? "bg-emerald-600 text-white"
                      : "border border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(taskPage + 1)}
                disabled={taskPage === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {detailTask && (
        <Modal title="Task Details" onClose={() => setDetailTask(null)}>
          <div className="space-y-5">
            {/* Task info */}
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">{detailTask.title}</h3>
              {detailTask.description && <p className="text-sm text-slate-500">{detailTask.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Status</p>
                <Badge variant={detailTask.status} />
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Priority</p>
                <Badge variant={detailTask.priority} />
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Due Date</p>
                <p className="text-slate-700 font-medium">
                  {detailTask.dueDate
                    ? new Date(detailTask.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">Est. Hours</p>
                <p className="text-slate-700 font-medium">{detailTask.dueHour ? `${detailTask.dueHour}h` : "—"}</p>
              </div>
            </div>

            {/* Assigned Employees */}
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Assigned Employees ({detailTask.assignedTo.length})
              </h4>
              {detailTask.assignedTo.length === 0 ? (
                <p className="text-sm text-slate-400">No employees assigned.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                        <th className="text-left px-4 py-2 font-medium">Name</th>
                        <th className="text-left px-4 py-2 font-medium">Email</th>
                        <th className="text-right px-4 py-2 font-medium">Time Logged</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailTask.assignedTo.map((u) => {
                        const summary = detailSummary.find((s) => s.email === u.email);
                        return (
                          <tr key={u._id}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-slate-800">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500">{u.email}</td>
                            <td className="px-4 py-3 text-right">
                              {loadingDetail ? (
                                <span className="text-slate-300 text-xs">Loading...</span>
                              ) : summary ? (
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs">
                                  {formatSeconds(summary.totalSeconds)}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">No time logged</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Task Modal */}
      {showModal && (
        <Modal title={editTask ? "Edit Task" : "New Task"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Feature">Feature</option>
                <option value="Bug">Bug</option>
                <option value="Research">Research</option>
                <option value="Improvement">Improvement</option>
                <option value="Deployment">Deployment</option>
                <option value="Testing">Testing</option>
                <option value="Others">Others</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Est. Hours</label>
                <input type="number" min="1" placeholder="e.g. 4" value={form.dueHour}
                  onChange={(e) => setForm({ ...form, dueHour: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
              {project.employees.length === 0 ? (
                <p className="text-xs text-slate-400">No employees in this project.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {project.employees.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input type="checkbox" checked={form.assignedTo.includes(u._id)} onChange={() => toggleEmployee(u._id)}
                        className="rounded border-slate-300 text-emerald-600" />
                      <span className="text-sm text-slate-700">{u.name}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.allowEmployeeStatusUpdate}
                  onChange={(e) => setForm({ ...form, allowEmployeeStatusUpdate: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 w-4 h-4" />
                <span className="text-sm font-medium text-slate-700">Allow employees to update task status</span>
              </label>
              <p className="text-xs text-slate-500 ml-6 mt-1">If unchecked, employees cannot change the status from their dashboard.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Saving..." : editTask ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
