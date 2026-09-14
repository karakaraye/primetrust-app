"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { PrintableManifest } from "@/components/manifest/PrintableManifest";
import { formatNaira, formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  Printer,
  CheckCircle2,
  Package,
  User,
  Clock,
  ShieldCheck,
  AlertCircle,
  Inbox,
  FileText,
  Send,
  X,
} from "lucide-react";

function ManifestDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();

  const id = params?.id as string;
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  // Fleet inputs during dispatch confirmation
  const [driverName, setDriverName] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const fetchManifest = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/manifests/${id}`);
      if (!res.ok) throw new Error("Manifest not found");
      const data = await res.json();
      setManifest(data.manifest);
      setDriverName(data.manifest.driverName || "");
      setVehicleReg(data.manifest.vehicleReg || "");
      setDriverPhone(data.manifest.driverPhone || "");
    } catch (err: any) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, [id]);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName.trim()) {
      error("Driver name is required to confirm dispatch.");
      return;
    }

    setIsDispatching(true);
    try {
      const res = await fetch(`/api/manifests/${manifest.id}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: driverName.trim(),
          vehicleReg: vehicleReg.trim(),
          driverPhone: driverPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to dispatch manifest");
        setIsDispatching(false);
        return;
      }

      success(
        `Manifest ${manifest.manifestNumber} dispatched! All ${manifest.manifestShipments.length} parcels are now IN TRANSIT.`
      );
      setShowDispatchModal(false);
      fetchManifest();
    } catch (err: any) {
      error(err.message);
    } finally {
      setIsDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="text-xs font-semibold text-slate-500 animate-pulse">
          Loading manifest details...
        </span>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="text-center py-16">
        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-slate-800">Manifest Not Found</h2>
        <Link href="/manifests" className="mt-4 inline-block text-xs font-bold text-brand-600">
          Back to Manifests
        </Link>
      </div>
    );
  }

  const badge = getStatusBadgeInfo(manifest.status);
  const isDraft = manifest.status === "DRAFT" || manifest.status === "READY_FOR_DISPATCH";
  const isInTransit = manifest.status === "IN_TRANSIT";
  const isReceived = manifest.status === "RECEIVED";

  return (
    <div>
      {/* Action Header (Hidden when printing) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
        <div className="flex items-center gap-3">
          <Link
            href="/manifests"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {manifest.manifestNumber}
              </h1>
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prepared on {formatDate(manifest.createdAt)} by{" "}
              <strong className="text-slate-800">{manifest.createdBy.name}</strong> •{" "}
              {manifest.originBranch.name} ➔ {manifest.destinationBranch.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isDraft && (
            <button
              onClick={() => setShowDispatchModal(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Manifest</span>
            </button>
          )}

          {isInTransit && (
            <Link
              href={`/incoming?manifestId=${manifest.id}`}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition"
            >
              <Inbox className="w-4 h-4" />
              <span>Receive Manifest at Destination Hub</span>
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Manifest Sheet</span>
          </button>
        </div>
      </div>

      {/* Official Printable Manifest Component */}
      <PrintableManifest manifest={manifest} />

      {/* Dispatch Confirmation Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Confirm Fleet Dispatch</h3>
                  <p className="text-xs text-slate-500">
                    Manifest <strong className="font-mono text-slate-800">{manifest.manifestNumber}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDispatchModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4 text-xs">
              <div className="p-3.5 bg-brand-50/60 border border-brand-200 rounded-2xl">
                <div className="text-[11px] font-bold text-brand-900 mb-1">
                  Interstate Transfer Summary
                </div>
                <div className="text-slate-700 flex justify-between">
                  <span>Route:</span>
                  <strong className="text-slate-900">
                    {manifest.originBranch.name} ({manifest.originBranch.code}) ➔{" "}
                    {manifest.destinationBranch.name} ({manifest.destinationBranch.code})
                  </strong>
                </div>
                <div className="text-slate-700 flex justify-between mt-1">
                  <span>Total Parcels:</span>
                  <strong className="text-slate-900 font-mono">
                    {manifest.manifestShipments.length} Waybills
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Driver Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Sunday Okon"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vehicle Plate / Reg #
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="e.g. ABJ-452-XY (HiAce Bus)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Driver Contact Phone
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. 0803 333 4444"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatching}
                  className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black px-5 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{isDispatching ? "Dispatching..." : "Confirm & Mark In Transit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManifestDetailsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <ManifestDetailsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
