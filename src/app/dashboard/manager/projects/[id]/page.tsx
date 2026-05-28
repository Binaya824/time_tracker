"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, ArrowLeft, Clock, Calendar,
  User, AlignLeft, Tag, Flag, Settings2, CheckSquare2,
  ChevronLeft, ChevronRight, ClipboardList,
} from "lucide-react";

const TASKS_PER_PAGE = 10;

interface User { _id: string; name: string; email: string; }
interface Task {
  _id: string; title: string; description: string;
  status: "todo" | "in_progress" | "review" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  type: "Feature" | "Bug" | "Research" | "Improvement" | "Deployment" | "Testing" | "Others";
  allowEmployeeStatusUpdate: boolean;
  assignedTo: User[]; dueDate?: string; dueHour?: number; createdAt: string;
}
interface Project { _id: string; name: string; description: string; status: string; employees: User[]; }
interface TimeUserSummary { name: string; email: string; totalSeconds: number; }

function formatSeconds(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

/* ── Shared input style ── */
const inputCls = `w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm
  text-slate-900 placeholder:text-slate-400
  focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10
  hover:border-slate-300 transition-all duration-200`;

const selectCls = `${inputCls} cursor-pointer`;

/* ── Priority visual selector ── */
const PRIORITIES = [
  { value: "low",    label: "Low",    dot: "bg-slate-400", active: "border-slate-500 bg-slate-50 text-slate-700" },
  { value: "medium", label: "Medium", dot: "bg-amber-400",  active: "border-amber-500 bg-amber-50 text-amber-700" },
  { value: "high",   label: "High",   dot: "bg-red-500",   active: "border-red-500 bg-red-50 text-red-700" },
];

/* ── Type options ── */
const TASK_TYPES = ["Feature", "Bug", "Research", "Improvement", "Deployment", "Testing", "Others"];
const TASK_STATUSES = [
  { value: "todo", label: "Todo" }, { value: "in_progress", label: "In Progress" },
  { value: "review", label: "In Review" }, { value: "completed", label: "Completed" },
  { value: "on_hold", label: "On Hold" },
];

/* ── Section header ── */
function FormSection({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2} />
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export default function ManagerProjectDetailPage() {
  const params   = useParams();
  const router   = useRouter();
  const projectId = params.id as string;

  const [project,      setProject]      = useState<Project | null>(null);
  const [tasks,        setTasks]        = useState<Task[]>([]);
  const [totalTasks,   setTotalTasks]   = useState(0);
  const [taskPage,     setTaskPage]     = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editTask,     setEditTask]     = useState<Task | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", priority: "medium",
    assignedTo: [] as string[], dueDate: "", dueHour: "",
    status: "todo", type: "Others", allowEmployeeStatusUpdate: true,
  });
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState("");
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [detailTask,   setDetailTask]   = useState<Task | null>(null);
  const [detailSummary, setDetailSummary] = useState<TimeUserSummary[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const totalPages = Math.ceil(totalTasks / TASKS_PER_PAGE);

  const fetchTasks = useCallback(async (page: number) => {
    const res = await fetch(`/api/tasks?projectId=${projectId}&page=${page}&limit=${TASKS_PER_PAGE}`);
    const data = await res.json();
    setTasks(data.tasks ?? []); setTotalTasks(data.total ?? 0);
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
    setTaskPage(newPage); setLoading(true);
    await fetchTasks(newPage); setLoading(false);
  };

  const openDetail = async (t: Task) => {
    setDetailTask(t); setDetailSummary([]); setLoadingDetail(true);
    const res = await fetch(`/api/time-entries?taskId=${t._id}`);
    const data = await res.json();
    setDetailSummary(data.summary ?? []); setLoadingDetail(false);
  };

  const openCreate = () => {
    setEditTask(null);
    setForm({ title: "", description: "", priority: "medium", assignedTo: [], dueDate: "", dueHour: "", status: "todo", type: "Others", allowEmployeeStatusUpdate: true });
    setFormError(""); setShowModal(true);
  };

  const openEdit = (t: Task, e: React.MouseEvent) => {
    e.stopPropagation(); setEditTask(t);
    setForm({
      title: t.title, description: t.description, priority: t.priority,
      assignedTo: t.assignedTo.map(u => u._id),
      dueDate: t.dueDate ? t.dueDate.slice(0, 10) : "",
      dueHour: t.dueHour != null ? String(t.dueHour) : "",
      status: t.status, type: t.type || "Others",
      allowEmployeeStatusUpdate: t.allowEmployeeStatusUpdate ?? true,
    });
    setFormError(""); setShowModal(true);
  };

  const toggleEmployee = (id: string) =>
    setForm(f => ({
      ...f,
      assignedTo: f.assignedTo.includes(id)
        ? f.assignedTo.filter(x => x !== id)
        : [...f.assignedTo, id],
    }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setFormError("");
    try {
      const url    = editTask ? `/api/tasks/${editTask._id}` : "/api/tasks";
      const method = editTask ? "PUT" : "POST";
      const body   = editTask
        ? { title: form.title, description: form.description, priority: form.priority, type: form.type, allowEmployeeStatusUpdate: form.allowEmployeeStatusUpdate, assignedTo: form.assignedTo, dueDate: form.dueDate || undefined, dueHour: form.dueHour ? Number(form.dueHour) : undefined, status: form.status }
        : { ...form, projectId, dueDate: form.dueDate || undefined, dueHour: form.dueHour ? Number(form.dueHour) : undefined };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "Failed"); return; }
      setShowModal(false);
      await fetchTasks(taskPage);
      const pRes = await fetch(`/api/projects/${projectId}`);
      setProject((await pRes.json()).project);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTaskId) return;
    await fetch(`/api/tasks/${deleteTaskId}`, { method: "DELETE" });
    setDeleteTaskId(null);
    const newTotal = totalTasks - 1;
    const newTotalPages = Math.ceil(newTotal / TASKS_PER_PAGE);
    const newPage = taskPage > newTotalPages && newTotalPages > 0 ? newTotalPages : taskPage;
    setTaskPage(newPage); await fetchTasks(newPage); setTotalTasks(t => t - 1);
  };

  if (loading && !project)
    return <div className="p-8 text-center"><div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" /></div>;
  if (!project) return null;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* Back */}
      <div className="mb-5">
        <Link href="/dashboard/manager/projects"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
      </div>

      {/* Project header card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 mb-5 shadow-sm animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500
                flex items-center justify-center flex-shrink-0 shadow-sm">
                <ClipboardList className="w-4.5 h-4.5 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{project.name}</h1>
                {project.description && <p className="text-slate-500 text-sm mt-0.5">{project.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            <Badge variant={project.status as "active" | "completed" | "on_hold"} />
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <User className="w-3.5 h-3.5" /> {project.employees.length} members
            </span>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500
                hover:from-emerald-400 hover:to-teal-400 text-white px-4 py-2 rounded-lg text-sm font-bold
                hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5
                transition-all duration-200 cursor-pointer active:scale-95 shadow-sm">
              <Plus className="w-4 h-4" /> New Task
            </button>
          </div>
        </div>
      </div>

      {/* Tasks card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-fade-in-up delay-75">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Tasks</h2>
          <span className="text-xs text-slate-400 font-medium">{totalTasks} total</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6 text-slate-300" strokeWidth={1.5} />
            </div>
            <p className="text-slate-500 font-semibold mb-1">No tasks yet</p>
            <p className="text-slate-400 text-sm mb-4">Create the first task for this project</p>
            <button onClick={openCreate}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                px-5 py-2.5 rounded-lg text-sm font-bold hover:from-emerald-400 hover:to-teal-400
                hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-200 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" /> Create First Task
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    {["Title", "Status", "Priority", "Type", "Assigned To", "Due Date", "Est.", "Actions"].map((h, i) => (
                      <th key={h} className={`px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest
                        ${i >= 6 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.map((t, i) => (
                    <tr key={t._id}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors duration-100 animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                      onClick={() => openDetail(t)}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{t.title}</p>
                        {t.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>}
                      </td>
                      <td className="px-5 py-3.5"><Badge variant={t.status} /></td>
                      <td className="px-5 py-3.5"><Badge variant={t.priority} /></td>
                      <td className="px-5 py-3.5"><Badge variant={t.type as any} /></td>
                      <td className="px-5 py-3.5">
                        {t.assignedTo.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.assignedTo.map(u => (
                              <span key={u._id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] rounded-md font-medium">
                                <span className="w-4 h-4 rounded bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-[9px] font-bold text-white">
                                  {u.name.charAt(0).toUpperCase()}
                                </span>
                                {u.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500 text-xs">{t.dueHour ? `${t.dueHour}h` : "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={e => openEdit(t, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 cursor-pointer active:scale-90">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteTaskId(t._id); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150 cursor-pointer active:scale-90">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {tasks.map(t => (
                <div key={t._id} className="p-4 cursor-pointer hover:bg-slate-50/70 transition-colors" onClick={() => openDetail(t)}>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{t.title}</p>
                      {t.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={e => openEdit(t, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer active:scale-90">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteTaskId(t._id); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer active:scale-90">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <Badge variant={t.status} /><Badge variant={t.priority} /><Badge variant={t.type as any} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                    {t.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(t.dueDate).toLocaleDateString()}</span>}
                    {t.dueHour && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.dueHour}h est.</span>}
                    {t.assignedTo.length > 0 && <span>{t.assignedTo.map(u => u.name.split(" ")[0]).join(", ")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              {(taskPage - 1) * TASKS_PER_PAGE + 1}–{Math.min(taskPage * TASKS_PER_PAGE, totalTasks)} of {totalTasks}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => handlePageChange(taskPage - 1)} disabled={taskPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => handlePageChange(n)}
                  className={`w-8 h-8 text-xs rounded-lg font-semibold transition-all cursor-pointer active:scale-95
                    ${n === taskPage ? "bg-emerald-600 text-white shadow-sm" : "border border-slate-200 text-slate-600 hover:bg-white"}`}>
                  {n}
                </button>
              ))}
              <button onClick={() => handlePageChange(taskPage + 1)} disabled={taskPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Task Detail Modal ── */}
      {detailTask && (
        <Modal title="Task Details" onClose={() => setDetailTask(null)}>
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{detailTask.title}</h3>
              {detailTask.description && <p className="text-sm text-slate-500">{detailTask.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Status",     content: <Badge variant={detailTask.status} /> },
                { label: "Priority",   content: <Badge variant={detailTask.priority} /> },
                { label: "Type",       content: <Badge variant={detailTask.type as any} /> },
                { label: "Est. Hours", content: <span className="text-sm font-semibold text-slate-700">{detailTask.dueHour ? `${detailTask.dueHour}h` : "—"}</span> },
                { label: "Due Date",   content: <span className="text-sm font-semibold text-slate-700">{detailTask.dueDate ? new Date(detailTask.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}</span> },
              ].map(item => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{item.label}</p>
                  {item.content}
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                Assigned Employees ({detailTask.assignedTo.length})
              </p>
              {detailTask.assignedTo.length === 0 ? (
                <p className="text-sm text-slate-400">No employees assigned.</p>
              ) : (
                <div className="space-y-2">
                  {detailTask.assignedTo.map(u => {
                    const summary = detailSummary.find(s => s.email === u.email);
                    return (
                      <div key={u._id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500
                            flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        <div>
                          {loadingDetail
                            ? <span className="text-slate-300 text-xs">Loading...</span>
                            : summary
                              ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md ring-1 ring-emerald-200">{formatSeconds(summary.totalSeconds)}</span>
                              : <span className="text-xs text-slate-400">No time logged</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create / Edit Task Modal ── */}
      {showModal && (
        <Modal title={editTask ? "Edit Task" : "New Task"} size="xl" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="p-6 space-y-6">

            {formError && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm animate-scale-in">
                {formError}
              </div>
            )}

            {/* ── Section: Task Info ── */}
            <div className="space-y-4">
              <FormSection icon={AlignLeft} title="Task Info" />

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="What needs to be done?"
                  className={inputCls} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Add more details about this task..."
                  className={`${inputCls} resize-none`} />
              </div>

              {/* Priority — visual selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Priority</label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setForm({ ...form, priority: p.value })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold
                        transition-all duration-150 cursor-pointer
                        ${form.priority === p.value ? `${p.active} border-current` : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status + Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={selectCls}>
                    {TASK_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={selectCls}>
                    {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section: Scheduling ── */}
            <div className="space-y-4">
              <FormSection icon={Calendar} title="Scheduling" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="date" value={form.dueDate}
                      onChange={e => setForm({ ...form, dueDate: e.target.value })}
                      className={`${inputCls} pl-9`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Estimated Hours</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type="number" min="1" placeholder="e.g. 4"
                      value={form.dueHour}
                      onChange={e => setForm({ ...form, dueHour: e.target.value })}
                      className={`${inputCls} pl-9`} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section: Team ── */}
            <div className="space-y-3">
              <FormSection icon={User} title="Team" />
              {project.employees.length === 0 ? (
                <p className="text-sm text-slate-400">No employees in this project.</p>
              ) : (
                <>
                  <p className="text-xs text-slate-400">
                    {form.assignedTo.length === 0 ? "No one assigned yet" : `${form.assignedTo.length} assigned`}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {project.employees.map(u => {
                      const selected = form.assignedTo.includes(u._id);
                      return (
                        <button key={u._id} type="button" onClick={() => toggleEmployee(u._id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left
                            transition-all duration-150 cursor-pointer group
                            ${selected
                              ? "border-emerald-500 bg-emerald-50"
                              : "border-slate-200 bg-white hover:border-slate-300"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                            transition-all duration-150
                            ${selected ? "bg-gradient-to-br from-emerald-500 to-teal-500" : "bg-slate-300 group-hover:bg-slate-400"}`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-semibold truncate ${selected ? "text-emerald-800" : "text-slate-700"}`}>{u.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                          {selected && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                              <CheckSquare2 className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── Section: Settings ── */}
            <div className="space-y-3">
              <FormSection icon={Settings2} title="Settings" />
              <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-lg
                hover:bg-slate-50 cursor-pointer transition-colors group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox"
                    checked={form.allowEmployeeStatusUpdate}
                    onChange={e => setForm({ ...form, allowEmployeeStatusUpdate: e.target.checked })}
                    className="peer sr-only" />
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all duration-150
                    ${form.allowEmployeeStatusUpdate ? "bg-emerald-500 border-emerald-500" : "bg-white border-slate-300 group-hover:border-slate-400"}`}>
                    {form.allowEmployeeStatusUpdate && <CheckSquare2 className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Allow employees to update task status</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    If unchecked, only managers can change the task status.
                  </p>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200
                  rounded-lg hover:bg-slate-50 transition-colors cursor-pointer active:scale-95">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-lg
                  bg-gradient-to-r from-emerald-500 to-teal-500
                  hover:from-emerald-400 hover:to-teal-400 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5
                  transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm">
                {saving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  <><Plus className="w-4 h-4" />{editTask ? "Update Task" : "Create Task"}</>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTaskId && (
        <ConfirmDialog title="Delete Task"
          message="This will permanently delete the task and all its time entries. This action cannot be undone."
          onConfirm={handleDelete} onCancel={() => setDeleteTaskId(null)} />
      )}
    </div>
  );
}
