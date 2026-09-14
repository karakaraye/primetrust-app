import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAuth();
    const branches = await db.branch.findMany({
      include: {
        _count: {
          select: {
            users: true,
            originShipments: true,
            destinationShipments: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ branches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();

    const { name, code, address, phone, email } = body;

    if (!name || !code || !address || !phone) {
      return NextResponse.json(
        { error: "Branch name, code, address and phone are required." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await db.branch.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A branch with code "${cleanCode}" already exists.` },
        { status: 400 }
      );
    }

    const branch = await db.branch.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        address: address.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        status: "ACTIVE",
      },
    });

    await logAudit({
      user,
      action: "BRANCH_CREATED",
      entityType: "BRANCH",
      entityId: branch.id,
      branchId: branch.id,
      branchCode: branch.code,
      details: `Created new branch ${branch.name} (${branch.code}) at ${branch.address}`,
      newValue: { name: branch.name, code: branch.code },
    });

    return NextResponse.json({ success: true, branch });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
