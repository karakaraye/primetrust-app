import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { generateWaybillNumber } from "@/lib/waybill-generator";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const {
      sender,
      receiver,
      originBranchId,
      destinationBranchId,
      parcelCategory,
      description,
      packagesCount,
      quantity,
      weightKg,
      declaredValue,
      specialInstructions,
      transportCharge,
      paymentMethod,
      amountPaid,
    } = body;

    // Validation
    if (!sender?.fullName || !sender?.phone) {
      return NextResponse.json({ error: "Sender full name and phone number are required." }, { status: 400 });
    }
    if (!receiver?.fullName || !receiver?.phone) {
      return NextResponse.json({ error: "Receiver full name and phone number are required." }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Parcel description is required." }, { status: 400 });
    }
    if (!destinationBranchId) {
      return NextResponse.json({ error: "Destination branch is required." }, { status: 400 });
    }

    // Determine Origin Branch: If staff has a branch, enforce their branch as origin
    const effectiveOriginBranchId = user.branchId && user.role !== "SUPER_ADMIN" ? user.branchId : originBranchId;

    if (!effectiveOriginBranchId) {
      return NextResponse.json({ error: "Origin branch is required." }, { status: 400 });
    }

    if (effectiveOriginBranchId === destinationBranchId) {
      return NextResponse.json({ error: "Origin and Destination branches cannot be the same." }, { status: 400 });
    }

    // Fetch branches to get their codes
    const originBranch = await db.branch.findUnique({ where: { id: effectiveOriginBranchId } });
    const destinationBranch = await db.branch.findUnique({ where: { id: destinationBranchId } });

    if (!originBranch || !destinationBranch) {
      return NextResponse.json({ error: "Selected branch does not exist." }, { status: 400 });
    }

    const chargeNum = Number(transportCharge) || 0;
    const paidNum = Number(amountPaid) >= 0 ? Number(amountPaid) : chargeNum;
    const balanceNum = Math.max(0, chargeNum - paidNum);

    let paymentStatus = "PAID";
    if (paidNum <= 0 && chargeNum > 0) {
      paymentStatus = "UNPAID";
    } else if (balanceNum > 0) {
      paymentStatus = "PARTIALLY_PAID";
    }

    // Generate unique sequential waybill number server-side
    const waybillNumber = await generateWaybillNumber(originBranch.code, destinationBranch.code);

    // Atomic creation inside transaction
    const shipment = await db.$transaction(async (tx) => {
      // 1. Sender Customer Upsert
      let senderCustomer = await tx.customer.findFirst({
        where: { phone: sender.phone.trim().replace(/\s+/g, "") },
      });
      if (senderCustomer) {
        senderCustomer = await tx.customer.update({
          where: { id: senderCustomer.id },
          data: {
            fullName: sender.fullName.trim(),
            altPhone: sender.altPhone?.trim() || senderCustomer.altPhone,
            email: sender.email?.trim() || senderCustomer.email,
            address: sender.address?.trim() || senderCustomer.address,
          },
        });
      } else {
        senderCustomer = await tx.customer.create({
          data: {
            fullName: sender.fullName.trim(),
            phone: sender.phone.trim().replace(/\s+/g, ""),
            altPhone: sender.altPhone?.trim() || null,
            email: sender.email?.trim() || null,
            address: sender.address?.trim() || null,
          },
        });
      }

      // 2. Receiver Customer Upsert
      let receiverCustomer = await tx.customer.findFirst({
        where: { phone: receiver.phone.trim().replace(/\s+/g, "") },
      });
      if (receiverCustomer) {
        receiverCustomer = await tx.customer.update({
          where: { id: receiverCustomer.id },
          data: {
            fullName: receiver.fullName.trim(),
            altPhone: receiver.altPhone?.trim() || receiverCustomer.altPhone,
            email: receiver.email?.trim() || receiverCustomer.email,
            address: receiver.address?.trim() || receiverCustomer.address,
          },
        });
      } else {
        receiverCustomer = await tx.customer.create({
          data: {
            fullName: receiver.fullName.trim(),
            phone: receiver.phone.trim().replace(/\s+/g, ""),
            altPhone: receiver.altPhone?.trim() || null,
            email: receiver.email?.trim() || null,
            address: receiver.address?.trim() || null,
          },
        });
      }

      // 3. Create Shipment
      const created = await tx.shipment.create({
        data: {
          waybillNumber,
          originBranchId: originBranch.id,
          destinationBranchId: destinationBranch.id,
          senderId: senderCustomer.id,
          receiverId: receiverCustomer.id,
          status: "AWAITING_DISPATCH",
          parcelCategory: parcelCategory || "General Parcel",
          description: description.trim(),
          packagesCount: Math.max(1, Number(packagesCount) || 1),
          quantity: Math.max(1, Number(quantity) || 1),
          weightKg: weightKg ? Number(weightKg) : null,
          declaredValue: declaredValue ? Number(declaredValue) : null,
          specialInstructions: specialInstructions?.trim() || null,
          transportCharge: chargeNum,
          paymentStatus,
          paymentMethod: paymentMethod || "CASH",
          amountPaid: paidNum,
          balanceAmount: balanceNum,
          currentBranchId: originBranch.id,
          createdById: user.userId,
        },
        include: {
          originBranch: true,
          destinationBranch: true,
          sender: true,
          receiver: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // 4. Initial Status History
      await tx.shipmentStatusHistory.createMany({
        data: [
          {
            shipmentId: created.id,
            status: "CREATED",
            branchId: originBranch.id,
            staffId: user.userId,
            remarks: `Waybill created at ${originBranch.name} by ${user.name}`,
          },
          {
            shipmentId: created.id,
            status: "AWAITING_DISPATCH",
            branchId: originBranch.id,
            staffId: user.userId,
            remarks: "Parcel registered and awaiting manifest grouping for dispatch",
          },
        ],
      });

      // 5. Initial Payment Record
      if (paidNum > 0) {
        await tx.payment.create({
          data: {
            shipmentId: created.id,
            amount: paidNum,
            paymentMethod: paymentMethod || "CASH",
            paymentStatus,
            recordedById: user.userId,
          },
        });
      }

      return created;
    });

    // 6. Audit Log
    await logAudit({
      user,
      action: "WAYBILL_CREATED",
      entityType: "SHIPMENT",
      entityId: shipment.id,
      branchId: originBranch.id,
      branchCode: originBranch.code,
      details: `Generated Waybill ${shipment.waybillNumber} (${originBranch.code} ➔ ${destinationBranch.code}), Charge: ₦${chargeNum}`,
      newValue: {
        waybillNumber: shipment.waybillNumber,
        origin: originBranch.code,
        destination: destinationBranch.code,
        charge: chargeNum,
        paid: paidNum,
      },
    });

    return NextResponse.json({ success: true, shipment });
  } catch (error: any) {
    console.error("Create shipment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create waybill" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q")?.trim();
    const status = searchParams.get("status");
    const originBranchId = searchParams.get("origin");
    const destinationBranchId = searchParams.get("destination");
    const paymentStatus = searchParams.get("paymentStatus");
    const unmanifestedOnly = searchParams.get("unmanifestedOnly") === "true";
    const limit = Number(searchParams.get("limit")) || 100;

    const where: any = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (originBranchId && originBranchId !== "ALL") {
      where.originBranchId = originBranchId;
    }

    if (destinationBranchId && destinationBranchId !== "ALL") {
      where.destinationBranchId = destinationBranchId;
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      where.paymentStatus = paymentStatus;
    }

    if (unmanifestedOnly) {
      where.manifestShipments = {
        none: {
          manifest: {
            status: { in: ["DRAFT", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT"] },
          },
        },
      };
    }

    if (query) {
      where.OR = [
        { waybillNumber: { contains: query } },
        { sender: { fullName: { contains: query } } },
        { sender: { phone: { contains: query } } },
        { receiver: { fullName: { contains: query } } },
        { receiver: { phone: { contains: query } } },
        { description: { contains: query } },
      ];
    }

    const shipments = await db.shipment.findMany({
      where,
      include: {
        originBranch: true,
        destinationBranch: true,
        sender: true,
        receiver: true,
        createdBy: { select: { id: true, name: true, email: true } },
        collection: true,
        manifestShipments: {
          include: {
            manifest: { select: { id: true, manifestNumber: true, status: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ shipments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
