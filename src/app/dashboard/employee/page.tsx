"use client";

import { useState, useEffect, useCallback } from "react";
import Badge from "@/components/Badge";
import Timer from "@/components/Timer";
import Modal from "@/components/Modal";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "review" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  dueDate?: string;
  project: { _id: string; name: string };
  assignedTo: { _id: string; name: string }[];
}

export default function EmployeeDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const openTask = (task: Task) => {
    setSelectedTask(task);
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

  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const filteredTasks =
    statusFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === statusFilter);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-500 mt-1">Track your work and log time</p>
      </div>

      {/* In Progress section */}
      {inProgressTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Currently In Progress
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {inProgressTasks.map((t) => (
              <div
                key={t._id}
                className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => openTask(t)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 flex-1 truncate">{t.title}</h3>
                  <Badge variant={t.priority} />
                </div>
                <p className="text-xs text-blue-600 font-medium mb-2">{t.project.name}</p>
                {t.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{t.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                    ● In Progress
                  </span>
                  <span className="text-xs text-slate-500">Click to view timer</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            All Tasks ({filteredTasks.length})
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="all">All Status</option>
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-600 font-medium">No tasks assigned</p>
            <p className="text-slate-400 text-sm mt-1">Your manager will assign tasks to you</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((t) => (
              <div
                key={t._id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-900 truncate">{t.title}</h3>
                    </div>
                    <p className="text-xs text-violet-600 font-medium mb-1">{t.project.name}</p>
                    {t.description && (
                      <p className="text-sm text-slate-500 line-clamp-2">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <Badge variant={t.priority} />
                    <Badge variant={t.status} />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    {t.dueDate && (
                      <span className="text-xs text-slate-500">
                        Due: {new Date(t.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    {t.status !== "completed" && (
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t._id, e.target.value)}
                        disabled={updatingStatus === t._id}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-500 bg-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="todo">Todo</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">In Review</option>
                      </select>
                    )}
                  </div>
                  <button
                    onClick={() => openTask(t)}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium hover:underline"
                  >
                    Track Time →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task detail + timer modal */}
      {selectedTask && (
        <Modal
          title={selectedTask.title}
          onClose={() => {
            setSelectedTask(null);
            fetchTasks();
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={selectedTask.priority} />
              <Badge variant={selectedTask.status} />
              <span className="text-xs text-slate-500 ml-auto">{selectedTask.project.name}</span>
            </div>

            {selectedTask.description && (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                {selectedTask.description}
              </p>
            )}

            {/* Timer + Time Log (fully self-contained, no parent state) */}
            <Timer taskId={selectedTask._id} taskTitle={selectedTask.title} />
          </div>
        </Modal>
      )}
    </div>
  );
}
