import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNaira(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return "₦0.00";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(amount)
    .replace("NGN", "₦");
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "dd MMM yyyy");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return format(d, "hh:mm a");
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getDaysWaiting(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, differenceInDays(new Date(), d));
}

export function getStatusBadgeInfo(status: string) {
  switch (status) {
    case "CREATED":
      return { label: "Created", color: "bg-slate-100 text-slate-700 border-slate-300" };
    case "RECEIVED_AT_ORIGIN":
      return { label: "Received at Origin", color: "bg-blue-50 text-blue-700 border-blue-200" };
    case "AWAITING_DISPATCH":
      return { label: "Awaiting Dispatch", color: "bg-amber-50 text-amber-700 border-amber-200" };
    case "DISPATCHED":
      return { label: "Dispatched", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    case "IN_TRANSIT":
      return { label: "In Transit", color: "bg-purple-50 text-purple-700 border-purple-200" };
    case "ARRIVED_AT_DESTINATION":
      return { label: "Arrived at Destination", color: "bg-cyan-50 text-cyan-700 border-cyan-200" };
    case "READY_FOR_PICKUP":
      return { label: "Ready for Pickup", color: "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400" };
    case "COLLECTED":
      return { label: "Collected", color: "bg-green-100 text-green-800 border-green-300 font-semibold" };
    case "ON_HOLD":
      return { label: "On Hold", color: "bg-orange-50 text-orange-700 border-orange-300" };
    case "RETURNED":
      return { label: "Returned", color: "bg-rose-50 text-rose-700 border-rose-300" };
    case "CANCELLED":
      return { label: "Cancelled", color: "bg-red-100 text-red-800 border-red-300" };
    // Manifest statuses
    case "DRAFT":
      return { label: "Draft", color: "bg-slate-100 text-slate-700 border-slate-300" };
    case "READY_FOR_DISPATCH":
      return { label: "Ready to Dispatch", color: "bg-amber-50 text-amber-700 border-amber-200" };
    case "RECEIVED":
      return { label: "Received", color: "bg-teal-50 text-teal-700 border-teal-200" };
    case "CLOSED":
      return { label: "Closed", color: "bg-gray-100 text-gray-600 border-gray-300" };
    default:
      return { label: status, color: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

export function getPaymentBadgeInfo(status: string) {
  switch (status) {
    case "PAID":
      return { label: "Paid", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "UNPAID":
      return { label: "Unpaid", color: "bg-rose-50 text-rose-700 border-rose-200" };
    case "PARTIALLY_PAID":
      return { label: "Partial", color: "bg-amber-50 text-amber-700 border-amber-200" };
    default:
      return { label: status, color: "bg-gray-50 text-gray-700 border-gray-200" };
  }
}
