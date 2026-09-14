import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      shipmentId,
      pickupCodeInput,
      verificationMethod = "PICKUP_CODE",
      collectorName,
      collectorPhone,
      relationship = "SELF",
      idType,
      idReference,
      remarks,
    } = body;

    if (!shipmentId) {
      return NextResponse.json({ error: "Shipment ID is required" }, { status: 400 });
    }
    if (!collectorName || !collectorPhone) {
      return NextResponse.json({ error: "Collector name and phone number are required" }, { status: 400 });
    }

    const shipment = await db.shipment.findFirst({
      where: { OR: [{ id: shipmentId }, { waybillNumber: shipmentId }] },
      include: {
        destinationBranch: true,
        originBranch: true,
        receiver: true,
        collection: true,
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    if (shipment.status === "COLLECTED" || shipment.collection) {
      return NextResponse.json(
        { error: "This parcel has already been collected and cannot be collected again." },
        { status: 400 }
      );
    }

    if (shipment.status !== "READY_FOR_PICKUP" && shipment.status !== "ARRIVED_AT_DESTINATION") {
      return NextResponse.json(
        { error: `Cannot collect parcel with status "${shipment.status}". The parcel must be arrived and ready for pickup.` },
        { status: 400 }
      );
    }

    let pickupCodeVerified = false;

    if (verificationMethod === "PICKUP_CODE") {
      const cleanInput = String(pickupCodeInput || "").trim();
      const actualCode = String(shipment.pickupCode || "").trim();

      if (!cleanInput) {
        return NextResponse.json({ error: "Please enter the 6-digit pickup code provided by customer." }, { status: 400 });
      }

      if (cleanInput !== actualCode) {
        // Record failed attempt
        await db.pickupVerification.updateMany({
          where: { shipmentId: shipment.id },
          data: { attempts: { increment: 1 } },
        });

        return NextResponse.json(
          { error: "Incorrect pickup code. Please re-check the SMS code or use official ID verification fallback." },
          { status: 400 }
        );
      }

      pickupCodeVerified = true;
    } else {
      // ID Document verification or admin override
      if (!idType || !idReference) {
        return NextResponse.json(
          { error: "Identification type and document reference number are required for manual ID verification." },
          { status: 400 }
        );
      }
    }

    const effectiveBranchId = user.branchId || shipment.destinationBranchId;

    const result = await db.$transaction(async (tx) => {
      // 1. Create Collection record
      const col = await tx.collection.create({
        data: {
          shipmentId: shipment.id,
          collectorName: collectorName.trim(),
          collectorPhone: collectorPhone.trim(),
          relationship,
          verificationMethod,
          pickupCodeVerified,
          idType: idType || null,
          idReference: idReference?.trim() || null,
          releasedById: user.userId,
          branchId: effectiveBranchId,
          remarks: remarks?.trim() || null,
          collectionDate: new Date(),
        },
      });

      // 2. Update Shipment Status to COLLECTED
      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: "COLLECTED",
        },
      });

      // 3. Mark verification as verified
      await tx.pickupVerification.updateMany({
        where: { shipmentId: shipment.id },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
          verifiedById: user.userId,
        },
      });

      // 4. Status History
      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: shipment.id,
          status: "COLLECTED",
          branchId: effectiveBranchId,
          staffId: user.userId,
          remarks: `Parcel released to ${collectorName} (${relationship}) via ${verificationMethod}. Released by ${user.name}.`,
        },
      });

      return { collection: col, shipment: updatedShipment };
    });

    await logAudit({
      user,
      action: "COLLECTION_CONFIRMED",
      entityType: "COLLECTION",
      entityId: result.collection.id,
      branchId: effectiveBranchId,
      branchCode: user.branchCode || shipment.destinationBranch.code,
      details: `Parcel ${shipment.waybillNumber} collected by ${collectorName} (${relationship}). Verification: ${verificationMethod}`,
      newValue: {
        collector: collectorName,
        phone: collectorPhone,
        relationship,
        method: verificationMethod,
      },
    });

    return NextResponse.json({
      success: true,
      collection: result.collection,
      shipment: result.shipment,
    });
  } catch (error: any) {
    console.error("Collection error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
