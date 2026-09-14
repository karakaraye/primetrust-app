"use client";

import React from "react";
import { formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  FileText,
  Package,
  Truck,
  MapPin,
  CheckCircle,
  BellRing,
  AlertTriangle,
  UserCheck,
  RotateCcw,
  Clock,
} from "lucide-react";

interface StatusHistoryItem {
  id: string;
  status: string;
  createdAt: string | Date;
  remarks?: string | null;
  branch?: { name: string; code: string } | null;
  staff?: { name: string; email: string } | null;
}

interface ShipmentTimelineProps {
  history: StatusHistoryItem[];
  currentStatus: string;
}

export function ShipmentTimeline({ history, currentStatus }: ShipmentTimelineProps) {
  const getEventIcon = (status: string) => {
    switch (status) {
      case "CREATED":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "RECEIVED_AT_ORIGIN":
        return <Package className="w-4 h-4 text-blue-600" />;
      case "AWAITING_DISPATCH":
        return <Clock className="w-4 h-4 text-amber-600" />;
      case "DISPATCHED":
      case "IN_TRANSIT":
        return <Truck className="w-4 h-4 text-purple-600" />;
      case "ARRIVED_AT_DESTINATION":
        return <MapPin className="w-4 h-4 text-cyan-600" />;
      case "READY_FOR_PICKUP":
        return <BellRing className="w-4 h-4 text-emerald-600" />;
      case "COLLECTED":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "ON_HOLD":
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case "RETURNED":
      case "CANCELLED":
        return <RotateCcw className="w-4 h-4 text-rose-600" />;
      default:
        return <UserCheck className="w-4 h-4 text-slate-600" />;
    }
  };

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        No tracking history recorded yet.
      </div>
    );
  }

  // Sort history descending by date so most recent event is on top
  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {sortedHistory.map((item, index) => {
        const isLatest = index === 0;
        const badgeInfo = getStatusBadgeInfo(item.status);

        return (
          <div key={item.id} className="relative group">
            {/* Timeline Marker Dot */}
            <div
              className={`absolute -left-[23px] top-1 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition ${
                isLatest
                  ? "border-brand-600 ring-4 ring-brand-100 scale-110 shadow-sm"
                  : "border-slate-300"
              }`}
            >
              {getEventIcon(item.status)}
            </div>

            {/* Event Card */}
            <div
              className={`p-3.5 rounded-xl border text-sm transition ${
                isLatest
                  ? "bg-brand-50/50 border-brand-200 shadow-sm"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badgeInfo.color}`}
                  >
                    {badgeInfo.label}
                  </span>
                  {item.branch && (
                    <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      📍 {item.branch.name} ({item.branch.code})
                    </span>
                  )}
                </div>

                <span className="text-xs font-mono text-slate-500">
                  {formatDate(item.createdAt)}
                </span>
              </div>

              {item.remarks && (
                <p className="text-slate-700 text-xs mt-1 leading-relaxed">
                  {item.remarks}
                </p>
              )}

              {item.staff && (
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Processed by:</span>
                  <span className="font-semibold text-slate-700">{item.staff.name}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
