"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatNaira, formatDate, getDaysWaiting } from "@/lib/utils";
import {
  PackageCheck,
  Copy,
  CheckCircle2,
  Search,
  ArrowRight,
  Eye,
  Clock,
  MapPin,
  BellRing,
} from "lucide-react";

function ReadyForPickupContent() {
  const { success, error } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReadyShipments = async () => {
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
    fetchReadyShipments();
  }, []);

  const handleCopyNotice = (shipment: any) => {
    const msg = `Your parcel with waybill ${shipment.waybillNumber} from ${shipment.originBranch.name} has arrived at our ${shipment.destinationBranch.name} office and is ready for collection. Pickup Code: ${shipment.pickupCode || "583921"}. Please bring a valid ID.`;
    navigator.clipboard.writeText(msg);
    success(`Notification message for ${shipment.receiver.fullName} copied to clipboard!`);
  };

  const filtered = shipments.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.waybillNumber.toLowerCase().includes(q) ||
      s.receiver.fullName.toLowerCase().includes(q) ||
      s.receiver.phone.includes(q) ||
      s.description.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ready for Customer Collection</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {shipments.length} Parcells Staged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage parcels arrived at office counters, generate customer notices, and verify collection PINs
          </p>
        </div>

        <Link
          href="/collections"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition self-start"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Launch Pickup Verification Terminal</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Receiver Name, Phone, Waybill #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid of Ready for Pickup Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <span className="animate-pulse">Loading parcels ready for collection...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <PackageCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800">No Parcels Awaiting Pickup</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All arrived parcels have been released or none have been received yet.
            </p>
          </div>
        ) : (
          filtered.map((s) => {
            const daysWaiting = getDaysWaiting(s.pickupCodeGeneratedAt || s.createdAt);

            return (
              <div
                key={s.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      href={`/waybills/${s.id}`}
                      className="font-mono font-black text-sm text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200"
                    >
                      {s.waybillNumber}
                    </Link>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      daysWaiting >= 7
                        ? "bg-rose-100 text-rose-800 border border-rose-300"
                        : daysWaiting >= 3
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      {daysWaiting === 0 ? "Arrived Today" : `${daysWaiting} Day(s) Waiting`}
                    </span>
                  </div>

                  {/* Receiver & Pickup Pin */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-3">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Receiver (Consignee)</div>
                    <div className="font-black text-sm text-slate-900 mt-0.5">{s.receiver.fullName}</div>
                    <div className="text-xs font-semibold text-slate-700">Phone: {s.receiver.phone}</div>

                    {s.pickupCode && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-800">Secret Pickup PIN:</span>
                        <span className="font-mono font-black text-sm text-emerald-900 tracking-widest bg-emerald-100/80 px-2 py-0.5 rounded">
                          {s.pickupCode}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Parcel Summary */}
                  <div className="space-y-1 text-xs text-slate-600 mb-4">
                    <div className="font-medium text-slate-800 truncate">{s.description}</div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Origin: {s.originBranch.name}</span>
                      <span>{s.packagesCount} pkg(s)</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => handleCopyNotice(s)}
                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                    title="Copy WhatsApp / SMS Notification Text"
                  >
                    <Copy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copy Notice</span>
                  </button>

                  <Link
                    href={`/collections?waybill=${s.waybillNumber}`}
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl text-center shadow-xs transition"
                  >
                    Start Pickup
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ReadyForPickupPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <ReadyForPickupContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
