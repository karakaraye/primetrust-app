import { PrismaClient } from "@prisma/client";
import { generateManifestNumber } from "../src/lib/waybill-generator";

const prisma = new PrismaClient();

async function testCreateManifest() {
  console.log("🚀 Testing manifest creation and immediate dispatch flow...");

  const phc = await prisma.branch.findUnique({ where: { code: "PHC" } });
  const abi = await prisma.branch.findUnique({ where: { code: "ABI" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@logisticsops.ng" } });

  if (!phc || !abi || !admin) {
    throw new Error("Missing seed data");
  }

  // Get eligible unmanifested parcels
  const eligibleShipments = await prisma.shipment.findMany({
    where: {
      originBranchId: phc.id,
      destinationBranchId: abi.id,
      status: "AWAITING_DISPATCH",
      manifestShipments: {
        none: {
          manifest: {
            status: { in: ["DRAFT", "READY_FOR_DISPATCH", "DISPATCHED", "IN_TRANSIT"] },
          },
        },
      },
    },
    take: 2,
  });

  console.log(`Selecting ${eligibleShipments.length} parcels to stage:`);
  eligibleShipments.forEach((s) => console.log(` - ${s.waybillNumber}: ${s.description}`));

  const manifestNumber = await generateManifestNumber(phc.code, abi.code);
  console.log(`Generated manifest number: ${manifestNumber}`);

  const manifest = await prisma.$transaction(async (tx) => {
    const created = await tx.manifest.create({
      data: {
        manifestNumber,
        originBranchId: phc.id,
        destinationBranchId: abi.id,
        status: "IN_TRANSIT",
        dispatchedAt: new Date(),
        dispatchedById: admin.id,
        driverName: "Sunday Okon",
        vehicleReg: "ABJ-452-XY (HiAce Van)",
        driverPhone: "0803 333 4444",
        notes: "Morning express interstate batch | Security Seal: SEAL-90214",
        totalParcels: eligibleShipments.length,
        createdById: admin.id,
      },
    });

    for (const s of eligibleShipments) {
      await tx.manifestShipment.create({
        data: {
          manifestId: created.id,
          shipmentId: s.id,
          receivingStatus: "PENDING",
        },
      });

      await tx.shipment.update({
        where: { id: s.id },
        data: { status: "IN_TRANSIT" },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: s.id,
          status: "IN_TRANSIT",
          branchId: phc.id,
          staffId: admin.id,
          remarks: `Dispatched on manifest ${manifestNumber} to ${abi.name}`,
        },
      });
    }

    return created;
  });

  console.log(`✅ Successfully created and dispatched manifest ${manifest.manifestNumber} (ID: ${manifest.id})`);

  // Verify status in DB
  const verified = await prisma.manifest.findUnique({
    where: { id: manifest.id },
    include: {
      originBranch: true,
      destinationBranch: true,
      manifestShipments: {
        include: { shipment: true },
      },
    },
  });

  console.log(`Verification: Status = ${verified?.status}, Total Parcels = ${verified?.manifestShipments.length}`);
  verified?.manifestShipments.forEach((ms) => {
    console.log(` - Shipment ${ms.shipment.waybillNumber} status is now: ${ms.shipment.status}`);
  });
}

testCreateManifest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
