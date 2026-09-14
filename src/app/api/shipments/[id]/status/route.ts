import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { canTransitionStatus, ShipmentStatus } from "@/lib/status-transitions";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;
    const { status, remarks } = await req.json();

    if (!status) {
      return NextResponse.json({ error: "Target status is required" }, { status: 400 });
    }

    const shipment = await db.shipment.findFirst({
      where: { OR: [{ id }, { waybillNumber: id }] },
      include: { originBranch: true, destinationBranch: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    // Role and transition validation
    const isSuperAdmin = user.role === "SUPER_ADMIN";
    const check = canTransitionStatus(shipment.status as ShipmentStatus, status as ShipmentStatus, isSuperAdmin);

    if (!check.allowed) {
      return NextResponse.json({ error: check.reason }, { status: 400 });
    }

    // Update inside transaction
    const updated = await db.$transaction(async (tx) => {
      const s = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status,
          currentBranchId: user.branchId || shipment.currentBranchId,
        },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: shipment.id,
          status,
          branchId: user.branchId || null,
          staffId: user.userId,
          remarks: remarks || `Status transitioned to ${status} by ${user.name}`,
        },
      });

      return s;
    });

    // Audit log
    await logAudit({
      user,
      action: "SHIPMENT_STATUS_UPDATED",
      entityType: "SHIPMENT",
      entityId: shipment.id,
      branchId: user.branchId,
      branchCode: user.branchCode,
      details: `Updated waybill ${shipment.waybillNumber} from ${shipment.status} to ${status}. Remarks: ${remarks || "None"}`,
      previousValue: { status: shipment.status },
      newValue: { status },
    });

    return NextResponse.json({ success: true, shipment: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
