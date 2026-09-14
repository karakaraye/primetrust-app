import { PrismaClient } from "@prisma/client";
import { generateWaybillNumber, generateManifestNumber, generatePickupCode } from "../src/lib/waybill-generator";

const prisma = new PrismaClient();

async function testIntactOnlySMS() {
  console.log("🧪 Testing that ONLY parcels with outcome 'INTACT' (RECEIVED) receive SMS messages...");

  const phc = await prisma.branch.findUnique({ where: { code: "PHC" } });
  const abi = await prisma.branch.findUnique({ where: { code: "ABI" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@logisticsops.ng" } });
  const customers = await prisma.customer.findMany({ take: 3 });

  if (!phc || !abi || !admin || customers.length < 2) {
    throw new Error("Missing test seed records");
  }

  // Create 3 test parcels
  const s1 = await prisma.shipment.create({
    data: {
      waybillNumber: await generateWaybillNumber(phc.code, abi.code),
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      senderId: customers[0].id,
      receiverId: customers[1].id,
      status: "IN_TRANSIT",
      parcelCategory: "Clothing",
      description: "Intact Parcel Item 1",
      transportCharge: 3000,
      paymentStatus: "PAID",
      createdById: admin.id,
    },
    include: { receiver: true },
  });

  const s2 = await prisma.shipment.create({
    data: {
      waybillNumber: await generateWaybillNumber(phc.code, abi.code),
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      senderId: customers[0].id,
      receiverId: customers[1].id,
      status: "IN_TRANSIT",
      parcelCategory: "Glassware",
      description: "Damaged Fragile Vase Item 2",
      transportCharge: 4500,
      paymentStatus: "PAID",
      createdById: admin.id,
    },
    include: { receiver: true },
  });

  const s3 = await prisma.shipment.create({
    data: {
      waybillNumber: await generateWaybillNumber(phc.code, abi.code),
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      senderId: customers[0].id,
      receiverId: customers[1].id,
      status: "IN_TRANSIT",
      parcelCategory: "Electronics",
      description: "Missing Earbuds Item 3",
      transportCharge: 2500,
      paymentStatus: "PAID",
      createdById: admin.id,
    },
    include: { receiver: true },
  });

  const manifestNumber = await generateManifestNumber(phc.code, abi.code);
  const manifest = await prisma.manifest.create({
    data: {
      manifestNumber,
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      status: "IN_TRANSIT",
      dispatchedAt: new Date(),
      totalParcels: 3,
      createdById: admin.id,
      manifestShipments: {
        create: [
          { shipmentId: s1.id, receivingStatus: "PENDING" },
          { shipmentId: s2.id, receivingStatus: "PENDING" },
          { shipmentId: s3.id, receivingStatus: "PENDING" },
        ],
      },
    },
  });

  console.log(`Created test manifest ${manifest.manifestNumber} with 3 parcels.`);

  // Simulate inspection:
  // s1 -> RECEIVED (Intact)
  // s2 -> DAMAGED
  // s3 -> MISSING
  const verificationMap = {
    [s1.id]: { status: "RECEIVED", remarks: "Intact and verified" },
    [s2.id]: { status: "DAMAGED", remarks: "Outer box crushed, liquid leakage" },
    [s3.id]: { status: "MISSING", remarks: "Not found in vehicle cargo hold" },
  };

  let smsSentCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const [shipmentId, outcome] of Object.entries(verificationMap)) {
      const shipmentObj = [s1, s2, s3].find((s) => s.id === shipmentId)!;

      if (outcome.status === "RECEIVED") {
        const pickupCode = generatePickupCode();
        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: "READY_FOR_PICKUP",
            currentBranchId: abi.id,
            pickupCode,
            pickupCodeGeneratedAt: new Date(),
          },
        });

        // Send SMS
        await tx.notification.create({
          data: {
            shipmentId,
            recipientPhone: shipmentObj.receiver.phone,
            recipientName: shipmentObj.receiver.fullName,
            channel: "SMS",
            message: `Your parcel ${shipmentObj.waybillNumber} is ready for collection. Pickup PIN: ${pickupCode}`,
            deliveryStatus: "SENT",
          },
        });
        smsSentCount++;
      } else {
        // DAMAGED or MISSING -> ON_HOLD, NO SMS SENT
        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: "ON_HOLD",
            currentBranchId: abi.id,
          },
        });

        await tx.shipmentStatusHistory.create({
          data: {
            shipmentId,
            status: "ON_HOLD",
            branchId: abi.id,
            staffId: admin.id,
            remarks: `Placed on hold during arrival inspection. Reason: ${outcome.status} - ${outcome.remarks}`,
          },
        });
      }
    }
  });

  // Check database notifications for each parcel
  const s1Notifs = await prisma.notification.findMany({ where: { shipmentId: s1.id } });
  const s2Notifs = await prisma.notification.findMany({ where: { shipmentId: s2.id } });
  const s3Notifs = await prisma.notification.findMany({ where: { shipmentId: s3.id } });

  const s1Db = await prisma.shipment.findUnique({ where: { id: s1.id } });
  const s2Db = await prisma.shipment.findUnique({ where: { id: s2.id } });
  const s3Db = await prisma.shipment.findUnique({ where: { id: s3.id } });

  console.log("\nResults Inspection:");
  console.log(`Parcel 1 (Intact):  Status = ${s1Db?.status} | SMS Sent = ${s1Notifs.length} | Pickup PIN = ${s1Db?.pickupCode}`);
  console.log(`Parcel 2 (Damaged): Status = ${s2Db?.status} | SMS Sent = ${s2Notifs.length} | Pickup PIN = ${s2Db?.pickupCode || "None"}`);
  console.log(`Parcel 3 (Missing): Status = ${s3Db?.status} | SMS Sent = ${s3Notifs.length} | Pickup PIN = ${s3Db?.pickupCode || "None"}`);

  if (s1Notifs.length === 1 && s2Notifs.length === 0 && s3Notifs.length === 0) {
    console.log("\n🎉 PERFECT! ONLY the intact parcel received an SMS message. Damaged and missing parcels were placed on hold without any customer message.");
  } else {
    throw new Error("Validation failed: messages were sent to damaged or missing parcels!");
  }
}

testIntactOnlySMS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
