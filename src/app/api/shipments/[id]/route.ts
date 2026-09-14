import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id } = params;

    const shipment = await db.shipment.findFirst({
      where: {
        OR: [{ id }, { waybillNumber: id }],
      },
      include: {
        originBranch: true,
        destinationBranch: true,
        sender: true,
        receiver: true,
        createdBy: { select: { id: true, name: true, email: true } },
        statusHistory: {
          include: {
            branch: true,
            staff: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        manifestShipments: {
          include: {
            manifest: {
              include: {
                originBranch: true,
                destinationBranch: true,
                createdBy: { select: { name: true } },
                dispatchedBy: { select: { name: true } },
                receivedBy: { select: { name: true } },
              },
            },
          },
        },
        collection: {
          include: {
            releasedBy: { select: { name: true, email: true } },
            branch: true,
          },
        },
        notifications: {
          orderBy: { sentAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    return NextResponse.json({ shipment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
