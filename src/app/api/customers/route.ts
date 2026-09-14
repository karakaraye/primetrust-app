import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const data = await req.json();

    const { fullName, phone, altPhone, email, address } = data;

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Customer full name and phone number are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");

    // Check if customer already exists by phone
    const existing = await db.customer.findFirst({
      where: { phone: cleanPhone },
    });

    if (existing) {
      const updated = await db.customer.update({
        where: { id: existing.id },
        data: {
          fullName: fullName.trim(),
          altPhone: altPhone?.trim() || existing.altPhone,
          email: email?.trim() || existing.email,
          address: address?.trim() || existing.address,
        },
      });
      return NextResponse.json({ customer: updated });
    }

    const customer = await db.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: cleanPhone,
        altPhone: altPhone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return NextResponse.json({ customer });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAuth();
    const customers = await db.customer.findMany({
      include: {
        _count: {
          select: {
            sentShipments: true,
            receivedShipments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
