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
      return NextResponse.json({ customers: [] });
    }

    const customers = await db.customer.findMany({
      where: {
        OR: [
          { phone: { contains: query } },
          { altPhone: { contains: query } },
          { fullName: { contains: query } },
        ],
      },
      take: 10,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ customers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
