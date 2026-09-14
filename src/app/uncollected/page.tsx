"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatDate, getDaysWaiting, formatNaira } from "@/lib/utils";
import {
  ClockAlert,
  Copy,
  PhoneCall,
  Eye,
  AlertTriangle,
  Calendar,
  MapPin,
  CheckCircle2,
} from "lucide-react";

function UncollectedParcelsContent() {
  const { success, error } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgeBand, setSelectedAgeBand] = useState<string>("ALL");

  const fetchUncollected = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipments?status=READY_FOR_PICKUP");
      if (res.ok) {
        const data = await res.json();
        setShipments(data.shipments || []);
      }
    } catch (err: any) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUncollected();
  }, []);

  const handleCopyReminder = (shipment: any, days: number) => {
    const msg = `URGENT REMINDER: Your parcel (${shipment.waybillNumber}) from ${shipment.originBranch.name} has been awaiting pickup for ${days} days at our ${shipment.destinationBranch.name} office. Pickup Code: ${shipment.pickupCode || "583921"}. Please collect to avoid demurrage fees.`;
    navigator.clipboard.writeText(msg);
    success(`Reminder message for ${shipment.receiver.fullName} copied!`);
  };

  // Group by age bands
  const band0to2: any[] = [];
  const band3to5: any[] = [];
  const band6to7: any[] = [];
  const band8plus: any[] = [];

  shipments.forEach((s) => {
    const days = getDaysWaiting(s.pickupCodeGeneratedAt || s.createdAt);
    if (days <= 2) band0to2.push({ ...s, days });
    else if (days <= 5) band3to5.push({ ...s, days });
    else if (days <= 7) band6to7.push({ ...s, days });
    else band8plus.push({ ...s, days });
  });

  const getActiveList = () => {
    switch (selectedAgeBand) {
      case "0-2":
        return band0to2;
      case "3-5":
        return band3to5;
      case "6-7":
        return band6to7;
      case "8+":
        return band8plus;
      default:
        return [
          ...band8plus.map((s) => ({ ...s, band: "8+ Days" })),
          ...band6to7.map((s) => ({ ...s, band: "6-7 Days" })),
          ...band3to5.map((s) => ({ ...s, band: "3-5 Days" })),
          ...band0to2.map((s) => ({ ...s, band: "0-2 Days" })),
        ];
    }
  };

  const activeList = getActiveList();

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Uncollected Parcels Aging Tracker</h1>
            <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {shipments.length} Pending Pickup
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor overdue counter parcels, trigger reminders, and mitigate warehouse demurrage
          </p>
        </div>
      </div>

      {/* Age Band Summary Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => setSelectedAgeBand("0-2")}
          className={`p-4 rounded-2xl border text-left transition ${
            selectedAgeBand === "0-2"
              ? "bg-slate-900 text-white border-slate-900 shadow-md"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">0 – 2 Days</div>
          <div className="text-xl font-black mt-1">{band0to2.length} Parcels</div>
          <div className="text-[11px] text-emerald-500 font-semibold mt-1">Normal Pickup Window</div>
        </button>

        <button
          onClick={() => setSelectedAgeBand("3-5")}
          className={`p-4 rounded-2xl border text-left transition ${
            selectedAgeBand === "3-5"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-white border-slate-200 hover:border-amber-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">3 – 5 Days</div>
          <div className="text-xl font-black mt-1">{band3to5.length} Parcels</div>
          <div className="text-[11px] text-amber-500 font-semibold mt-1">Follow-up Call Advised</div>
        </button>

        <button
          onClick={() => setSelectedAgeBand("6-7")}
          className={`p-4 rounded-2xl border text-left transition ${
            selectedAgeBand === "6-7"
              ? "bg-orange-600 text-white border-orange-600 shadow-md"
              : "bg-white border-slate-200 hover:border-orange-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">6 – 7 Days</div>
          <div className="text-xl font-black mt-1">{band6to7.length} Parcels</div>
          <div className="text-[11px] text-orange-500 font-semibold mt-1">Urgent Notice Due</div>
        </button>

        <button
          onClick={() => setSelectedAgeBand("8+")}
          className={`p-4 rounded-2xl border text-left transition ${
            selectedAgeBand === "8+"
              ? "bg-rose-700 text-white border-rose-700 shadow-md"
              : "bg-white border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="text-[10px] uppercase font-bold text-slate-400">8+ Days Overdue</div>
          <div className="text-xl font-black mt-1">{band8plus.length} Parcels</div>
          <div className="text-[11px] text-rose-500 font-semibold mt-1">Demurrage Risk</div>
        </button>
      </div>

      {/* Parcels Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {selectedAgeBand === "ALL" ? "All Uncollected Parcels" : `Parcels in Band (${selectedAgeBand})`} ({activeList.length})
          </h2>
          {selectedAgeBand !== "ALL" && (
            <button
              onClick={() => setSelectedAgeBand("ALL")}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Show All Bands
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Waybill #</th>
                <th className="py-3 px-4">Receiver (Consignee)</th>
                <th className="py-3 px-4">Origin Branch</th>
                <th className="py-3 px-4">Arrival Date</th>
                <th className="py-3 px-4">Aging Duration</th>
                <th className="py-3 px-4">Pickup Code</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <span className="animate-pulse">Loading uncollected parcels ledger...</span>
                  </td>
                </tr>
              ) : activeList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    No uncollected parcels in this aging category.
                  </td>
                </tr>
              ) : (
                activeList.map((s) => {
                  const days = s.days;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-600">
                        <Link href={`/waybills/${s.id}`}>{s.waybillNumber}</Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{s.receiver.fullName}</div>
                        <div className="text-[10px] text-slate-500">{s.receiver.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {s.originBranch.name} ({s.originBranch.code})
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatDate(s.pickupCodeGeneratedAt || s.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          days >= 8
                            ? "bg-rose-100 text-rose-800 border-rose-300 font-black"
                            : days >= 5
                            ? "bg-orange-100 text-orange-800 border-orange-300"
                            : days >= 3
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {days === 0 ? "Today" : `${days} days waiting`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {s.pickupCode || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyReminder(s, days)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                            title="Copy Follow-up Reminder Message"
                          >
                            <Copy className="w-3.5 h-3.5 text-brand-600" />
                          </button>
                          <Link
                            href={`/collections?waybill=${s.waybillNumber}`}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                          >
                            Collect
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function UncollectedParcelsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <UncollectedParcelsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
