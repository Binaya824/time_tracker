"use client";

import { useState, useEffect } from "react";
import { Send, Clock, CheckCircle, XCircle, CalendarDays, Stethoscope, CalendarCheck } from "lucide-react";

interface Leave {
    _id: string;
    leaveType: "sick" | "planned";
    subject: string;
    detail: string;
    fromDate: string;
    toDate: string;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
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

export default function EmployeeLeavePage() {
    const [leaveType, setLeaveType] = useState<"sick" | "planned">("planned");
    const [subject, setSubject] = useState("");
    const [detail, setDetail] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLeaves = async () => {
        const res = await fetch("/api/leaves");
        const data = await res.json();
        setLeaves(data.leaves ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchLeaves(); }, []);

    const handleSubmit = async () => {
        if (!subject.trim() || !detail.trim() || !fromDate || !toDate) return;
        setSubmitting(true);
        const res = await fetch("/api/leaves", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leaveType, subject, detail, fromDate, toDate }),
        });
        if (res.ok) {
            setSuccess(true);
            setLeaveType("planned");
            setSubject("");
            setDetail("");
            setFromDate("");
            setToDate("");
            fetchLeaves();
            setTimeout(() => setSuccess(false), 4000);
        }
        setSubmitting(false);
    };

    return (
        <div className="w-full p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-1">Employee</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Leave Request</h1>
                <p className="text-slate-500 mt-1 text-sm">Submit and track your leave applications</p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 mb-6">
                <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Send className="w-4 h-4 text-violet-500" />
                    New Leave Application
                </h2>

                <div className="space-y-4">

                    {/* Leave Type */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Leave Type</label>

                        <div className="grid grid-cols-2 gap-2">
                            {(["sick", "planned"] as const).map((type) => {
                                const cfg = leaveTypeConfig[type];
                                const Icon = cfg.icon;
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setLeaveType(type)}
                                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${leaveType === type
                                                ? `${cfg.cls} ring-2 ring-offset-1 ${type === "sick" ? "ring-rose-400" : type === "planned" ? "ring-blue-400" : "ring-slate-400"
                                                }`
                                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g. Fever and cold, Family function..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Detail */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Detail
                            {leaveType === "planned" && (
                                <span className="ml-2 text-blue-500 font-normal">
                                    (Please apply at least 2 days in advance)
                                </span>
                            )}
                        </label>
                        <textarea
                            value={detail}
                            onChange={(e) => setDetail(e.target.value)}
                            rows={4}
                            placeholder={
                                leaveType === "sick"
                                    ? "Describe your illness or medical condition..."
                                    : leaveType === "planned"
                                        ? "Describe the reason for your planned leave..."
                                        : "Describe the reason for your leave..."
                            }
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 focus:bg-white transition-colors resize-none"
                        />
                    </div>

                    {success && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            Leave request submitted! Your request is pending approval.
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !subject.trim() || !detail.trim() || !fromDate || !toDate}
                        className="w-full sm:w-auto px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                        <Send className="w-4 h-4" />
                        {submitting ? "Submitting..." : "Submit Request"}
                    </button>
                </div>
            </div>

            {/* Leave history */}
            <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-violet-500" />
                    My Leave Requests
                </h2>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-5 animate-pulse h-24" />
                        ))}
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 p-12 text-center">
                        <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm font-medium">No leave requests yet</p>
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
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-slate-900 text-sm">{leave.subject}</h3>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border ${tCfg.cls}`}>
                                                    <TIcon className="w-3 h-3" />
                                                    {tCfg.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">{leave.fromDate} → {leave.toDate}</p>
                                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{leave.detail}</p>

                                            {/* Rejection reason */}
                                            {leave.status === "rejected" && leave.rejectionReason && (
                                                <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                                                    <p className="text-xs font-semibold text-red-600 mb-0.5">Reason for rejection:</p>
                                                    <p className="text-xs text-red-700">{leave.rejectionReason}</p>
                                                </div>
                                            )}
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border flex-shrink-0 ${sCfg.cls}`}>
                                            <SIcon className="w-3.5 h-3.5" />
                                            {sCfg.label}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-3">
                                        Submitted {new Date(leave.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}