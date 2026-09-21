import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { branch: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is currently disabled. Please contact administrator." },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const sessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "SUPER_ADMIN" | "BRANCH_ADMIN" | "OPERATIONS_STAFF",
      branchId: user.branchId,
      branchCode: user.branch?.code || null,
      branchName: user.branch?.name || null,
    };

    const token = await createSessionToken(sessionPayload);
    await setSessionCookie(token);

    // Audit log login event
    await logAudit({
      user: sessionPayload,
      action: "USER_LOGIN",
      entityType: "AUTH",
      entityId: user.id,
      branchId: user.branchId,
      branchCode: user.branch?.code,
      details: `User ${user.name} logged in successfully`,
    });

    return NextResponse.json({
      success: true,
      user: sessionPayload,
    });
  } catch (error: any) {
    console.error("Login API error:", error);
    
    // Check for Prisma/Database specific errors
    const errorMsg = error?.message || "";
    const errorCode = error?.code || "";

    if (errorCode === "P1001" || errorMsg.includes("Can't reach database server") || errorMsg.includes("connect ECONNREFUSED")) {
      return NextResponse.json(
        { 
          error: "Unable to connect to the database. Please verify your Supabase DATABASE_URL in Vercel Environment Variables.",
          code: "DB_CONNECTION_FAILED",
          details: errorMsg
        },
        { status: 503 }
      );
    }

    if (errorCode === "P1000" || errorMsg.includes("Authentication failed")) {
      return NextResponse.json(
        { 
          error: "Database authentication failed. Please check your Supabase database password in DATABASE_URL.",
          code: "DB_AUTH_FAILED"
        },
        { status: 503 }
      );
    }

    if (errorCode === "P2021" || errorMsg.includes("does not exist")) {
      return NextResponse.json(
        { 
          error: "Database tables not initialized. Please run the SQL schema in your Supabase SQL Editor.",
          code: "DB_TABLES_MISSING"
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || "An unexpected error occurred during login.",
        code: errorCode || "INTERNAL_ERROR"
      },
      { status: 500 }
    );
  }
}
