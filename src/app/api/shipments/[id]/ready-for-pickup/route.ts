import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generatePickupCode } from "@/lib/waybill-generator";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;

    const shipment = await db.shipment.findFirst({
      where: { OR: [{ id }, { waybillNumber: id }] },
      include: {
        destinationBranch: true,
        originBranch: true,
        receiver: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const pickupCode = shipment.pickupCode || generatePickupCode();

    const notifMessage = `Your parcel with waybill ${shipment.waybillNumber} from ${shipment.originBranch.name} has arrived at our ${shipment.destinationBranch.name} office and is ready for collection. Pickup Code: ${pickupCode}. Please bring this code or valid identification.`;

    const updated = await db.$transaction(
      async (tx) => {
        const s = await tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: "READY_FOR_PICKUP",
            pickupCode,
            pickupCodeGeneratedAt: new Date(),
            currentBranchId: shipment.destinationBranchId,
          },
        });

        // Create or update PickupVerification
        await tx.pickupVerification.create({
          data: {
            shipmentId: shipment.id,
            pickupCode,
            attempts: 0,
            isVerified: false,
          },
        });

        // Create Notification Record
        await tx.notification.create({
          data: {
            shipmentId: shipment.id,
            recipientPhone: shipment.receiver.phone,
            recipientName: shipment.receiver.fullName,
            channel: "SMS",
            message: notifMessage,
            deliveryStatus: "SENT",
          },
        });

        // Status History
        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId: shipment.id,
            status: "READY_FOR_PICKUP",
            branchId: shipment.destinationBranchId,
            staffId: user.userId,
            remarks: `Parcel marked ready for pickup at ${shipment.destinationBranch.name}. Pickup verification code generated.`,
          },
        });

        return s;
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );

    await logAudit({
      user,
      action: "READY_FOR_PICKUP_ACTIVATED",
      entityType: "SHIPMENT",
      entityId: shipment.id,
      branchId: user.branchId,
      branchCode: user.branchCode,
      details: `Waybill ${shipment.waybillNumber} marked READY FOR PICKUP at ${shipment.destinationBranch.name}. Code generated.`,
    });

    return NextResponse.json({
      success: true,
      shipment: updated,
      pickupCode,
      message: notifMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
