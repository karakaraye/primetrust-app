import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateManifestNumber } from "@/lib/waybill-generator";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      originBranchId,
      destinationBranchId,
      shipmentIds,
      driverName,
      vehicleReg,
      driverPhone,
      notes,
      dispatchImmediately,
    } = body;

    if (!destinationBranchId) {
      return NextResponse.json({ error: "Destination branch is required." }, { status: 400 });
    }

    const effectiveOriginBranchId = user.branchId && user.role !== "SUPER_ADMIN" ? user.branchId : originBranchId;

    if (!effectiveOriginBranchId) {
      return NextResponse.json({ error: "Origin branch is required." }, { status: 400 });
    }

    if (effectiveOriginBranchId === destinationBranchId) {
      return NextResponse.json({ error: "Origin and Destination branches cannot be the same." }, { status: 400 });
    }

    if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one parcel for this manifest." }, { status: 400 });
    }

    // Fetch branches for codes
    const originBranch = await db.branch.findUnique({ where: { id: effectiveOriginBranchId } });
    const destinationBranch = await db.branch.findUnique({ where: { id: destinationBranchId } });

    if (!originBranch || !destinationBranch) {
      return NextResponse.json({ error: "Invalid branch selected." }, { status: 400 });
    }

    // Check if any parcel is already in an active manifest
    const alreadyManifested = await db.manifestShipment.findFirst({
      where: {
        shipmentId: { in: shipmentIds },
        manifest: {
          status: { in: ["DRAFT", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT"] },
        },
      },
      include: { manifest: true, shipment: true },
    });

    if (alreadyManifested) {
      return NextResponse.json(
        {
          error: `Parcel ${alreadyManifested.shipment.waybillNumber} is already in active manifest ${alreadyManifested.manifest.manifestNumber}.`,
        },
        { status: 400 }
      );
    }

    // Verify all shipments are in AWAITING_DISPATCH or CREATED state and match route
    const eligibleShipments = await db.shipment.findMany({
      where: {
        id: { in: shipmentIds },
        originBranchId: originBranch.id,
        destinationBranchId: destinationBranch.id,
        status: { in: ["AWAITING_DISPATCH", "RECEIVED_AT_ORIGIN", "CREATED"] },
      },
    });

    if (eligibleShipments.length !== shipmentIds.length) {
      return NextResponse.json(
        { error: "One or more selected parcels are already in transit or assigned to another route." },
        { status: 400 }
      );
    }

    const manifestNumber = await generateManifestNumber(originBranch.code, destinationBranch.code);

    const manifest = await db.$transaction(
      async (tx) => {
        const created = await tx.manifest.create({
          data: {
            manifestNumber,
            originBranchId: originBranch.id,
            destinationBranchId: destinationBranch.id,
            status: "IN_TRANSIT",
            dispatchedAt: new Date(),
            dispatchedById: user.userId,
            driverName: driverName?.trim() || null,
            vehicleReg: vehicleReg?.trim() || null,
            driverPhone: driverPhone?.trim() || null,
            notes: notes?.trim() || null,
            totalParcels: eligibleShipments.length,
            createdById: user.userId,
          },
        });

        // Link shipments to manifest in batch
        const msData = eligibleShipments.map((s) => ({
          manifestId: created.id,
          shipmentId: s.id,
          receivingStatus: "PENDING",
        }));

        await tx.manifestShipment.createMany({
          data: msData,
        });

        // Update all shipments to IN_TRANSIT in one query
        const shipmentIdsList = eligibleShipments.map((s) => s.id);
        await tx.shipment.updateMany({
          where: { id: { in: shipmentIdsList } },
          data: { status: "IN_TRANSIT" },
        });

        // Batch status histories
        const histories = eligibleShipments.map((s) => ({
          shipmentId: s.id,
          status: "IN_TRANSIT",
          branchId: originBranch.id,
          staffId: user.userId,
          remarks: `Dispatched from ${originBranch.name} to ${destinationBranch.name} on manifest ${manifestNumber}`,
        }));

        await tx.shipmentStatusHistory.createMany({
          data: histories,
        });

        return created;
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
      branchId: originBranch.id,
      branchCode: originBranch.code,
      details: `Created and dispatched manifest ${manifest.manifestNumber} with ${eligibleShipments.length} parcels (all marked IN_TRANSIT) to ${destinationBranch.name}`,
    });

    return NextResponse.json({ success: true, manifest });
  } catch (error: any) {
    console.error("Manifest create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const origin = searchParams.get("origin");
    const destination = searchParams.get("destination");

    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (origin && origin !== "ALL") where.originBranchId = origin;
    if (destination && destination !== "ALL") where.destinationBranchId = destination;

    const manifests = await db.manifest.findMany({
      where,
      include: {
        originBranch: true,
        destinationBranch: true,
        createdBy: { select: { id: true, name: true, email: true } },
        dispatchedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        manifestShipments: {
          include: {
            shipment: {
              include: { sender: true, receiver: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ manifests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
