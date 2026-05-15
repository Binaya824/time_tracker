import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";
import { getAuthUser } from "@/lib/auth";

// GET /api/projects - Role-filtered list
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    let filter: Record<string, unknown> = {};
    if (authUser.role === "manager") {
      filter = { managers: authUser.userId };
    } else if (authUser.role === "employee") {
      filter = { employees: authUser.userId };
    }

    const projects = await Project.find(filter)
      .populate("createdBy", "name email")
      .populate("managers", "name email")
      .populate("employees", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/projects - Admin only
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { name, description, managers, employees } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await Project.create({
      name,
      description: description ?? "",
      managers: managers ?? [],
      employees: employees ?? [],
      createdBy: authUser.userId,
    });

    const populated = await project.populate([
      { path: "createdBy", select: "name email" },
      { path: "managers", select: "name email" },
      { path: "employees", select: "name email" },
    ]);

    return NextResponse.json({ project: populated }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
