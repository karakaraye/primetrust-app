import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]);
    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action");
    const entityType = searchParams.get("entityType");
    const branchId = searchParams.get("branchId");
    const limit = Number(searchParams.get("limit")) || 100;

    const where: any = {};
    if (user.role === "BRANCH_ADMIN" && user.branchId) {
      where.branchId = user.branchId;
    } else if (branchId && branchId !== "ALL") {
      where.branchId = branchId;
    }

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }

    const auditLogs = await db.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ auditLogs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
