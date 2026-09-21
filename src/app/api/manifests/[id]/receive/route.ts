import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generatePickupCode } from "@/lib/waybill-generator";
import { logAudit } from "@/lib/audit";
import { sendRealtimeSMS } from "@/lib/sms";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;
    const body = await req.json();

    const { items, receivingRemarks } = body;

    const manifest = await db.manifest.findFirst({
      where: { OR: [{ id }, { manifestNumber: id }] },
      include: {
        originBranch: true,
        destinationBranch: true,
        manifestShipments: {
          include: { shipment: { include: { receiver: true } } },
        },
      },
    });

    if (!manifest) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    if (manifest.status === "RECEIVED" || manifest.status === "CLOSED") {
      return NextResponse.json(
        { error: `This manifest has already been marked as ${manifest.status}` },
        { status: 400 }
      );
    }

    const verificationMap = new Map<string, { status: string; remarks?: string }>();
    if (Array.isArray(items)) {
      for (const it of items) {
        verificationMap.set(it.shipmentId, {
          status: it.receivingStatus || "RECEIVED",
          remarks: it.receivingRemarks || null,
        });
      }
    }

    const notificationsToDispatch: Array<{ phone: string; message: string }> = [];

    // Pre-calculate all data and updates before starting transaction
    const now = new Date();
    const manifestShipmentUpdates: Array<{ where: { id: string }; data: any }> = [];
    const shipmentUpdates: Array<{ where: { id: string }; data: any }> = [];
    const pickupVerificationsToCreate: Array<{
      shipmentId: string;
      pickupCode: string;
      attempts: number;
      isVerified: boolean;
    }> = [];
    const notificationsToCreate: Array<{
      shipmentId: string;
      recipientPhone: string;
      recipientName: string;
      channel: string;
      message: string;
      deliveryStatus: string;
      sentAt: Date;
    }> = [];
    const statusHistoriesToCreate: Array<{
      shipmentId: string;
      status: string;
      branchId?: string;
      staffId: string;
      remarks: string;
    }> = [];

    for (const ms of manifest.manifestShipments) {
      const itemVerification = verificationMap.get(ms.shipmentId) || {
        status: "RECEIVED",
        remarks: "Verified during manifest arrival",
      };

      const recStatus = itemVerification.status; // RECEIVED, MISSING, DAMAGED, ON_HOLD
      const remarks = itemVerification.remarks;

      // ManifestShipment update item
      manifestShipmentUpdates.push({
        where: { id: ms.id },
        data: {
          receivingStatus: recStatus,
          receivingRemarks: remarks,
          verifiedAt: now,
          verifiedById: user.userId,
        },
      });

      if (recStatus === "RECEIVED") {
        const pickupCode = ms.shipment.pickupCode || generatePickupCode();

        shipmentUpdates.push({
          where: { id: ms.shipmentId },
          data: {
            status: "READY_FOR_PICKUP",
            currentBranchId: manifest.destinationBranchId,
            pickupCode,
            pickupCodeGeneratedAt: now,
          },
        });

        pickupVerificationsToCreate.push({
          shipmentId: ms.shipmentId,
          pickupCode,
          attempts: 0,
          isVerified: false,
        });

        const notifMessage = `Your parcel with Waybill ${ms.shipment.waybillNumber} from ${manifest.originBranch.name} has arrived at our ${manifest.destinationBranch.name} office (${manifest.destinationBranch.address}) and is ready for collection. Your Secret Pickup PIN is: ${pickupCode}. Present this PIN & valid ID at the counter for collection. Station Tel: ${manifest.destinationBranch.phone}.`;

        notificationsToCreate.push({
          shipmentId: ms.shipmentId,
          recipientPhone: ms.shipment.receiver.phone,
          recipientName: ms.shipment.receiver.fullName,
          channel: "SMS",
          message: notifMessage,
          deliveryStatus: "SENT",
          sentAt: now,
        });

        notificationsToDispatch.push({
          phone: ms.shipment.receiver.phone,
          message: notifMessage,
        });

        statusHistoriesToCreate.push({
          shipmentId: ms.shipmentId,
          status: "ARRIVED_AT_DESTINATION",
          branchId: manifest.destinationBranchId,
          staffId: user.userId,
          remarks: `Arrived and inspected at ${manifest.destinationBranch.name}. ${remarks || "Condition: Intact"}`,
        });

        statusHistoriesToCreate.push({
          shipmentId: ms.shipmentId,
          status: "READY_FOR_PICKUP",
          branchId: manifest.destinationBranchId,
          staffId: user.userId,
          remarks: `Automated Arrival SMS dispatched to customer (${ms.shipment.receiver.phone}) with Secret Pickup PIN: ${pickupCode}`,
        });
      } else if (recStatus === "DAMAGED") {
        shipmentUpdates.push({
          where: { id: ms.shipmentId },
          data: {
            status: "ON_HOLD",
            currentBranchId: manifest.destinationBranchId,
          },
        });

        statusHistoriesToCreate.push({
          shipmentId: ms.shipmentId,
          status: "ON_HOLD",
          branchId: manifest.destinationBranchId,
          staffId: user.userId,
          remarks: `⚠️ PARCEL DAMAGED: Arrived with damage at ${manifest.destinationBranch.name}. Placed on hold for inspection. Remarks: ${remarks || "No details provided"}`,
        });
      } else if (recStatus === "MISSING") {
        shipmentUpdates.push({
          where: { id: ms.shipmentId },
          data: {
            status: "ON_HOLD",
          },
        });

        statusHistoriesToCreate.push({
          shipmentId: ms.shipmentId,
          status: "ON_HOLD",
          branchId: manifest.destinationBranchId,
          staffId: user.userId,
          remarks: `🚨 PARCEL MISSING: Not found during arrival unloading of manifest ${manifest.manifestNumber}. Remarks: ${remarks || "Discrepancy noted"}`,
        });
      } else {
        shipmentUpdates.push({
          where: { id: ms.shipmentId },
          data: {
            status: "ON_HOLD",
            currentBranchId: manifest.destinationBranchId,
          },
        });

        statusHistoriesToCreate.push({
          shipmentId: ms.shipmentId,
          status: "ON_HOLD",
          branchId: manifest.destinationBranchId,
          staffId: user.userId,
          remarks: `Parcel held on arrival: ${remarks || "Pending verification"}`,
        });
      }
    }

    const updated = await db.$transaction(
      async (tx) => {
        // 1. Parallel execution of ManifestShipment & Shipment updates
        await Promise.all([
          ...manifestShipmentUpdates.map((u) => tx.manifestShipment.update(u)),
          ...shipmentUpdates.map((u) => tx.shipment.update(u)),
        ]);

        // 2. Batch creates
        if (pickupVerificationsToCreate.length > 0) {
          await tx.pickupVerification.createMany({
            data: pickupVerificationsToCreate,
          });
        }

        if (notificationsToCreate.length > 0) {
          await tx.notification.createMany({
            data: notificationsToCreate,
          });
        }

        if (statusHistoriesToCreate.length > 0) {
          await tx.shipmentStatusHistory.createMany({
            data: statusHistoriesToCreate,
          });
        }

        // 3. Update Manifest
        const m = await tx.manifest.update({
          where: { id: manifest.id },
          data: {
            status: "RECEIVED",
            receivedAt: now,
            receivedById: user.userId,
            receivingRemarks: receivingRemarks?.trim() || "Manifest received and inspected.",
          },
        });

        return m;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    // 3. Dispatch Live Real-Time SMS via Termii
    const notificationsCount = notificationsToDispatch.length;
    if (notificationsCount > 0) {
      Promise.allSettled(
        notificationsToDispatch.map((n) =>
          sendRealtimeSMS({
            to: n.phone,
            message: n.message,
            channel: "dnd",
          })
        )
      ).catch((e) => console.error("Async SMS dispatch error:", e));
    }

    await logAudit({
      user,
      action: "MANIFEST_RECEIVED",
      entityType: "MANIFEST",
      entityId: manifest.id,
      branchId: manifest.destinationBranchId,
      branchCode: manifest.destinationBranch.code,
      details: `Manifest ${manifest.manifestNumber} received at ${manifest.destinationBranch.name}. Verified ${manifest.manifestShipments.length} parcels. Sent ${notificationsCount} customer SMS notifications.`,
    });

    return NextResponse.json({
      success: true,
      manifest: updated,
      notificationsCount,
    });
  } catch (error: any) {
    console.error("Manifest receive error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
