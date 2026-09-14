import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { branch: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
