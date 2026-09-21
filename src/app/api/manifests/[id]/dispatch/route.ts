import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    const manifest = await db.manifest.findFirst({
      where: { OR: [{ id }, { manifestNumber: id }] },
      include: {
        originBranch: true,
        destinationBranch: true,
        manifestShipments: {
          include: { shipment: true },
        },
      },
    });

    if (!manifest) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    if (manifest.status === "DISPATCHED" || manifest.status === "IN_TRANSIT" || manifest.status === "RECEIVED") {
      return NextResponse.json(
        { error: `This manifest has already been dispatched with status: ${manifest.status}` },
        { status: 400 }
      );
    }

    const updated = await db.$transaction(
      async (tx) => {
        // 1. Update Manifest
        const m = await tx.manifest.update({
          where: { id: manifest.id },
          data: {
            status: "IN_TRANSIT",
            dispatchedAt: new Date(),
            dispatchedById: user.userId,
            driverName: body.driverName?.trim() || manifest.driverName,
            vehicleReg: body.vehicleReg?.trim() || manifest.vehicleReg,
            driverPhone: body.driverPhone?.trim() || manifest.driverPhone,
          },
        });

        // 2. Update each shipment in manifest
        const shipmentIds = manifest.manifestShipments.map((item) => item.shipmentId);
        if (shipmentIds.length > 0) {
          await tx.shipment.updateMany({
            where: { id: { in: shipmentIds } },
            data: {
              status: "IN_TRANSIT",
            },
          });

          const histories = shipmentIds.map((shipmentId) => ({
            shipmentId,
            status: "IN_TRANSIT",
            branchId: manifest.originBranchId,
            staffId: user.userId,
            remarks: `Dispatched from ${manifest.originBranch.name} to ${manifest.destinationBranch.name} on manifest ${manifest.manifestNumber}`,
          }));

          await tx.shipmentStatusHistory.createMany({
            data: histories,
          });
        }

        return m;
      },
      {
        maxWait: 15000,
        timeout: 60000,
      }
    );

    await logAudit({
      user,
      action: "MANIFEST_DISPATCHED",
      entityType: "MANIFEST",
      entityId: manifest.id,
      branchId: manifest.originBranchId,
      branchCode: manifest.originBranch.code,
      details: `Dispatched manifest ${manifest.manifestNumber} with ${manifest.manifestShipments.length} parcels to ${manifest.destinationBranch.name}`,
    });

    return NextResponse.json({ success: true, manifest: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
