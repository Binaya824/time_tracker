"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, CheckCircle, XCircle, Clock, SlidersHorizontal, Stethoscope, CalendarCheck } from "lucide-react";

interface Leave {
    _id: string;
    leaveType: "sick" | "planned" | "other";
    subject: string;
    detail: string;
    fromDate: string;
    toDate: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
    user: { name: string; email: string };
    reviewedBy?: { name: string };
    reviewedAt?: string;
    createdAt: string;
}

const statusConfig = {
    pending: { label: "Pending", icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
    approved: { label: "Approved", icon: CheckCircle, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", icon: XCircle, cls: "bg-red-50 text-red-700 border-red-200" },
};

const leaveTypeConfig = {
    sick: { label: "Sick Leave", icon: Stethoscope, cls: "bg-rose-50 text-rose-700 border-rose-200" },
    planned: { label: "Planned Leave", icon: CalendarCheck, cls: "bg-blue-50 text-blue-700 border-blue-200" },
    other: { label: "Other", icon: CalendarDays, cls: "bg-slate-50 text-slate-700 border-slate-200" },
};

export default function ManagerLeavesPage() {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectError, setRejectError] = useState("");

    const fetchLeaves = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const res = await fetch(`/api/leaves?${params.toString()}`);
        const data = await res.json();
        setLeaves(data.leaves ?? []);
        setLoading(false);
    }, [statusFilter, fromDate, toDate]);

    useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

    const handleApprove = async (id: string) => {
        setActionLoading(id + "approved");
        await fetch(`/api/leaves/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
        });
        await fetchLeaves();
        setActionLoading(null);
    };

    const openRejectModal = (id: string) => {
        setRejectReason("");
        setRejectError("");
        setRejectModal({ id });
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            setRejectError("Please provide a reason for rejection.");
            return;
        }
        setActionLoading(rejectModal!.id + "rejected");
        await fetch(`/api/leaves/${rejectModal!.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "rejected", rejectionReason: rejectReason.trim() }),
        });
        setRejectModal(null);
        setRejectReason("");
        await fetchLeaves();
        setActionLoading(null);
    };

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Manager</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Leave Requests</h1>
                <p className="text-slate-500 mt-1 text-sm">Review and manage employee leave applications</p>
            </div>

            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Filters</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 cursor-pointer">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <div className="flex items-center gap-2 flex-1">
                        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 cursor-pointer" />
                        <span className="text-slate-400 text-sm">to</span>
                        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 cursor-pointer" />
                    </div>
                    {(fromDate || toDate || statusFilter !== "all") && (
                        <button onClick={() => { setFromDate(""); setToDate(""); setStatusFilter("all"); }}
                            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 animate-pulse h-32" />)}
                </div>
            ) : leaves.length === 0 ? (
                <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-12 text-center">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-medium">No leave requests found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {leaves.map((leave) => {
                        const sCfg = statusConfig[leave.status];
                        const SIcon = sCfg.icon;
                        const tCfg = leaveTypeConfig[leave.leaveType] ?? leaveTypeConfig.other;
                        const TIcon = tCfg.icon;
                        return (
                            <div key={leave._id} className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-5">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-900 text-sm">{leave.subject}</h3>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${sCfg.cls}`}>
                                                <SIcon className="w-3 h-3" />{sCfg.label}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${tCfg.cls}`}>
                                                <TIcon className="w-3 h-3" />{tCfg.label}
                                            </span>
                                        </div>
                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">{leave.user.name} · {leave.user.email}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                                {leave.fromDate.split("-").reverse().join("-")}
                                            </span>
                                            <span className="text-slate-400 text-xs">→</span>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
                                                {leave.toDate.split("-").reverse().join("-")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-2">{leave.detail}</p>
                                        {leave.status === "rejected" && leave.rejectionReason && (
                                            <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                                                <p className="text-xs font-semibold text-red-600 mb-0.5">Rejection reason:</p>
                                                <p className="text-xs text-red-700">{leave.rejectionReason}</p>
                                            </div>
                                        )}
                                        {leave.reviewedBy && (
                                            <p className="text-[11px] text-slate-400 mt-2">
                                                Reviewed by {leave.reviewedBy.name} · {leave.reviewedAt ? new Date(leave.reviewedAt).toLocaleDateString() : ""}
                                            </p>
                                        )}
                                    </div>
                                    {leave.status === "pending" && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button onClick={() => handleApprove(leave._id)} disabled={!!actionLoading}
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
                                                {actionLoading === leave._id + "approved" ? "..." : "Approve"}
                                            </button>
                                            <button onClick={() => openRejectModal(leave._id)} disabled={!!actionLoading}
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-400 rounded-lg transition-colors disabled:opacity-50 cursor-pointer">
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-3">
                                    Submitted {new Date(leave.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Rejection reason modal */}
            {rejectModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-900">Reject Leave Request</h2>
                                <p className="text-xs text-slate-500">Please provide a reason for rejection</p>
                            </div>
                        </div>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => { setRejectReason(e.target.value); setRejectError(""); }}
                            rows={4}
                            placeholder="Explain why this leave request is being rejected..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors resize-none"
                        />
                        {rejectError && (
                            <p className="text-xs text-red-600 mt-1.5 font-medium">{rejectError}</p>
                        )}
                        <div className="flex gap-3 justify-end mt-4">
                            <button onClick={() => setRejectModal(null)}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={handleReject} disabled={!!actionLoading}
                                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-400 rounded-xl transition-colors disabled:opacity-50 cursor-pointer">
                                {actionLoading ? "Rejecting..." : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}