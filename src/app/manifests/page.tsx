"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  ArrowRight,
  Eye,
  CheckCircle2,
  Clock,
  MapPin,
  Printer,
  Inbox,
  Send,
  Boxes,
} from "lucide-react";

function ManifestsListContent() {
  const { success, error } = useToast();
  const [manifests, setManifests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [originFilter, setOriginFilter] = useState("ALL");
  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchManifests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (originFilter !== "ALL") params.set("origin", originFilter);
      if (destinationFilter !== "ALL") params.set("destination", destinationFilter);

      const [manRes, branchRes] = await Promise.all([
        fetch(`/api/manifests?${params.toString()}`),
        fetch("/api/branches"),
      ]);

      if (manRes.ok) {
        const data = await manRes.json();
        setManifests(data.manifests || []);
      }
      if (branchRes.ok) {
        const bData = await branchRes.json();
        setBranches(bData.branches || []);
      }
    } catch (err: any) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifests();
  }, [statusFilter, originFilter, destinationFilter]);

  const handleQuickDispatch = async (
    manifestId: string,
    manifestNumber: string,
    count: number,
    originName: string,
    destName: string
  ) => {
    if (
      !confirm(
        `Are you sure you want to dispatch manifest ${manifestNumber} containing ${count} parcels from ${originName} to ${destName}?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/manifests/${manifestId}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to dispatch manifest");
        return;
      }
      success(
        `Manifest ${manifestNumber} dispatched! All ${count} parcels are now IN TRANSIT.`
      );
      fetchManifests();
    } catch (err: any) {
      error(err.message);
    }
  };

  const filteredManifests = manifests.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.manifestNumber.toLowerCase().includes(q) ||
      (m.driverName && m.driverName.toLowerCase().includes(q)) ||
      (m.vehicleReg && m.vehicleReg.toLowerCase().includes(q)) ||
      m.originBranch.name.toLowerCase().includes(q) ||
      m.destinationBranch.name.toLowerCase().includes(q)
    );
  });

  const draftCount = manifests.filter((m) => m.status === "DRAFT" || m.status === "READY_FOR_DISPATCH").length;
  const inTransitCount = manifests.filter((m) => m.status === "IN_TRANSIT").length;
  const receivedCount = manifests.filter((m) => m.status === "RECEIVED").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Dispatch Manifests
            </h1>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {manifests.length} Batches
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Stage awaiting parcels, dispatch transport batches, and generate driver handover sheets
          </p>
        </div>

        <Link
          href="/manifests/new"
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create & Prepare Manifest</span>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6 space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Batches ({manifests.length})
            </button>
            <button
              onClick={() => setStatusFilter("DRAFT")}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === "DRAFT"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              Draft / Staged ({draftCount})
            </button>
            <button
              onClick={() => setStatusFilter("IN_TRANSIT")}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === "IN_TRANSIT"
                  ? "bg-brand-600 text-white"
                  : "bg-brand-50 text-brand-700 hover:bg-brand-100"
              }`}
            >
              In Transit ({inTransitCount})
            </button>
            <button
              onClick={() => setStatusFilter("RECEIVED")}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                statusFilter === "RECEIVED"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
              }`}
            >
              Received ({receivedCount})
            </button>
          </div>
        </div>

        {/* Search & Hub Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Manifest #, Driver Name, Vehicle Plate..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400 text-[10px] uppercase">Origin:</span>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
            >
              <option value="ALL">All Origins</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-400 text-[10px] uppercase">Destination:</span>
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800"
            >
              <option value="ALL">All Destinations</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Manifests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <span className="animate-pulse">Loading dispatch manifests...</span>
          </div>
        ) : filteredManifests.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-xs">
            <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800">No Manifests Found</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Prepare a new manifest to group awaiting parcels for transit.
            </p>
            <Link
              href="/manifests/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Manifest</span>
            </Link>
          </div>
        ) : (
          filteredManifests.map((m) => {
            const badge = getStatusBadgeInfo(m.status);
            const isDraft = m.status === "DRAFT" || m.status === "READY_FOR_DISPATCH";
            const isInTransit = m.status === "IN_TRANSIT";
            const isReceived = m.status === "RECEIVED";

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-brand-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {m.manifestNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Route */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <div>
                        {m.originBranch.name} ({m.originBranch.code})
                      </div>
                      <ArrowRight className="w-4 h-4 text-brand-600 shrink-0" />
                      <div className="text-brand-700">
                        {m.destinationBranch.name} ({m.destinationBranch.code})
                      </div>
                    </div>
                  </div>

                  {/* Logistics Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Parcels Included:</span>
                      <strong className="text-slate-900 font-black">{m.totalParcels} Waybill(s)</strong>
                    </div>
                    {m.driverName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Driver:</span>
                        <span className="text-slate-800 font-semibold">{m.driverName}</span>
                      </div>
                    )}
                    {m.vehicleReg && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vehicle:</span>
                        <span className="font-mono text-slate-700">{m.vehicleReg}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Prepared by {m.createdBy.name}</span>
                      <span>{formatDate(m.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <Link
                    href={`/manifests/${m.id}`}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center transition flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>View & Print</span>
                  </Link>

                  {isDraft && (
                    <button
                      onClick={() =>
                        handleQuickDispatch(
                          m.id,
                          m.manifestNumber,
                          m.totalParcels,
                          m.originBranch.name,
                          m.destinationBranch.name
                        )
                      }
                      className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  )}

                  {isInTransit && (
                    <Link
                      href={`/incoming?manifestId=${m.id}`}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      <span>Receive</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function ManifestsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <ManifestsListContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
