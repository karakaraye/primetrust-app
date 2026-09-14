import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendRealtimeSMS } from "@/lib/sms";
import { logAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { phone, message, channel } = body;

    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: "Destination phone number is required" }, { status: 400 });
    }

    const testMessage =
      message?.trim() ||
      `[LOGISTICS OPS TEST] Real-time SMS Gateway verified! Port Harcourt ⇄ Abia Network. Test PIN: ${Math.floor(
        100000 + Math.random() * 900000
      )}.`;

    const result = await sendRealtimeSMS({
      to: phone.trim(),
      message: testMessage,
      channel: channel || "dnd",
    });

    await logAudit({
      user,
      action: "SMS_TEST_SENT",
      entityType: "NOTIFICATION",
      entityId: phone.trim(),
      details: `Dispatched test SMS to ${phone}. Success: ${result.success}. Simulated: ${Boolean(
        result.simulated
      )}`,
    });

    return NextResponse.json({
      success: result.success,
      simulated: result.simulated,
      messageId: result.messageId,
      error: result.error,
      sentTo: phone,
      message: testMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
