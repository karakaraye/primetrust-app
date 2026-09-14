import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTest() {
  console.log("🔍 Checking database and manifest flow...");

  const phc = await prisma.branch.findUnique({ where: { code: "PHC" } });
  const abi = await prisma.branch.findUnique({ where: { code: "ABI" } });
  const admin = await prisma.user.findUnique({ where: { email: "admin@logisticsops.ng" } });

  if (!phc || !abi || !admin) {
    console.error("Missing seed data");
    return;
  }

  // Find awaiting dispatch parcels on PHC -> ABI
  const awaiting = await prisma.shipment.findMany({
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
    include: {
      sender: true,
      receiver: true,
    },
  });

  console.log(`📦 Found ${awaiting.length} unmanifested parcels awaiting transit from PHC to ABI:`);
  awaiting.forEach((p, idx) => {
    console.log(`  ${idx + 1}. [${p.waybillNumber}] ${p.description} (${p.packagesCount} pkgs, ${p.weightKg || 0}kg) -> ${p.receiver.fullName}`);
  });

  // Query latest manifests
  const manifests = await prisma.manifest.findMany({
    include: {
      originBranch: true,
      destinationBranch: true,
      createdBy: true,
      manifestShipments: {
        include: { shipment: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  console.log(`\n📋 Latest ${manifests.length} manifests in database:`);
  manifests.forEach((m) => {
    console.log(`  - Manifest ${m.manifestNumber} | Status: ${m.status} | Route: ${m.originBranch.code} -> ${m.destinationBranch.code} | Parcels: ${m.manifestShipments.length} | Driver: ${m.driverName || "N/A"}`);
  });

  console.log("\n✅ Test script completed successfully!");
}

runTest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
