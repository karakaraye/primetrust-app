import { format } from "date-fns";
import crypto from "crypto";
import { db } from "./db";

/**
 * Generates a concurrency-safe, unique Waybill Number:
 * Format: [COMPANY_CODE]-[ORIGIN_CODE]-[DEST_CODE]-[YYMMDD]-[0001]
 * e.g., PTL-PHC-ABI-260912-0001
 */
export async function generateWaybillNumber(
  originCode: string,
  destinationCode: string
): Promise<string> {
  const origin = originCode.trim().toUpperCase();
  const dest = destinationCode.trim().toUpperCase();
  const dateStr = format(new Date(), "yyMMdd");

  // Retrieve company code from system settings or default to PTL
  const companySetting = await db.systemSetting.findUnique({
    where: { key: "COMPANY_CODE" },
  });
  const companyCode = companySetting?.value || process.env.NEXT_PUBLIC_COMPANY_CODE || "PTL";

  const prefix = `${companyCode}-${origin}-${dest}-${dateStr}`;

  // Atomic increment in SequenceCounter
  const sequence = await db.$transaction(
    async (tx) => {
      const existing = await tx.sequenceCounter.findUnique({
        where: {
          type_prefix: {
            type: "WAYBILL",
            prefix,
          },
        },
      });

      if (existing) {
        const updated = await tx.sequenceCounter.update({
          where: { id: existing.id },
          data: { currentNumber: { increment: 1 } },
        });
        return updated.currentNumber;
      } else {
        const created = await tx.sequenceCounter.create({
          data: {
            type: "WAYBILL",
            prefix,
            currentNumber: 1,
          },
        });
        return created.currentNumber;
      }
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );

  const paddedNumber = String(sequence).padStart(4, "0");
  return `${prefix}-${paddedNumber}`;
}

/**
 * Generates a concurrency-safe, unique Manifest Number:
 * Format: MAN-[ORIGIN_CODE]-[DEST_CODE]-[YYMMDD]-[001]
 * e.g., MAN-PHC-ABI-260912-001
 */
export async function generateManifestNumber(
  originCode: string,
  destinationCode: string
): Promise<string> {
  const origin = originCode.trim().toUpperCase();
  const dest = destinationCode.trim().toUpperCase();
  const dateStr = format(new Date(), "yyMMdd");

  const prefix = `MAN-${origin}-${dest}-${dateStr}`;

  const sequence = await db.$transaction(
    async (tx) => {
      const existing = await tx.sequenceCounter.findUnique({
        where: {
          type_prefix: {
            type: "MANIFEST",
            prefix,
          },
        },
      });

      if (existing) {
        const updated = await tx.sequenceCounter.update({
          where: { id: existing.id },
          data: { currentNumber: { increment: 1 } },
        });
        return updated.currentNumber;
      } else {
        const created = await tx.sequenceCounter.create({
          data: {
            type: "MANIFEST",
            prefix,
            currentNumber: 1,
          },
        });
        return created.currentNumber;
      }
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );

  const paddedNumber = String(sequence).padStart(3, "0");
  return `${prefix}-${paddedNumber}`;
}

/**
 * Generates a cryptographically secure 6-digit pickup code
 * e.g. 583921
 */
export function generatePickupCode(): string {
  const num = crypto.randomInt(100000, 999999);
  return String(num);
}
