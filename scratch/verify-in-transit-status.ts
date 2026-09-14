import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function verify() {
  console.log("🔍 Verifying parcel statuses across all active manifests...");

  const manifests = await prisma.manifest.findMany({
    include: {
      originBranch: true,
      destinationBranch: true,
      manifestShipments: {
        include: {
          shipment: {
            include: {
              statusHistory: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${manifests.length} total manifests.`);
  for (const m of manifests) {
    console.log(`\n📋 Manifest ${m.manifestNumber} [${m.status}] (${m.originBranch.code} -> ${m.destinationBranch.code})`);
    console.log(`   Driver: ${m.driverName || "N/A"} | Dispatched At: ${m.dispatchedAt ? m.dispatchedAt.toISOString() : "N/A"}`);
    console.log(`   Parcels Count: ${m.manifestShipments.length}`);
    for (const ms of m.manifestShipments) {
      const s = ms.shipment;
      const latestHist = s.statusHistory[0];
      console.log(`    • Waybill ${s.waybillNumber}: Status = ${s.status} | Latest History Remark = "${latestHist?.remarks}"`);
    }
  }

  console.log("\n✅ Verification finished!");
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
