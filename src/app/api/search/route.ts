import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results: any[] = [];

    // 1. Search Shipments
    const shipments = await db.shipment.findMany({
      where: {
        OR: [
          { waybillNumber: { contains: query } },
          { description: { contains: query } },
          { sender: { fullName: { contains: query } } },
          { sender: { phone: { contains: query } } },
          { receiver: { fullName: { contains: query } } },
          { receiver: { phone: { contains: query } } },
        ],
      },
      include: { originBranch: true, destinationBranch: true, receiver: true, sender: true },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    for (const s of shipments) {
      results.push({
        type: "shipment",
        id: s.id,
        title: s.waybillNumber,
        subtitle: `${s.originBranch.code} ➔ ${s.destinationBranch.code} • ${s.receiver.fullName} (${s.description})`,
        status: s.status,
        url: `/waybills/${s.id}`,
      });
    }

    // 2. Search Manifests
    const manifests = await db.manifest.findMany({
      where: {
        OR: [
          { manifestNumber: { contains: query } },
          { driverName: { contains: query } },
          { vehicleReg: { contains: query } },
        ],
      },
      include: { originBranch: true, destinationBranch: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    });

    for (const m of manifests) {
      results.push({
        type: "manifest",
        id: m.id,
        title: m.manifestNumber,
        subtitle: `${m.originBranch.code} ➔ ${m.destinationBranch.code} (${m.totalParcels} parcels) • Status: ${m.status}`,
        status: m.status,
        url: `/manifests/${m.id}`,
      });
    }

    // 3. Search Customers
    const customers = await db.customer.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { phone: { contains: query } },
          { altPhone: { contains: query } },
        ],
      },
      take: 4,
    });

    for (const c of customers) {
      results.push({
        type: "customer",
        id: c.id,
        title: c.fullName,
        subtitle: `Phone: ${c.phone} ${c.address ? `• ${c.address}` : ""}`,
        url: `/customers`,
      });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
