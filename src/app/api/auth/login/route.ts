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
    return NextResponse.json(
      { error: "An unexpected error occurred during login." },
      { status: 500 }
    );
  }
}
