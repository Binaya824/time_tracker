import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/lib/models/Leave";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (authUser.role === "employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { status, rejectionReason } = await req.json();
    if (!["approved", "rejected"].includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });

    if (status === "rejected" && !rejectionReason?.trim())
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });

    await connectDB();

    const updateData: Record<string, unknown> = {
      status,
      reviewedBy: authUser.userId,
      reviewedAt: new Date(),
    };
    if (status === "rejected") updateData.rejectionReason = rejectionReason.trim();

    const leave = await Leave.findByIdAndUpdate(params.id, updateData, { new: true })
      .populate("user", "name email")
      .populate("reviewedBy", "name");

    if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ leave });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}