export type ShipmentStatus =
  | "CREATED"
  | "RECEIVED_AT_ORIGIN"
  | "AWAITING_DISPATCH"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVED_AT_DESTINATION"
  | "READY_FOR_PICKUP"
  | "COLLECTED"
  | "ON_HOLD"
  | "RETURNED"
  | "CANCELLED";

export const SHIPMENT_STATUSES: { key: ShipmentStatus; label: string; description: string }[] = [
  { key: "CREATED", label: "Created", description: "Waybill registered in system" },
  { key: "RECEIVED_AT_ORIGIN", label: "Received at Origin", description: "Parcel received at the departure office" },
  { key: "AWAITING_DISPATCH", label: "Awaiting Dispatch", description: "Parcel packaged and waiting for manifest grouping" },
  { key: "DISPATCHED", label: "Dispatched", description: "Manifest has been dispatched from origin office" },
  { key: "IN_TRANSIT", label: "In Transit", description: "En route between offices" },
  { key: "ARRIVED_AT_DESTINATION", label: "Arrived at Destination", description: "Manifest received and inspected at destination office" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup", description: "Receiver notified and pickup code activated" },
  { key: "COLLECTED", label: "Collected", description: "Receiver/Collector verified and parcel released" },
  { key: "ON_HOLD", label: "On Hold", description: "Held due to verification, damage inspection, or unpaid charge" },
  { key: "RETURNED", label: "Returned", description: "Returned to origin branch" },
  { key: "CANCELLED", label: "Cancelled", description: "Waybill cancelled before dispatch" },
];

/**
 * Valid allowed status transitions mapping
 */
const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ["RECEIVED_AT_ORIGIN", "AWAITING_DISPATCH", "CANCELLED"],
  RECEIVED_AT_ORIGIN: ["AWAITING_DISPATCH", "ON_HOLD", "CANCELLED"],
  AWAITING_DISPATCH: ["DISPATCHED", "IN_TRANSIT", "ON_HOLD", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT", "ARRIVED_AT_DESTINATION", "ON_HOLD"],
  IN_TRANSIT: ["ARRIVED_AT_DESTINATION", "ON_HOLD"],
  ARRIVED_AT_DESTINATION: ["READY_FOR_PICKUP", "ON_HOLD", "RETURNED"],
  READY_FOR_PICKUP: ["COLLECTED", "ON_HOLD", "RETURNED"],
  COLLECTED: [], // Terminal state (only Super Admin correction allowed)
  ON_HOLD: ["AWAITING_DISPATCH", "IN_TRANSIT", "ARRIVED_AT_DESTINATION", "READY_FOR_PICKUP", "RETURNED", "CANCELLED"],
  RETURNED: ["READY_FOR_PICKUP", "COLLECTED"],
  CANCELLED: [],
};

export function canTransitionStatus(
  currentStatus: ShipmentStatus,
  targetStatus: ShipmentStatus,
  isSuperAdmin = false
): { allowed: boolean; reason?: string } {
  if (isSuperAdmin) {
    return { allowed: true };
  }

  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition: A shipment with status "${currentStatus}" cannot be directly changed to "${targetStatus}".`,
    };
  }

  return { allowed: true };
}
