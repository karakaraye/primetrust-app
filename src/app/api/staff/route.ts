import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]);
    
    const where: any = {};
    if (user.role === "BRANCH_ADMIN" && user.branchId) {
      where.branchId = user.branchId;
    }

    const staff = await db.user.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    });

    // Strip password hashes
    const sanitized = staff.map(({ passwordHash, ...rest }) => rest);
    return NextResponse.json({ staff: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]);
    const body = await req.json();

    const { name, email, password, role, branchId, phone } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    const effectiveBranchId =
      user.role === "BRANCH_ADMIN" && user.branchId ? user.branchId : branchId || null;
    const effectiveRole = user.role === "BRANCH_ADMIN" ? "OPERATIONS_STAFF" : role || "OPERATIONS_STAFF";

    const passwordHash = await hashPassword(password);

    const newStaff = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: effectiveRole,
        branchId: effectiveBranchId,
        phone: phone?.trim() || null,
        status: "ACTIVE",
      },
      include: { branch: true },
    });

    await logAudit({
      user,
      action: "STAFF_CREATED",
      entityType: "USER",
      entityId: newStaff.id,
      branchId: effectiveBranchId,
      details: `Created staff account for ${newStaff.name} (${newStaff.email}), Role: ${newStaff.role}`,
      newValue: { name: newStaff.name, email: newStaff.email, role: newStaff.role },
    });

    const { passwordHash: _, ...sanitized } = newStaff;
    return NextResponse.json({ success: true, staff: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireRole(["SUPER_ADMIN", "BRANCH_ADMIN"]);
    const body = await req.json();

    const { id, status, role, branchId } = body;
    if (!id) {
      return NextResponse.json({ error: "Staff ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (role && user.role === "SUPER_ADMIN") updateData.role = role;
    if (branchId && user.role === "SUPER_ADMIN") updateData.branchId = branchId;

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      include: { branch: true },
    });

    await logAudit({
      user,
      action: "STAFF_UPDATED",
      entityType: "USER",
      entityId: updated.id,
      branchId: updated.branchId,
      details: `Updated staff ${updated.name}: Status=${updated.status}, Role=${updated.role}`,
      newValue: updateData,
    });

    const { passwordHash: _, ...sanitized } = updated;
    return NextResponse.json({ success: true, staff: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
