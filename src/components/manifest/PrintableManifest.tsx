"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatNaira, formatDate } from "@/lib/utils";
import { Printer, X, Check, ShieldCheck, Truck, ArrowRight, Package } from "lucide-react";

interface PrintableManifestProps {
  manifest: {
    id: string;
    manifestNumber: string;
    status: string;
    createdAt: string | Date;
    dispatchedAt?: string | Date | null;
    receivedAt?: string | Date | null;
    driverName?: string | null;
    vehicleReg?: string | null;
    driverPhone?: string | null;
    notes?: string | null;
    originBranch: { name: string; code: string; phone: string; address: string };
    destinationBranch: { name: string; code: string; phone: string; address: string };
    createdBy: { name: string; email?: string };
    dispatchedBy?: { name: string } | null;
    receivedBy?: { name: string } | null;
    manifestShipments: Array<{
      id: string;
      receivingStatus: string;
      receivingRemarks?: string | null;
      shipment: {
        id: string;
        waybillNumber: string;
        parcelCategory: string;
        description: string;
        packagesCount: number;
        weightKg?: number | null;
        declaredValue?: number | null;
        transportCharge: number;
        paymentStatus: string;
        sender: { fullName: string; phone: string };
        receiver: { fullName: string; phone: string };
      };
    }>;
  };
  companySettings?: {
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
  };
  onClose?: () => void;
}

export function PrintableManifest({
  manifest,
  companySettings = {},
  onClose,
}: PrintableManifestProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const companyName = companySettings.companyName || "PORT HARCOURT ⇄ ABIA PARCEL NETWORK";
  const companyPhone = companySettings.companyPhone || "+234 800 564 4784";
  const companyAddress = companySettings.companyAddress || "Interstate Freight Operations Division";

  useEffect(() => {
    // Generate QR code with manifest lookup link
    const lookupUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/manifests/${manifest.id}`
        : manifest.manifestNumber;

    QRCode.toDataURL(lookupUrl, {
      width: 140,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code Generation Error:", err));
  }, [manifest.id, manifest.manifestNumber]);

  const handlePrint = () => {
    window.print();
  };

  const totalParcels = manifest.manifestShipments.length;
  const totalPkgs = manifest.manifestShipments.reduce(
    (sum, item) => sum + (item.shipment.packagesCount || 1),
    0
  );
  const totalWeight = manifest.manifestShipments.reduce(
    (sum, item) => sum + (item.shipment.weightKg || 0),
    0
  );
  const totalCharge = manifest.manifestShipments.reduce(
    (sum, item) => sum + (item.shipment.transportCharge || 0),
    0
  );

  return (
    <div className="bg-white text-slate-900">
      {/* On-Screen Action Bar (Hidden during Print) */}
      <div className="no-print bg-slate-900 text-white p-4 rounded-2xl shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <span>Driver Handover Manifest Sheet</span>
              <span className="bg-brand-500/30 text-brand-300 text-xs px-2 py-0.5 rounded font-mono">
                {manifest.manifestNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Official A4 printable dispatch manifest with tripartite signatures and barcode verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Manifest (A4)</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Printable Sheet Container */}
      <div className="printable-manifest-doc border-2 border-slate-900 p-6 md:p-8 rounded-2xl bg-white text-slate-900 font-sans shadow-xs">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-slate-900 text-white font-black text-xs px-2 py-0.5 tracking-wider uppercase rounded">
                OFFICIAL
              </span>
              <span className="text-xs font-black tracking-widest text-slate-500 uppercase">
                INTERSTATE FREIGHT TRANSFER & DRIVER HANDOVER MANIFEST
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">
              {companyName}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              {companyAddress} • Customer Operations Support: {companyPhone}
            </p>
          </div>

          {/* QR Code & Manifest Stamp */}
          <div className="text-right flex items-center gap-4">
            <div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                MANIFEST BATCH #
              </div>
              <div className="font-mono text-lg font-black text-slate-950">
                {manifest.manifestNumber}
              </div>
              <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                Status: <span className="uppercase font-black text-slate-900">{manifest.status}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Prepared: {formatDate(manifest.createdAt)}
              </div>
            </div>

            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Manifest QR"
                className="w-20 h-20 border border-slate-300 p-1 rounded-lg bg-white"
              />
            ) : (
              <div className="w-20 h-20 border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] font-mono text-slate-400">
                QR Code
              </div>
            )}
          </div>
        </div>

        {/* Route Hubs & Logistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-300 rounded-xl p-4 mb-5 text-xs">
          {/* Origin Hub */}
          <div className="border-r border-slate-200 pr-3">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              <span>DEPARTURE ORIGIN HUB</span>
            </div>
            <div className="text-sm font-black text-slate-900">
              {manifest.originBranch.name} ({manifest.originBranch.code})
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">{manifest.originBranch.address}</div>
            <div className="text-[11px] font-medium text-slate-700 mt-0.5">
              Station Tel: {manifest.originBranch.phone}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              Operator: <strong className="text-slate-800">{manifest.createdBy.name}</strong>
            </div>
          </div>

          {/* Destination Hub */}
          <div className="border-r border-slate-200 pr-3">
            <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-brand-700 mb-1">
              <span>ARRIVAL DESTINATION HUB</span>
            </div>
            <div className="text-sm font-black text-brand-900">
              {manifest.destinationBranch.name} ({manifest.destinationBranch.code})
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">{manifest.destinationBranch.address}</div>
            <div className="text-[11px] font-medium text-slate-700 mt-0.5">
              Station Tel: {manifest.destinationBranch.phone}
            </div>
            {manifest.receivedAt && (
              <div className="text-[10px] font-bold text-emerald-700 mt-1">
                Received by: {manifest.receivedBy?.name || "Destination Officer"}
              </div>
            )}
          </div>

          {/* Assigned Driver & Transport Details */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              CARRIER & FLEET DETAILS
            </div>
            <div className="space-y-1 text-slate-800">
              <div>
                Driver Name: <strong className="text-slate-900">{manifest.driverName || "Assigned Driver"}</strong>
              </div>
              <div>
                Driver Phone: <span className="font-semibold">{manifest.driverPhone || "—"}</span>
              </div>
              <div>
                Vehicle Plate #: <span className="font-mono font-bold bg-slate-200 px-1.5 py-0.2 rounded text-[11px]">{manifest.vehicleReg || "—"}</span>
              </div>
              {manifest.notes && (
                <div className="text-[11px] text-slate-600 italic mt-1">
                  Notes: {manifest.notes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manifested Parcels Table */}
        <div className="mb-5">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-300">
            <div className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-700" />
              <span>MANIFESTED PARCEL ITEMS ({totalParcels} WAYBILLS / {totalPkgs} PIECES)</span>
            </div>
            <div className="text-xs font-bold text-slate-600">
              Gross Weight: {totalWeight > 0 ? `${totalWeight} kg` : "N/A"}
            </div>
          </div>

          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-900 text-[10px] font-black uppercase border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300 text-center w-8">#</th>
                <th className="p-2 border-r border-slate-300 w-36">Waybill #</th>
                <th className="p-2 border-r border-slate-300">Category & Contents</th>
                <th className="p-2 border-r border-slate-300 text-center w-12">Pkgs</th>
                <th className="p-2 border-r border-slate-300 text-center w-14">Weight</th>
                <th className="p-2 border-r border-slate-300 w-36">Sender</th>
                <th className="p-2 border-r border-slate-300 w-36">Receiver</th>
                <th className="p-2 border-r border-slate-300 text-right w-20">Freight</th>
                <th className="p-2 border-r border-slate-300 text-center w-16">Payment</th>
                <th className="p-2 text-center w-14">Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-[11px]">
              {manifest.manifestShipments.map((item, idx) => {
                const s = item.shipment;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {s.waybillNumber}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold text-slate-900">{s.description}</div>
                      <div className="text-[10px] text-slate-500">{s.parcelCategory}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900">
                      {s.packagesCount || 1}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center font-semibold text-slate-800">
                      {s.weightKg ? `${s.weightKg}kg` : "—"}
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-semibold text-slate-900 truncate">{s.sender.fullName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.sender.phone}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300">
                      <div className="font-bold text-slate-900 truncate">{s.receiver.fullName}</div>
                      <div className="text-[10px] text-slate-600 font-mono">{s.receiver.phone}</div>
                    </td>
                    <td className="p-2 border-r border-slate-300 text-right font-bold text-slate-900">
                      {formatNaira(s.transportCharge)}
                    </td>
                    <td className="p-2 border-r border-slate-300 text-center">
                      <span
                        className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                          s.paymentStatus === "PAID"
                            ? "bg-slate-200 text-slate-800"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {s.paymentStatus}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="w-4 h-4 border border-slate-500 rounded mx-auto"></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Batch Totals Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100 border border-slate-300 rounded-xl p-3 mb-6 text-xs text-center font-bold">
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Total Waybills</span>
            <span className="text-base font-black text-slate-900">{totalParcels} Items</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Total Physical Units</span>
            <span className="text-base font-black text-slate-900">{totalPkgs} Packages</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Total Gross Weight</span>
            <span className="text-base font-black text-slate-900">
              {totalWeight > 0 ? `${totalWeight} kg` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase block">Total Manifest Freight</span>
            <span className="text-base font-black text-slate-900">{formatNaira(totalCharge)}</span>
          </div>
        </div>

        {/* Tripartite Official Sign-off & Handover Blocks */}
        <div className="border-t-2 border-slate-900 pt-4">
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-3">
            TRIPARTITE DISPATCH, CARRIER HANDOVER & DESTINATION RECEIVING CERTIFICATION
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Origin Dispatch Officer */}
            <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="font-black text-slate-900 text-[11px] uppercase pb-1 border-b border-slate-200">
                  1. Dispatching Officer (Origin)
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  I certify all {totalParcels} parcels above were inspected, packed, and loaded for departure.
                </p>
              </div>
              <div className="space-y-1 pt-3 text-[11px]">
                <div>Name: <span className="font-bold">{manifest.createdBy.name}</span></div>
                <div>Signature: <span className="border-b border-dashed border-slate-400 inline-block w-28"></span></div>
                <div>Date/Time: <span className="font-mono text-[10px]">{formatDate(manifest.createdAt)}</span></div>
              </div>
            </div>

            {/* 2. Driver / Carrier Handover Acceptance */}
            <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="font-black text-slate-900 text-[11px] uppercase pb-1 border-b border-slate-200">
                  2. Driver / Carrier Acceptance
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  I acknowledge receipt of {totalPkgs} intact packages in good order for transit to destination hub.
                </p>
              </div>
              <div className="space-y-1 pt-3 text-[11px]">
                <div>Driver: <span className="font-bold">{manifest.driverName || "_________________"}</span></div>
                <div>Signature: <span className="border-b border-dashed border-slate-400 inline-block w-28"></span></div>
                <div>Phone / Plate: <span className="font-semibold">{manifest.driverPhone || manifest.vehicleReg || "—"}</span></div>
              </div>
            </div>

            {/* 3. Destination Receiving Hub Officer */}
            <div className="border border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between min-h-[140px]">
              <div>
                <div className="font-black text-slate-900 text-[11px] uppercase pb-1 border-b border-slate-200">
                  3. Destination Hub Receiving Officer
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Verified upon arrival at {manifest.destinationBranch.name}.
                </p>
              </div>
              <div className="space-y-1 pt-3 text-[11px]">
                <div>Received Pkgs: [ &nbsp; &nbsp; &nbsp; ] Intact &nbsp; [ &nbsp; ] Damaged</div>
                <div>Officer: <span className="font-bold">{manifest.receivedBy?.name || "_________________"}</span></div>
                <div>Signature: <span className="border-b border-dashed border-slate-400 inline-block w-28"></span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-5 pt-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <div>
            System Generated Dispatch Manifest • Port Harcourt ⇄ Abia Logistics Operations Network
          </div>
          <div className="font-mono">
            ID: {manifest.id}
          </div>
        </div>
      </div>
    </div>
  );
}
