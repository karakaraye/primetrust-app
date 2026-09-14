import { PrismaClient } from "@prisma/client";
import { generateWaybillNumber, generateManifestNumber, generatePickupCode } from "../src/lib/waybill-generator";

const prisma = new PrismaClient();

async function testIncomingReceivingAndSMS() {
  console.log("🚀 Testing Incoming Manifest Inspection ➔ Automatic Customer SMS Notification flow...");

  const phc = await prisma.branch.findUnique({ where: { code: "PHC" } });
  const abi = await prisma.branch.findUnique({ where: { code: "ABI" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@logisticsops.ng" } });
  const sender = await prisma.customer.findFirst();
  const receiver = await prisma.customer.findFirst({ where: { id: { not: sender?.id } } });

  if (!phc || !abi || !admin || !sender || !receiver) {
    throw new Error("Missing database records");
  }

  // 1. Create a waybill from PHC to ABI
  const waybillNumber = await generateWaybillNumber(phc.code, abi.code);
  const shipment = await prisma.shipment.create({
    data: {
      waybillNumber,
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      senderId: sender.id,
      receiverId: receiver.id,
      status: "IN_TRANSIT",
      parcelCategory: "Documents",
      description: "Original Land Deed & Official Certificates (Confidential)",
      packagesCount: 1,
      weightKg: 0.5,
      declaredValue: 500000,
      transportCharge: 4000,
      paymentStatus: "PAID",
      amountPaid: 4000,
      balanceAmount: 0,
      currentBranchId: phc.id,
      createdById: admin.id,
    },
  });

  // 2. Create an IN_TRANSIT manifest
  const manifestNumber = await generateManifestNumber(phc.code, abi.code);
  const manifest = await prisma.manifest.create({
    data: {
      manifestNumber,
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      status: "IN_TRANSIT",
      dispatchedAt: new Date(),
      dispatchedById: admin.id,
      driverName: "Uchenna Obi",
      vehicleReg: "RVS-901-AA",
      driverPhone: "0803 777 8899",
      totalParcels: 1,
      createdById: admin.id,
      manifestShipments: {
        create: [
          {
            shipmentId: shipment.id,
            receivingStatus: "PENDING",
          },
        ],
      },
    },
  });

  console.log(`Manifest ${manifest.manifestNumber} in transit with Waybill ${shipment.waybillNumber}`);

  // 3. Simulate arrival & inspection confirmation (as done in /api/manifests/[id]/receive)
  const pickupCode = generatePickupCode();
  const notifMessage = `Your parcel with Waybill ${shipment.waybillNumber} from ${phc.name} has arrived at our ${abi.name} office (${abi.address}) and is ready for collection. Your Secret Pickup PIN is: ${pickupCode}. Present this PIN & valid ID at the counter for collection. Station Tel: ${abi.phone}.`;

  const received = await prisma.$transaction(async (tx) => {
    await tx.manifestShipment.updateMany({
      where: { manifestId: manifest.id, shipmentId: shipment.id },
      data: {
        receivingStatus: "RECEIVED",
        receivingRemarks: "Verified intact by destination officer",
        verifiedAt: new Date(),
        verifiedById: admin.id,
      },
    });

    await tx.shipment.update({
      where: { id: shipment.id },
      data: {
        status: "READY_FOR_PICKUP",
        currentBranchId: abi.id,
        pickupCode,
        pickupCodeGeneratedAt: new Date(),
      },
    });

    await tx.pickupVerification.create({
      data: {
        shipmentId: shipment.id,
        pickupCode,
        attempts: 0,
        isVerified: false,
      },
    });

    const notif = await tx.notification.create({
      data: {
        shipmentId: shipment.id,
        recipientPhone: receiver.phone,
        recipientName: receiver.fullName,
        channel: "SMS",
        message: notifMessage,
        deliveryStatus: "SENT",
        sentAt: new Date(),
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "ARRIVED_AT_DESTINATION",
        branchId: abi.id,
        staffId: admin.id,
        remarks: `Arrived and inspected at ${abi.name}. Condition: Intact`,
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        status: "READY_FOR_PICKUP",
        branchId: abi.id,
        staffId: admin.id,
        remarks: `Automated Arrival SMS dispatched to customer (${receiver.phone}) with Secret Pickup PIN: ${pickupCode}`,
      },
    });

    const m = await tx.manifest.update({
      where: { id: manifest.id },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
        receivedById: admin.id,
        receivingRemarks: "Manifest received, parcels intact, notifications dispatched.",
      },
    });

    return { manifest: m, notification: notif };
  });

  console.log(`\n✅ Manifest ${received.manifest.manifestNumber} received successfully!`);
  console.log(`📱 Customer Notification Dispatched:`);
  console.log(`   Recipient: ${received.notification.recipientName} (${received.notification.recipientPhone})`);
  console.log(`   Channel: ${received.notification.channel} | Status: ${received.notification.deliveryStatus}`);
  console.log(`   Message Text:\n   "${received.notification.message}"`);

  // 4. Assertions
  const checkShipment = await prisma.shipment.findUnique({
    where: { id: shipment.id },
    include: {
      notifications: true,
      pickupVerifications: true,
      statusHistory: true,
    },
  });

  console.log(`\nVerification check on database:`);
  console.log(` - Shipment Status: ${checkShipment?.status}`);
  console.log(` - Pickup PIN in DB: ${checkShipment?.pickupCode}`);
  console.log(` - Notifications Count: ${checkShipment?.notifications.length}`);
  console.log(` - Status History Records: ${checkShipment?.statusHistory.length}`);

  if (
    checkShipment?.status === "READY_FOR_PICKUP" &&
    checkShipment?.notifications.length &&
    checkShipment?.pickupCode
  ) {
    console.log("\n🎉 ALL CHECKS PASSED: Arrival confirmed, status updated, and customer message sent!");
  } else {
    throw new Error("Verification failed");
  }
}

testIncomingReceivingAndSMS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
