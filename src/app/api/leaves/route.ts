import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/lib/models/Leave";
import { getAuthUser } from "@/lib/auth";

// POST — employee submits leave request
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (authUser.role !== "employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { leaveType, subject, detail, fromDate, toDate } = await req.json();

    if (!leaveType || !subject || !detail || !fromDate || !toDate)
      return NextResponse.json({ error: "All fields required" }, { status: 400 });

    await connectDB();
    const leave = await Leave.create({
      user: authUser.userId,
      leaveType,
      subject,
      detail,
      fromDate,
      toDate,
    });

    return NextResponse.json({ leave }, { status: 201 });
  } catch (err) {
    console.error("[leaves POST] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET — fetch leaves (employee: own, admin/manager: all with filters)
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const status = searchParams.get("status");

    const query: Record<string, unknown> = {};

    if (authUser.role === "employee") {
      query.user = authUser.userId;
    } else {
      if (fromDate) query.fromDate = { $gte: fromDate };
      if (toDate) query.toDate = { $lte: toDate };
    }

    if (status && status !== "all") query.status = status;

    const leaves = await Leave.find(query)
      .populate("user", "name email")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });

    return NextResponse.json({ leaves });
  } catch (err) {
    console.error("[leaves GET] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}