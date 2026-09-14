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

    const manifest = await db.manifest.findFirst({
      where: {
        OR: [{ id }, { manifestNumber: id }],
      },
      include: {
        originBranch: true,
        destinationBranch: true,
        createdBy: { select: { id: true, name: true, email: true } },
        dispatchedBy: { select: { id: true, name: true } },
        receivedBy: { select: { id: true, name: true } },
        manifestShipments: {
          include: {
            shipment: {
              include: {
                sender: true,
                receiver: true,
                originBranch: true,
                destinationBranch: true,
              },
            },
            verifiedBy: { select: { name: true } },
          },
        },
      },
    });

    if (!manifest) {
      return NextResponse.json({ error: "Manifest not found" }, { status: 404 });
    }

    return NextResponse.json({ manifest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
