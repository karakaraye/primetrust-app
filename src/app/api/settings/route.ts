import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAuth();
    const settings = await db.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireRole(["SUPER_ADMIN"]);
    const body = await req.json();

    const { settings } = body; // array of { key, value }

    if (!Array.isArray(settings)) {
      return NextResponse.json({ error: "Settings array required" }, { status: 400 });
    }

    for (const item of settings) {
      if (item.key && item.value !== undefined) {
        await db.systemSetting.upsert({
          where: { key: item.key },
          update: { value: item.value },
          create: {
            key: item.key,
            value: item.value,
          },
        });
      }
    }

    await logAudit({
      user,
      action: "SETTINGS_UPDATED",
      entityType: "SETTING",
      entityId: "SYSTEM",
      details: `Updated ${settings.length} system configuration parameters`,
      newValue: settings,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
