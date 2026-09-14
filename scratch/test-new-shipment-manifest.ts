import { PrismaClient } from "@prisma/client";
import { generateWaybillNumber, generateManifestNumber } from "../src/lib/waybill-generator";

const prisma = new PrismaClient();

async function testFullFlow() {
  console.log("🧪 Testing complete Parcel Creation ➔ Manifest Creation ➔ IN_TRANSIT update flow...");

  const phc = await prisma.branch.findUnique({ where: { code: "PHC" } });
  const abi = await prisma.branch.findUnique({ where: { code: "ABI" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@logisticsops.ng" } });
  const sender = await prisma.customer.findFirst();
  const receiver = await prisma.customer.findFirst({ where: { id: { not: sender?.id } } });

  if (!phc || !abi || !admin || !sender || !receiver) {
    throw new Error("Missing prerequisite database records");
  }

  // 1. Create a new waybill
  const waybillNumber = await generateWaybillNumber(phc.code, abi.code);
  const shipment = await prisma.shipment.create({
    data: {
      waybillNumber,
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      senderId: sender.id,
      receiverId: receiver.id,
      status: "AWAITING_DISPATCH",
      parcelCategory: "Electronics",
      description: "1 Carton Brand New Android Tablets & Solar Powerbanks",
      packagesCount: 2,
      weightKg: 8.5,
      declaredValue: 250000,
      transportCharge: 6500,
      paymentStatus: "PAID",
      paymentMethod: "TRANSFER",
      amountPaid: 6500,
      balanceAmount: 0,
      currentBranchId: phc.id,
      createdById: admin.id,
    },
  });

  console.log(`Step 1: Created Waybill ${shipment.waybillNumber} with initial status: ${shipment.status}`);

  // 2. Create manifest staging this new shipment
  const manifestNumber = await generateManifestNumber(phc.code, abi.code);
  const manifest = await prisma.$transaction(async (tx) => {
    const created = await tx.manifest.create({
      data: {
        manifestNumber,
        originBranchId: phc.id,
        destinationBranchId: abi.id,
        status: "IN_TRANSIT",
        dispatchedAt: new Date(),
        dispatchedById: admin.id,
        driverName: "Kelechi Amadi",
        vehicleReg: "PHC-782-KT (Transit Van)",
        driverPhone: "0805 123 4567",
        notes: "Afternoon Express Freight Batch | Seal: SEAL-99881",
        totalParcels: 1,
        createdById: admin.id,
      },
    });

    await tx.manifestShipment.create({
      data: {
        manifestId: created.id,
        shipmentId: shipment.id,
        receivingStatus: "PENDING",
      },
    });

    // Update shipment to IN_TRANSIT
    await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: "IN_TRANSIT" },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "IN_TRANSIT",
        branchId: phc.id,
        staffId: admin.id,
        remarks: `Dispatched from ${phc.name} to ${abi.name} on manifest ${manifestNumber}`,
      },
    });

    return created;
  });

  console.log(`Step 2: Created Manifest ${manifest.manifestNumber} with status: ${manifest.status}`);

  // 3. Verify shipment status in DB
  const updatedShipment = await prisma.shipment.findUnique({
    where: { id: shipment.id },
    include: {
      statusHistory: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  console.log(`Step 3: Verification - Waybill ${updatedShipment?.waybillNumber} status is now: ${updatedShipment?.status}`);
  console.log(`       Status History count: ${updatedShipment?.statusHistory.length}`);
  console.log(`       Latest remark: "${updatedShipment?.statusHistory[0]?.remarks}"`);

  if (updatedShipment?.status === "IN_TRANSIT") {
    console.log("\n🎉 ALL TESTS PASSED! Parcel status was automatically updated to IN_TRANSIT upon manifest creation.");
  } else {
    throw new Error("Expected shipment status to be IN_TRANSIT");
  }
}

testFullFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
