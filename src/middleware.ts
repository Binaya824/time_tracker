import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await verifyToken(token);

  if (!user) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete("auth_token");
    return res;
  }

  // Role-based route protection
  if (pathname.startsWith("/dashboard/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
  }
  if (pathname.startsWith("/dashboard/manager") && user.role !== "manager") {
    return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
  }
  if (pathname.startsWith("/dashboard/employee") && user.role !== "employee") {
    return NextResponse.redirect(new URL(`/dashboard/${user.role}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/((?!auth/login|auth/reset-password).*)"],
};
