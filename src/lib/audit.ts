import { db } from "./db";
import { SessionPayload } from "./auth";

export interface LogAuditParams {
  user?: SessionPayload | null;
  action: string;
  entityType: "SHIPMENT" | "MANIFEST" | "COLLECTION" | "BRANCH" | "USER" | "SETTING" | "AUTH" | "CUSTOMER" | "NOTIFICATION";
  entityId: string;
  branchId?: string | null;
  branchCode?: string | null;
  details?: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: LogAuditParams) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.user?.userId || null,
        userName: params.user?.name || "System",
        userEmail: params.user?.email || null,
        userRole: params.user?.role || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        branchId: params.branchId || params.user?.branchId || null,
        branchCode: params.branchCode || params.user?.branchCode || null,
        details: params.details || null,
        previousValue: params.previousValue ? JSON.stringify(params.previousValue) : null,
        newValue: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
