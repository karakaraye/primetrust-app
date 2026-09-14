import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "logistics-ops-secret-key-2026-super-secure-token-998811"
);

const SESSION_COOKIE_NAME = "logistics_session";

// Public routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/quick-switch", "/api/search"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, api auth, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    PUBLIC_PATHS.includes(pathname)
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // If accessing an API route without session, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Otherwise redirect to login
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = (payload.role as string) || "OPERATIONS_STAFF";

    // Desk Operators (OPERATIONS_STAFF) are not allowed to access Dashboard and Customers
    if (userRole === "OPERATIONS_STAFF") {
      if (pathname === "/dashboard" || pathname === "/customers") {
        const waybillsUrl = new URL("/waybills", req.url);
        return NextResponse.redirect(waybillsUrl);
      }
      if (pathname === "/api/customers") {
        return NextResponse.json(
          { error: "Forbidden: Customer management directory is restricted to Administrators." },
          { status: 403 }
        );
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Session expired or invalid" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
