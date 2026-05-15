"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import Link from "next/link";
import TaskComments from "@/components/TaskComments";

interface User { _id: string; name: string; email: string; }
interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  assignedTo: User[];
  dueDate?: string;
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

interface TimeEntry {
  _id: string;
  user: { _id: string; name: string; email: string };
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "running" | "paused" | "stopped";
}

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h > 0 ? `${h}h` : null, m > 0 ? `${m}m` : null, `${sec}s`]
    .filter(Boolean)
    .join(" ");
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ManagerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeSummaries, setTimeSummaries] = useState<Record<string, TimeUserSummary[]>>({});
  const [timeEntries, setTimeEntries] = useState<Record<string, TimeEntry[]>>({});
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    assignedTo: [] as string[],
    dueDate: "",
    status: "todo",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`),
      fetch(`/api/tasks?projectId=${projectId}`),
    ]);
    const pData = await pRes.json();
    const tData = await tRes.json();

    if (!pRes.ok) { router.push("/dashboard/manager"); return; }

    setProject(pData.project);
    setTasks(tData.tasks ?? []);

    // Fetch time entries + summaries for each task
    const summaryMap: Record<string, TimeUserSummary[]> = {};
    const entriesMap: Record<string, TimeEntry[]> = {};
    await Promise.all(
      (tData.tasks ?? []).map(async (t: Task) => {
        const res = await fetch(`/api/time-entries?taskId=${t._id}`);
        const data = await res.json();
        summaryMap[t._id] = data.summary ?? [];
        entriesMap[t._id] = data.entries ?? [];
      })
    );
    setTimeSummaries(summaryMap);
    setTimeEntries(entriesMap);
    setLoading(false);
  }, [projectId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assignedTo: [], dueDate: "", status: "todo" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({
      title: t.title,
      description: t.description,
      priority: t.priority,
      assignedTo: t.assignedTo.map((u) => u._id),
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      status: t.status,
    });
    setError("");
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
    setError("");
    try {
      const url = editTask ? `/api/tasks/${editTask._id}` : "/api/tasks";
      const method = editTask ? "PUT" : "POST";
      const body = editTask
        ? { title: form.title, description: form.description, priority: form.priority, assignedTo: form.assignedTo, dueDate: form.dueDate || undefined, status: form.status }
        : { ...form, projectId, dueDate: form.dueDate || undefined };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    if (!confirm("Delete this task?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    fetchData();
  };

  const statusGroups: Array<{ label: string; value: Task["status"]; color: string }> = [
    { label: "To Do", value: "todo", color: "bg-slate-100 text-slate-700" },
    { label: "In Progress", value: "in_progress", color: "bg-blue-100 text-blue-700" },
    { label: "In Review", value: "review", color: "bg-yellow-100 text-yellow-700" },
    { label: "Completed", value: "completed", color: "bg-green-100 text-green-700" },
    { label: "On Hold", value: "on_hold", color: "bg-orange-100 text-orange-700" },
  ];

  if (loading) return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (!project) return null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/dashboard/manager" className="text-sm text-blue-600 hover:underline">
          ← Back to Projects
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && <p className="text-slate-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-3">
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

      {/* Task board */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-600 font-medium">No tasks yet</p>
          <p className="text-slate-400 text-sm mt-1">Create tasks and assign them to employees</p>
          <button onClick={openCreate} className="mt-4 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            Create First Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {statusGroups.map((group) => {
            const groupTasks = tasks.filter((t) => t.status === group.value);
            if (groupTasks.length === 0) return null;
            return (
              <div key={group.value}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${group.color}`}>
                    {group.label}
                  </span>
                  <span className="text-xs text-slate-400">{groupTasks.length} task{groupTasks.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="space-y-3">
                  {groupTasks.map((t) => {
                    const summary = timeSummaries[t._id] ?? [];
                    const totalSecs = summary.reduce((s, u) => s + u.totalSeconds, 0);
                    return (
                      <div key={t._id} className="bg-white rounded-xl border border-slate-200 p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900">{t.title}</h3>
                            {t.description && (
                              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant={t.priority} />
                            <button onClick={() => openEdit(t)} className="text-xs text-blue-600 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(t._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                          <div>
                            <span className="text-xs text-slate-400">Assigned: </span>
                            <span className="text-slate-700">
                              {t.assignedTo.length > 0
                                ? t.assignedTo.map((u) => u.name).join(", ")
                                : "Unassigned"}
                            </span>
                          </div>
                          {t.dueDate && (
                            <div>
                              <span className="text-xs text-slate-400">Due: </span>
                              <span className="text-slate-700">{new Date(t.dueDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-xs text-slate-400">Time: </span>
                            <span className="text-slate-700 font-medium">{formatSeconds(totalSecs)}</span>
                          </div>
                        </div>

                        {/* Time entries section */}
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => setExpandedTask(expandedTask === t._id ? null : t._id)}
                            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            <span>{expandedTask === t._id ? "▾" : "▸"}</span>
                            <span className="font-medium">Time Entries</span>
                            {summary.length > 0 && (
                              <span className="ml-1 text-slate-400">
                                — {summary.length} employee{summary.length !== 1 ? "s" : ""}, {formatSeconds(totalSecs)} total
                              </span>
                            )}
                            {summary.length === 0 && (
                              <span className="text-slate-400">— no time logged yet</span>
                            )}
                          </button>

                          {expandedTask === t._id && (
                            <div className="mt-3 space-y-3">
                              {summary.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No time entries for this task yet.</p>
                              ) : (
                                (() => {
                                  // Group entries by employee
                                  const byEmployee: Record<string, { user: TimeEntry["user"]; entries: TimeEntry[] }> = {};
                                  (timeEntries[t._id] ?? []).forEach((e) => {
                                    const uid = e.user._id;
                                    if (!byEmployee[uid]) byEmployee[uid] = { user: e.user, entries: [] };
                                    byEmployee[uid].entries.push(e);
                                  });

                                  return Object.values(byEmployee).map(({ user, entries }) => {
                                    const empTotal = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
                                    return (
                                      <div key={user._id} className="bg-slate-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                              {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-medium text-slate-800">{user.name}</span>
                                            <span className="text-xs text-slate-400">{user.email}</span>
                                          </div>
                                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            {formatSeconds(empTotal)} total
                                          </span>
                                        </div>
                                        <div className="space-y-1.5 pl-8">
                                          {entries.map((e) => (
                                            <div key={e._id} className="flex items-center justify-between text-xs">
                                              <div className="text-slate-500">
                                                <span className="font-medium text-slate-700">{formatDate(e.startTime)}</span>
                                                <span className="mx-1">·</span>
                                                <span>{formatTime(e.startTime)}</span>
                                                {e.endTime && (
                                                  <>
                                                    <span className="mx-1 text-slate-400">→</span>
                                                    <span>{formatTime(e.endTime)}</span>
                                                  </>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {e.duration != null && (
                                                  <span className="font-mono text-slate-700">{formatDuration(e.duration)}</span>
                                                )}
                                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                  e.status === "running"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : e.status === "paused"
                                                    ? "bg-yellow-100 text-yellow-600"
                                                    : "bg-slate-200 text-slate-500"
                                                }`}>
                                                  {e.status}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()
                              )}
                            </div>
                          )}
                        </div>

                        {/* Comments */}
                        <div className="mt-3">
                          <TaskComments taskId={t._id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editTask ? "Edit Task" : "New Task"} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
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
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">In Review</option>
                  <option value="completed">Completed</option>
                  <option value="on_hold">On Hold</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Employees</label>
              {project.employees.length === 0 ? (
                <p className="text-xs text-slate-400">No employees in this project.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {project.employees.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={form.assignedTo.includes(u._id)}
                        onChange={() => toggleEmployee(u._id)}
                        className="rounded border-slate-300 text-emerald-600"
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
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Saving..." : editTask ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
