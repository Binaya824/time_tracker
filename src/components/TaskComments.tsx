"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  user: { _id: string; name: string; role: "admin" | "manager" | "employee" };
}

const roleColors: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  manager: "bg-emerald-100 text-emerald-700",
  employee: "bg-violet-100 text-violet-700",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
};

interface TaskCommentsProps {
  taskId: string;
}

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  // Fetch current user once
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentUserId(d.user?._id ?? null))
      .catch(() => {});
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskIdRef.current}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments.length, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks/${taskIdRef.current}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to post comment"); return; }
      setComments((prev) => [...prev, data.comment]);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
        <span className="text-sm">💬</span>
        <h4 className="text-sm font-semibold text-slate-700">
          Comments
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-slate-400">({comments.length})</span>
          )}
        </h4>
      </div>

      {/* Comments list */}
      <div className="max-h-72 overflow-y-auto bg-white px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs text-slate-400 text-center py-4">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <>
            {comments.map((c) => {
              const isOwn = currentUserId === c.user._id;
              return (
                <div key={c._id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                  {/* Name + role + time */}
                  <div className={`flex items-center gap-1.5 mb-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        isOwn ? "bg-blue-500" : "bg-slate-400"
                      }`}
                    >
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{c.user.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[c.user.role] ?? "bg-slate-100 text-slate-600"}`}>
                      {roleLabels[c.user.role] ?? c.user.role}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      isOwn
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
                    }`}
                  >
                    {c.content}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a comment… (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {submitting ? "..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
