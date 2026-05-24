"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Badge from "@/components/Badge";
import DailyTimer from "@/components/DailyTimer";
import InlineTimer from "@/components/InlineTimer";
import TimeLog from "@/components/TimeLog";
import Modal from "@/components/Modal";
import TaskComments from "@/components/TaskComments";

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

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state — only for Log & Comments (timer is now inline)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "comments">("log");

  // Global timer sync — when any InlineTimer fires an action, all others re-fetch
  const [timerRefreshTick, setTimerRefreshTick] = useState(0);
  const handleTimerAction = useCallback(() => setTimerRefreshTick((n) => n + 1), []);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-500 mt-1">Track your work and log time</p>
      </div>

      <DailyTimer />

      {/* All Tasks */}
      <div>
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              All Tasks ({total})
            </h2>
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name or #task no..."
              className="flex-1 min-w-[200px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <select
              value={statusFilter}
              onChange={handleFilterChange(setStatusFilter)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={typeFilter}
              onChange={handleFilterChange(setTypeFilter)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-600 font-medium">No tasks assigned</p>
            <p className="text-slate-400 text-sm mt-1">Your manager will assign tasks to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t._id}
                className={`bg-white rounded-xl border-2 p-5 transition-shadow hover:shadow-sm ${
                  t.status === "in_progress"
                    ? "border-blue-200"
                    : "border-slate-200"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {t.taskNo !== undefined && (
                        <span className="text-xs font-mono text-slate-400 flex-shrink-0">#{t.taskNo}</span>
                      )}
                      <h3 className="font-medium text-slate-900 truncate">{t.title}</h3>
                    </div>
                    <p className="text-xs text-violet-600 font-medium mb-1">{t.project.name}</p>
                    {t.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Badge variant={t.priority} />
                    {t.type && <Badge variant={t.type as any} />}
                    <Badge variant={t.status} />
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                  {!!t.dueHour && <span>Est: {t.dueHour} hr</span>}
                </div>

                {/* Timer row — always visible, per task */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <InlineTimer
                    taskId={t._id}
                    refreshTick={timerRefreshTick}
                    onAction={handleTimerAction}
                    readOnly={t.status === "review"}
                  />
                </div>

                {/* Bottom action row */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50">
                  {/* Status control */}
                  <div className="flex items-center gap-2">
                    {t.status === "completed" ? (
                      <span className="text-xs text-slate-400 italic">Completed</span>
                    ) : t.status === "review" ? (
                      <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg font-medium">
                        In Review — awaiting manager
                      </span>
                    ) : (
                      <>
                        <select
                          value={t.status}
                          onChange={(e) => updateStatus(t._id, e.target.value)}
                          disabled={updatingStatus === t._id || t.allowEmployeeStatusUpdate === false}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
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

                  {/* Log & Comments links */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openLogModal(t, "log")}
                      className="text-xs text-slate-500 hover:text-violet-600 font-medium transition-colors"
                    >
                      📋 Time Log
                    </button>
                    <button
                      onClick={() => openLogModal(t, "comments")}
                      className="text-xs text-slate-500 hover:text-violet-600 font-medium transition-colors"
                    >
                      💬 Comments
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} &mdash; {total} tasks
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
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
                      className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                        page === item
                          ? "bg-violet-600 text-white border-violet-600"
                          : "border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal — Time Log & Comments only (timer is now inline) */}
      {selectedTask && (
        <Modal
          title={selectedTask.title}
          size="xl"
          onClose={() => setSelectedTask(null)}
        >
          <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-slate-50">
            <Badge variant={selectedTask.priority} />
            {selectedTask.type && <Badge variant={selectedTask.type as any} />}
            <Badge variant={selectedTask.status} />
            <span className="text-xs text-slate-400 ml-auto">{selectedTask.project.name}</span>
          </div>

          {selectedTask.description && (
            <div className="px-6 pt-4">
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                {selectedTask.description}
              </p>
            </div>
          )}

          <div className="flex border-b border-slate-200 px-6 pt-4 gap-1">
            {(["log", "comments"] as const).map((tab) => {
              const labels = { log: "📋 Time Log", comments: "💬 Comments" };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-violet-600 text-violet-600 bg-violet-50"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {labels[tab]}
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
