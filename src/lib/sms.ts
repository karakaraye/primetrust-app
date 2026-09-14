import { db } from "@/lib/db";

export interface SendSMSParams {
  to: string;
  message: string;
  channel?: "dnd" | "generic" | "whatsapp";
}

export interface SMSResponse {
  success: boolean;
  messageId?: string;
  code?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Normalizes phone numbers to standard 234XXXXXXXXXX Nigerian format
 */
export function normalizeNigerianPhone(phone: string): string {
  let cleaned = phone.trim().replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith("0")) {
    cleaned = "234" + cleaned.substring(1);
  } else if (cleaned.startsWith("234")) {
    // Already in 234 format
  } else if (cleaned.length === 10) {
    // e.g. 8031234567 -> 2348031234567
    cleaned = "234" + cleaned;
  }

  return cleaned;
}

/**
 * Sends a real-time SMS via Termii API (or falls back to simulation if unconfigured)
 */
export async function sendRealtimeSMS({
  to,
  message,
  channel = "dnd", // default to DND channel for 100% transactional delivery in Nigeria
}: SendSMSParams): Promise<SMSResponse> {
  try {
    const normalizedTo = normalizeNigerianPhone(to);

    // 1. Get API Key & Sender ID from env or database system settings
    let apiKey = process.env.TERMII_API_KEY?.trim();
    let senderId = process.env.TERMII_SENDER_ID?.trim();

    if (!apiKey) {
      // Check database settings
      const dbApiKey = await db.systemSetting.findUnique({ where: { key: "TERMII_API_KEY" } });
      const dbSenderId = await db.systemSetting.findUnique({ where: { key: "TERMII_SENDER_ID" } });
      if (dbApiKey?.value) apiKey = dbApiKey.value.trim();
      if (dbSenderId?.value) senderId = dbSenderId.value.trim();
    }

    if (!senderId) {
      senderId = "PTL-OPS";
    }

    // 2. If no API key configured yet, simulate safely in terminal & logs
    if (!apiKey || apiKey === "your_termii_api_key_here") {
      console.log(
        `📱 [TERMII SMS SIMULATION] To: +${normalizedTo} | Sender: ${senderId} | Channel: ${channel}\n   Message: "${message}"`
      );
      return {
        success: true,
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        simulated: true,
      };
    }

    // 3. Make real-time HTTP request to Termii API
    const sendWithSender = async (fromId: string) => {
      const payload = {
        to: normalizedTo,
        from: fromId,
        sms: message,
        type: "plain",
        channel: channel === "whatsapp" ? "whatsapp" : channel === "dnd" ? "dnd" : "generic",
        api_key: apiKey,
      };

      const res = await fetch("https://api.ng.termii.com/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    // Attempt 1: With configured senderId
    let attempt = await sendWithSender(senderId);

    // If failed due to unapproved / unverified sender id, retry with default 'Termii' or 'N-Alert'
    if (
      !attempt.ok &&
      attempt.data?.message &&
      (typeof attempt.data.message === "string" &&
        (attempt.data.message.toLowerCase().includes("sender") ||
          attempt.data.message.toLowerCase().includes("route") ||
          attempt.data.message.toLowerCase().includes("not registered"))) &&
      senderId !== "Termii"
    ) {
      console.warn(
        `⚠️ Sender ID "${senderId}" not yet approved in Termii. Retrying with default "Termii" sender ID...`
      );
      attempt = await sendWithSender("Termii");
    }

    const { ok, data } = attempt;

    if (
      ok &&
      (data.message === "Successfully Sent" ||
        data.message_id ||
        data.code === "ok" ||
        data.status === "success" ||
        data.message?.toLowerCase().includes("successfully"))
    ) {
      console.log(`✅ [TERMII LIVE SMS SENT] To: ${normalizedTo} | ID: ${data.message_id || "ok"}`);
      return {
        success: true,
        messageId: data.message_id || data.id || "live_ok",
        code: data.code || "ok",
      };
    } else {
      console.error(`❌ [TERMII SMS ERROR] To: ${normalizedTo}:`, data);
      return {
        success: false,
        error: data.message || data.error || "Failed to deliver SMS via Termii",
      };
    }
  } catch (err: any) {
    console.error("SMS Gateway Exception:", err);
    return {
      success: false,
      error: err.message || "Network error communicating with SMS gateway",
    };
  }
}
