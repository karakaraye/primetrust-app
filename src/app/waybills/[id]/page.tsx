"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { PrintableWaybill } from "@/components/waybill/PrintableWaybill";
import { ShipmentTimeline } from "@/components/timeline/ShipmentTimeline";
import {
  formatNaira,
  formatDate,
  getStatusBadgeInfo,
  getPaymentBadgeInfo,
} from "@/lib/utils";
import {
  FileText,
  Printer,
  ArrowLeft,
  ArrowRight,
  MapPin,
  Truck,
  CheckCircle2,
  BellRing,
  Copy,
  Clock,
  UserCheck,
  ShieldAlert,
  Package,
  CreditCard,
  Edit3,
} from "lucide-react";

function WaybillDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const { toast, success, error } = useToast();

  const id = params?.id as string;

  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Status Change Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchShipment = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (!res.ok) {
        throw new Error("Shipment not found");
      }
      const data = await res.json();
      setShipment(data.shipment);

      // Generate QR Code
      const lookupUrl = typeof window !== "undefined"
        ? `${window.location.origin}/waybills/${data.shipment.id}`
        : data.shipment.waybillNumber;

      QRCode.toDataURL(lookupUrl, { width: 140, margin: 1 })
        .then((url) => setQrCodeDataUrl(url))
        .catch(console.error);
    } catch (err: any) {
      error(err.message || "Failed to load shipment details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipment();
  }, [id]);

  const handleCopyNotification = () => {
    if (!shipment) return;
    const msg = `Your parcel with waybill ${shipment.waybillNumber} from ${shipment.originBranch.name} has arrived at our ${shipment.destinationBranch.name} office and is ready for collection. Pickup Code: ${shipment.pickupCode || "583921"}. Please bring a valid ID.`;
    navigator.clipboard.writeText(msg);
    success("Customer notification message copied to clipboard!");
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, remarks: statusRemarks }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to update status");
        return;
      }

      success(`Status updated to ${newStatus}`);
      setShowStatusModal(false);
      setStatusRemarks("");
      fetchShipment();
    } catch (err: any) {
      error(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleMarkReadyForPickup = async () => {
    if (!confirm("Are you sure you want to mark this parcel as READY FOR PICKUP and activate the pickup code?")) {
      return;
    }
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/ready-for-pickup`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to mark ready for pickup");
        return;
      }
      success("Parcel is now READY FOR PICKUP! Pickup PIN activated.");
      fetchShipment();
    } catch (err: any) {
      error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading shipment tracking record...</p>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Shipment Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested waybill does not exist in the database.</p>
        <Link
          href="/waybills"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Waybill Registry</span>
        </Link>
      </div>
    );
  }

  const statusBadge = getStatusBadgeInfo(shipment.status);
  const payBadge = getPaymentBadgeInfo(shipment.paymentStatus);

  return (
    <div>
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/waybills"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-mono font-black text-slate-900 tracking-wider">
                {shipment.waybillNumber}
              </h1>
              <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registered on {formatDate(shipment.createdAt)} by {shipment.createdBy.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {shipment.status === "ARRIVED_AT_DESTINATION" && (
            <button
              onClick={handleMarkReadyForPickup}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
            >
              <BellRing className="w-4 h-4" />
              <span>Mark Ready for Pickup</span>
            </button>
          )}

          {shipment.status === "READY_FOR_PICKUP" && (
            <>
              <button
                onClick={handleCopyNotification}
                className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-3.5 py-2 rounded-xl transition"
              >
                <Copy className="w-4 h-4 text-emerald-600" />
                <span>Copy SMS Message</span>
              </button>

              <Link
                href={`/collections?waybill=${shipment.waybillNumber}`}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md shadow-brand-600/20 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Collect</span>
              </Link>
            </>
          )}

          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update Status</span>
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Waybill</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Shipment Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Route & QR Summary Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Origin</div>
                  <div className="text-lg font-black text-slate-900">{shipment.originBranch.name}</div>
                  <div className="text-[11px] font-mono text-slate-500 font-bold">({shipment.originBranch.code})</div>
                </div>

                <div className="flex flex-col items-center px-4">
                  <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase mb-1">
                    Direct Freight
                  </span>
                  <ArrowRight className="w-6 h-6 text-brand-600" />
                </div>

                <div className="text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Destination</div>
                  <div className="text-lg font-black text-brand-700">{shipment.destinationBranch.name}</div>
                  <div className="text-[11px] font-mono text-brand-600 font-bold">({shipment.destinationBranch.code})</div>
                </div>
              </div>

              {qrCodeDataUrl && (
                <div className="text-center shrink-0">
                  <img src={qrCodeDataUrl} alt="Shipment QR" className="w-16 h-16 border border-slate-200 rounded-xl p-1 bg-white" />
                  <div className="text-[8px] font-mono text-slate-400 mt-1">INTERNAL QR</div>
                </div>
              )}
            </div>

            {/* Ready for Pickup Code Alert Banner */}
            {shipment.pickupCode && shipment.status === "READY_FOR_PICKUP" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 mb-5 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase text-emerald-800">
                    Active Pickup Verification PIN
                  </div>
                  <div className="text-xl font-mono font-black text-emerald-900 tracking-widest mt-0.5">
                    {shipment.pickupCode}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Receiver can present this PIN code at the counter for instantaneous parcel release.
                  </div>
                </div>
                <button
                  onClick={handleCopyNotification}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shrink-0"
                >
                  Copy Notice
                </button>
              </div>
            )}

            {/* Collection Details (if collected) */}
            {shipment.collection && (
              <div className="p-4 rounded-2xl bg-green-50 border border-green-200 mb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-green-800 uppercase mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Parcel Released & Collected</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Collector Name:</span>
                    <strong className="text-slate-900">{shipment.collection.collectorName}</strong> ({shipment.collection.relationship})
                  </div>
                  <div>
                    <span className="text-slate-500 block">Collector Phone:</span>
                    <strong className="text-slate-900">{shipment.collection.collectorPhone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verification Method:</span>
                    <strong className="text-slate-900">{shipment.collection.verificationMethod}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Collection Time:</span>
                    <span className="text-slate-800">{formatDate(shipment.collection.collectionDate)}</span>
                  </div>
                </div>
                {shipment.collection.remarks && (
                  <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-green-200/60">
                    Remarks: {shipment.collection.remarks}
                  </div>
                )}
              </div>
            )}

            {/* Sender and Receiver Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400 pb-1 border-b border-slate-200 mb-2">
                  Sender (Consignor)
                </div>
                <div className="font-bold text-sm text-slate-900">{shipment.sender.fullName}</div>
                <div className="text-xs text-slate-700 font-semibold mt-1">Tel: {shipment.sender.phone}</div>
                {shipment.sender.altPhone && <div className="text-xs text-slate-500">Alt: {shipment.sender.altPhone}</div>}
                {shipment.sender.address && <div className="text-xs text-slate-500 mt-1">{shipment.sender.address}</div>}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] uppercase font-bold text-slate-400 pb-1 border-b border-slate-200 mb-2">
                  Receiver (Consignee)
                </div>
                <div className="font-bold text-sm text-slate-900">{shipment.receiver.fullName}</div>
                <div className="text-xs text-slate-700 font-semibold mt-1">Tel: {shipment.receiver.phone}</div>
                {shipment.receiver.altPhone && <div className="text-xs text-slate-500">Alt: {shipment.receiver.altPhone}</div>}
                <div className="text-xs text-brand-700 font-semibold mt-1">
                  Collection Hub: {shipment.destinationBranch.name}
                </div>
              </div>
            </div>
          </div>

          {/* Parcel Information Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-600" />
              <span>Parcel Details & Goods Description</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <strong className="text-slate-900">{shipment.parcelCategory}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Description:</span>
                <span className="font-semibold text-slate-900 text-right max-w-xs">{shipment.description}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Packages Count:</span>
                <strong className="text-slate-900">{shipment.packagesCount} package(s)</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Weight:</span>
                <span className="text-slate-900">{shipment.weightKg ? `${shipment.weightKg} kg` : "Not weighed"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Declared Value:</span>
                <span className="font-bold text-slate-900">
                  {shipment.declaredValue ? formatNaira(shipment.declaredValue) : "Not declared"}
                </span>
              </div>
              {shipment.specialInstructions && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <strong className="block text-[10px] uppercase font-bold text-amber-800">Special Handling Instructions:</strong>
                  {shipment.specialInstructions}
                </div>
              )}
            </div>
          </div>

          {/* Payment & Transport Billing Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Billing & Settlement</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Total Transport Charge:</span>
                <span className="font-black text-base text-slate-900">{formatNaira(shipment.transportCharge)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-900">{shipment.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Amount Paid:</span>
                <span className="font-bold text-emerald-700">{formatNaira(shipment.amountPaid)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Balance Due:</span>
                <span className={`font-black ${shipment.balanceAmount > 0 ? "text-rose-700" : "text-slate-500"}`}>
                  {formatNaira(shipment.balanceAmount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Payment Status:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${payBadge.color}`}>
                  {payBadge.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Vertical Shipment Timeline */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                  Shipment Activity Timeline
                </h3>
                <p className="text-[11px] text-slate-500">Permanent immutable audit trail</p>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {shipment.statusHistory?.length || 0} Events
              </span>
            </div>

            <ShipmentTimeline
              history={shipment.statusHistory || []}
              currentStatus={shipment.status}
            />
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Update Shipment Status</h3>
            <p className="text-xs text-slate-500 mb-4">
              Authorized transition for waybill <strong className="text-slate-800">{shipment.waybillNumber}</strong>
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Status</label>
                <select
                  required
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                >
                  <option value="">Select target status...</option>
                  <option value="AWAITING_DISPATCH">AWAITING_DISPATCH</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="ARRIVED_AT_DESTINATION">ARRIVED_AT_DESTINATION</option>
                  <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
                  <option value="ON_HOLD">ON_HOLD</option>
                  <option value="RETURNED">RETURNED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Remarks / Reason</label>
                <textarea
                  rows={2}
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="e.g. Parcel inspected and staged for departure"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {updatingStatus ? "Updating..." : "Confirm Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Modal */}
      {showPrintModal && (
        <PrintableWaybill
          shipment={shipment}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}

export default function WaybillDetailsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <WaybillDetailsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
