"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Badge from "@/components/Badge";
import DailyTimer from "@/components/DailyTimer";
import InlineTimer from "@/components/InlineTimer";
import TimeLog from "@/components/TimeLog";
import Modal from "@/components/Modal";
import TaskComments from "@/components/TaskComments";
import { Search, SlidersHorizontal, MessageSquare, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

interface Task {
  _id: string;
  taskNo?: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  type: string;
  allowEmployeeStatusUpdate?: boolean;
  dueDate?: string;
  dueHour?: number;
  project: { _id: string; name: string };
  assignedTo: { _id: string; name: string }[];
}

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-slate-300",
};

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "comments">("log");

  const [timerRefreshTick, setTimerRefreshTick] = useState(0);
  const handleTimerAction = useCallback(() => setTimerRefreshTick((n) => n + 1), []);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 400);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/tasks?${params.toString()}`);
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setTotal(data.total ?? 0);
    setTotalPages(data.totalPages ?? 1);
    setLoading(false);
  }, [debouncedSearch, statusFilter, priorityFilter, typeFilter, page]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleFilterChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setter(e.target.value);
    setPage(1);
  };

  const openLogModal = (task: Task, tab: "log" | "comments" = "log") => {
    setSelectedTask(task);
    setActiveTab(tab);
  };

  const updateStatus = async (taskId: string, status: string) => {
    setUpdatingStatus(taskId);
    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchTasks();
    setUpdatingStatus(null);
  };

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">

      {/* Page header */}
      <div className="mb-5 sm:mb-6">
        <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">Employee</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Tasks</h1>
        <p className="text-slate-500 mt-1 text-sm">Track your work and log time</p>
      </div>

      <DailyTimer />

      {/* Tasks section */}
      <div>
        {/* Search + Filters */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-sm font-medium text-slate-600">
              {total} {total === 1 ? "task" : "tasks"} found
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {/* Search */}
            <div className="relative flex-1 sm:min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search tasks or #no..."
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <select
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="todo">Todo</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>

              <select
                value={priorityFilter}
                onChange={handleFilterChange(setPriorityFilter)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              <select
                value={typeFilter}
                onChange={handleFilterChange(setTypeFilter)}
                className="col-span-2 sm:col-span-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50 focus:bg-white transition-colors cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="Feature">Feature</option>
                <option value="Bug">Bug</option>
                <option value="Research">Research</option>
                <option value="Improvement">Improvement</option>
                <option value="Deployment">Deployment</option>
                <option value="Testing">Testing</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 animate-pulse h-36" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-card p-14 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-7 h-7 text-violet-400" strokeWidth={1.5} />
            </div>
            <p className="text-slate-700 font-semibold">No tasks found</p>
            <p className="text-slate-400 text-sm mt-1">Your manager will assign tasks to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t._id}
                className={`bg-white rounded-2xl ring-1 p-4 sm:p-5 transition-all duration-150 hover:shadow-card-hover ${
                  t.status === "in_progress"
                    ? "ring-blue-200 shadow-[0_0_0_1px_rgb(147_197_253/1)]"
                    : "ring-slate-900/5 shadow-card"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Priority dot */}
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] ?? "bg-slate-300"}`} />
                      {t.taskNo !== undefined && (
                        <span className="text-xs font-mono text-slate-400 flex-shrink-0">#{t.taskNo}</span>
                      )}
                      <h3 className="font-semibold text-slate-900 truncate">{t.title}</h3>
                    </div>
                    <p className="text-xs font-medium text-violet-600 mb-1 ml-4">{t.project.name}</p>
                    {t.description && (
                      <p className="text-sm text-slate-500 line-clamp-2 ml-4">{t.description}</p>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 flex-shrink-0 max-w-[160px] sm:max-w-none">
                    <Badge variant={t.priority} />
                    {t.type && <Badge variant={t.type as any} />}
                    <Badge variant={t.status} />
                  </div>
                </div>

                {/* Meta */}
                {(t.dueDate || t.dueHour) && (
                  <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 ml-4">
                    {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                    {!!t.dueHour && <span>Est: {t.dueHour}h</span>}
                  </div>
                )}

                {/* Inline timer */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <InlineTimer
                    taskId={t._id}
                    refreshTick={timerRefreshTick}
                    onAction={handleTimerAction}
                    readOnly={t.status === "review" || t.status === "completed"}

                  />
                </div>

                {/* Bottom action row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
                  {/* Status control */}
                  <div className="flex items-center gap-2">
                    {t.status === "completed" ? (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        Completed
                      </span>
                    ) : t.status === "review" ? (
                      <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold">
                        In Review — awaiting manager
                      </span>
                    ) : (
                      <>
                        <select
                          value={t.status}
                          onChange={(e) => updateStatus(t._id, e.target.value)}
                          disabled={updatingStatus === t._id || t.allowEmployeeStatusUpdate === false}
                          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          title={t.allowEmployeeStatusUpdate === false ? "Status updates disabled by manager" : ""}
                        >
                          <option value="todo">Todo</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">In Review</option>
                        </select>
                        {t.allowEmployeeStatusUpdate === false && (
                          <span className="text-[10px] text-slate-400 font-medium">Locked</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openLogModal(t, "log")}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 font-medium transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Time Log
                    </button>
                    <button
                      onClick={() => openLogModal(t, "comments")}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 font-medium transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500 order-2 sm:order-1">
              Page {page} of {totalPages} &mdash; {total} tasks
            </p>
            <div className="flex items-center gap-1.5 flex-wrap justify-center order-1 sm:order-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      className={`w-8 h-8 text-sm border rounded-lg transition-colors cursor-pointer ${
                        page === item
                          ? "bg-violet-600 text-white border-violet-600 font-semibold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Time Log & Comments Modal */}
      {selectedTask && (
        <Modal
          title={selectedTask.title}
          size="xl"
          onClose={() => setSelectedTask(null)}
        >
          <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50/70">
            <Badge variant={selectedTask.priority} />
            {selectedTask.type && <Badge variant={selectedTask.type as any} />}
            <Badge variant={selectedTask.status} />
            <span className="text-xs text-slate-400 sm:ml-auto mt-1 sm:mt-0 w-full sm:w-auto">
              {selectedTask.project.name}
            </span>
          </div>

          {selectedTask.description && (
            <div className="px-6 pt-4">
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                {selectedTask.description}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 px-6 pt-4 gap-1">
            {(["log", "comments"] as const).map((tab) => {
              const Icon = tab === "log" ? ClipboardList : MessageSquare;
              const labelText = tab === "log" ? "Time Log" : "Comments";
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors cursor-pointer ${
                    activeTab === tab
                      ? "border-violet-600 text-violet-600 bg-violet-50"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {labelText}
                </button>
              );
            })}
          </div>

          <div className={activeTab === "log" ? "block" : "hidden"}>
            <TimeLog taskId={selectedTask._id} refreshTick={timerRefreshTick} />
          </div>
          <div className={activeTab === "comments" ? "block" : "hidden"}>
            <div className="p-6">
              <TaskComments taskId={selectedTask._id} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
