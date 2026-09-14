"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatNaira, formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  Inbox,
  Truck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  Eye,
  ShieldCheck,
  MapPin,
  ClipboardCheck,
} from "lucide-react";

function IncomingParcelsContent() {
  const { success, error } = useToast();
  const [incomingManifests, setIncomingManifests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Receiving modal state
  const [selectedManifest, setSelectedManifest] = useState<any>(null);
  const [verificationState, setVerificationState] = useState<Record<string, { status: string; remarks: string }>>({});
  const [overallReceivingRemarks, setOverallReceivingRemarks] = useState("");
  const [isSubmittingReceiving, setIsSubmittingReceiving] = useState(false);

  const fetchIncoming = async () => {
    setLoading(true);
    try {
      // Fetch manifests in transit or ready for receiving
      const res = await fetch("/api/manifests?status=IN_TRANSIT");
      if (res.ok) {
        const data = await res.json();
        setIncomingManifests(data.manifests || []);
      }
    } catch (err: any) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
  }, []);

  const openReceiveModal = async (manifest: any) => {
    try {
      const res = await fetch(`/api/manifests/${manifest.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedManifest(data.manifest);

        // Initialize all parcel items as "RECEIVED"
        const initialMap: Record<string, { status: string; remarks: string }> = {};
        data.manifest.manifestShipments?.forEach((ms: any) => {
          initialMap[ms.shipmentId] = { status: "RECEIVED", remarks: "" };
        });
        setVerificationState(initialMap);
        setOverallReceivingRemarks("");
      }
    } catch (err: any) {
      error("Failed to load manifest details");
    }
  };

  const setItemStatus = (shipmentId: string, status: string) => {
    setVerificationState((prev) => ({
      ...prev,
      [shipmentId]: { ...prev[shipmentId], status },
    }));
  };

  const setItemRemarks = (shipmentId: string, remarks: string) => {
    setVerificationState((prev) => ({
      ...prev,
      [shipmentId]: { ...prev[shipmentId], remarks },
    }));
  };

  const handleConfirmReceiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManifest) return;

    setIsSubmittingReceiving(true);
    try {
      const items = Object.entries(verificationState).map(([shipmentId, val]) => ({
        shipmentId,
        receivingStatus: val.status,
        receivingRemarks: val.remarks,
      }));

      const res = await fetch(`/api/manifests/${selectedManifest.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          receivingRemarks: overallReceivingRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to confirm manifest receipt");
        setIsSubmittingReceiving(false);
        return;
      }

      const notifsCount = data.notificationsCount ?? items.filter((i) => i.receivingStatus === "RECEIVED").length;
      success(
        `✓ Manifest ${selectedManifest.manifestNumber} received! All ${notifsCount} verified parcel(s) are now READY FOR PICKUP, and arrival SMS messages with Secret Pickup PINs have been dispatched to customers!`
      );
      setSelectedManifest(null);
      fetchIncoming();
    } catch (err: any) {
      error(err.message);
    } finally {
      setIsSubmittingReceiving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Incoming Transfers & Arrival Inspection</h1>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {incomingManifests.length} In Transit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Receive incoming freight manifests, verify parcel integrity item-by-item, and register arrivals
          </p>
        </div>
      </div>

      {/* Incoming Manifests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <span className="animate-pulse">Checking incoming freight schedules...</span>
          </div>
        ) : incomingManifests.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-3xl">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-slate-800">No Incoming Transfers In Transit</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              All interstate transfers have been received or no active dispatches are en route.
            </p>
          </div>
        ) : (
          incomingManifests.map((m) => (
            <div
              key={m.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-cyan-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {m.manifestNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    IN TRANSIT
                  </span>
                </div>

                <div className="p-3 bg-gradient-to-r from-slate-50 to-cyan-50/40 rounded-2xl border border-slate-200/80 mb-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <div>{m.originBranch.name} ({m.originBranch.code})</div>
                    <ArrowRight className="w-4 h-4 text-cyan-600 shrink-0" />
                    <div className="text-brand-700">{m.destinationBranch.name} ({m.destinationBranch.code})</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parcels En Route:</span>
                    <strong className="text-slate-900 font-black">{m.totalParcels} parcel(s)</strong>
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
                    <span>Dispatched:</span>
                    <span>{formatDate(m.dispatchedAt)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Link
                  href={`/manifests/${m.id}`}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
                  title="View Manifest Details"
                >
                  <Eye className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => openReceiveModal(m)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Receive & Inspect Manifest</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Itemized Manifest Receiving Modal */}
      {selectedManifest && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 uppercase">
                    Receive Manifest: {selectedManifest.manifestNumber}
                  </h3>
                  <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {selectedManifest.manifestShipments?.length || 0} Items
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect each parcel individually. Mark any damaged or missing items before confirming receipt.
                </p>
              </div>

              <button
                onClick={() => setSelectedManifest(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReceiving} className="space-y-5">
              {/* Itemized Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">Waybill #</th>
                      <th className="p-3">Receiver</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Receiving Outcome</th>
                      <th className="p-3">Condition Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedManifest.manifestShipments?.map((ms: any) => {
                      const s = ms.shipment;
                      const currentVal = verificationState[ms.shipmentId] || { status: "RECEIVED", remarks: "" };

                      return (
                        <tr key={ms.id} className="hover:bg-slate-50/60">
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-900">{s.waybillNumber}</span>
                            <div className="text-[10px] text-slate-400">{s.packagesCount} pkg(s)</div>
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900">{s.receiver?.fullName}</div>
                            <div className="text-[10px] text-slate-500">{s.receiver?.phone}</div>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="font-semibold text-slate-800 truncate">{s.description}</div>
                            <div className="text-[10px] text-slate-400">{s.parcelCategory}</div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs">
                              <button
                                type="button"
                                onClick={() => setItemStatus(ms.shipmentId, "RECEIVED")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                                  currentVal.status === "RECEIVED"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                                title="Parcel intact: Will mark Ready for Pickup & send SMS with secret PIN"
                              >
                                ✓ Intact (Send SMS)
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemStatus(ms.shipmentId, "DAMAGED")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                                  currentVal.status === "DAMAGED"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                                title="Damaged: Will place On Hold (No SMS sent to customer)"
                              >
                                ⚠ Damaged (Hold)
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemStatus(ms.shipmentId, "MISSING")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                                  currentVal.status === "MISSING"
                                    ? "bg-red-700 text-white shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                                }`}
                                title="Missing: Discrepancy logged (No SMS sent to customer)"
                              >
                                🚨 Missing (Hold)
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={currentVal.remarks}
                              onChange={(e) => setItemRemarks(ms.shipmentId, e.target.value)}
                              placeholder={
                                currentVal.status === "DAMAGED"
                                  ? "Describe damage details..."
                                  : currentVal.status === "MISSING"
                                  ? "Note discrepancy..."
                                  : "Optional condition note..."
                              }
                              className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium ${
                                currentVal.status === "DAMAGED" || currentVal.status === "MISSING"
                                  ? "bg-rose-50 border-rose-300 text-rose-900"
                                  : "bg-slate-50 border-slate-200 text-slate-800"
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Overall Receiving Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Overall Receiving & Arrival Remarks
                </label>
                <input
                  type="text"
                  value={overallReceivingRemarks}
                  onChange={(e) => setOverallReceivingRemarks(e.target.value)}
                  placeholder="e.g. Manifest unloaded at Bay 1, driver inspected and signed off."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Automatic Customer SMS Notice */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Automated Customer Arrival Notifications Activated</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Confirming inspection will automatically generate 6-digit Secret Pickup PINs and dispatch arrival SMS messages directly to all verified parcel receivers.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedManifest(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceiving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isSubmittingReceiving
                      ? "Verifying & Sending SMS..."
                      : "Confirm Receipt & Dispatch Customer SMS"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IncomingParcelsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <IncomingParcelsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
