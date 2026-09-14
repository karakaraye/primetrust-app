"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatNaira, formatDate } from "@/lib/utils";
import { Printer, X, Check, ShieldCheck, ArrowRight } from "lucide-react";

interface PrintableWaybillProps {
  shipment: {
    id: string;
    waybillNumber: string;
    status: string;
    createdAt: string | Date;
    originBranch: { name: string; code: string; phone: string; address: string };
    destinationBranch: { name: string; code: string; phone: string; address: string };
    sender: { fullName: string; phone: string; altPhone?: string | null; address?: string | null };
    receiver: { fullName: string; phone: string; altPhone?: string | null; address?: string | null };
    parcelCategory: string;
    description: string;
    packagesCount: number;
    quantity: number;
    weightKg?: number | null;
    declaredValue?: number | null;
    specialInstructions?: string | null;
    transportCharge: number;
    paymentStatus: string;
    paymentMethod: string;
    amountPaid: number;
    balanceAmount: number;
    createdBy: { name: string };
  };
  companySettings?: {
    companyName?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyAddress?: string;
    waybillTerms?: string;
  };
  onClose?: () => void;
}

export function PrintableWaybill({
  shipment,
  companySettings = {},
  onClose,
}: PrintableWaybillProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const companyName = companySettings.companyName || "LOGISTICS OPERATIONS SYSTEM";
  const companyPhone = companySettings.companyPhone || "+234 800 564 4784";
  const terms =
    companySettings.waybillTerms ||
    "1. Goods received in good condition unless noted. 2. Liability limited to declared terms. 3. Parcels held after 14 days will attract demurrage. 4. Valid ID or secret pickup PIN required for release.";

  useEffect(() => {
    // Generate QR code pointing to internal lookup URL
    const lookupUrl = typeof window !== "undefined"
      ? `${window.location.origin}/waybills/${shipment.id}`
      : shipment.waybillNumber;

    QRCode.toDataURL(lookupUrl, { width: 140, margin: 1 })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [shipment.id, shipment.waybillNumber]);

  const handlePrint = () => {
    window.print();
  };

  const renderSlip = (copyTitle: string) => (
    <div className="border-2 border-slate-900 rounded-lg p-5 bg-white text-slate-900 text-xs mb-6 relative">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-wider text-slate-950 uppercase">{companyName}</span>
            <span className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 rounded tracking-widest uppercase">
              {copyTitle}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">Interstate Office-to-Office Parcel Express</p>
          <p className="text-[10px] text-slate-500">Helpline: {companyPhone}</p>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold text-slate-500">WAYBILL NUMBER</div>
          <div className="font-mono text-base font-black tracking-wider text-slate-950 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block">
            {shipment.waybillNumber}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Date: {formatDate(shipment.createdAt)}</div>
        </div>
      </div>

      {/* Route & QR row */}
      <div className="grid grid-cols-12 gap-3 mb-3 bg-slate-50 p-2.5 rounded border border-slate-200 items-center">
        <div className="col-span-8 grid grid-cols-2 gap-2 items-center">
          <div className="border-r border-slate-300 pr-2">
            <div className="text-[10px] uppercase font-bold text-slate-500">ORIGIN OFFICE</div>
            <div className="font-black text-sm text-slate-900">{shipment.originBranch.name} ({shipment.originBranch.code})</div>
            <div className="text-[10px] text-slate-600 truncate">{shipment.originBranch.address}</div>
            <div className="text-[10px] text-slate-600 font-medium">Tel: {shipment.originBranch.phone}</div>
          </div>
          <div className="pl-2">
            <div className="text-[10px] uppercase font-bold text-slate-500">DESTINATION OFFICE</div>
            <div className="font-black text-sm text-brand-700">{shipment.destinationBranch.name} ({shipment.destinationBranch.code})</div>
            <div className="text-[10px] text-slate-600 truncate">{shipment.destinationBranch.address}</div>
            <div className="text-[10px] text-slate-600 font-medium">Tel: {shipment.destinationBranch.phone}</div>
          </div>
        </div>

        <div className="col-span-4 flex justify-end items-center gap-2">
          {qrCodeDataUrl && (
            <div className="text-center">
              <img src={qrCodeDataUrl} alt="Waybill QR Code" className="w-16 h-16 border border-slate-300 rounded p-0.5 bg-white" />
              <div className="text-[8px] font-mono text-slate-500 mt-0.5">SCAN TO VERIFY</div>
            </div>
          )}
        </div>
      </div>

      {/* Parties: Sender & Receiver */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="border border-slate-300 p-2.5 rounded bg-white">
          <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-200">
            SENDER (CONSIGNOR)
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">{shipment.sender.fullName}</div>
          <div className="font-medium text-slate-700">Phone: <span className="font-bold">{shipment.sender.phone}</span></div>
          {shipment.sender.altPhone && <div className="text-slate-600">Alt Phone: {shipment.sender.altPhone}</div>}
          {shipment.sender.address && <div className="text-slate-600 text-[10px] truncate">{shipment.sender.address}</div>}
        </div>

        <div className="border border-slate-300 p-2.5 rounded bg-slate-50/70">
          <div className="text-[10px] uppercase font-bold text-slate-500 pb-1 border-b border-slate-200">
            RECEIVER (CONSIGNEE)
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">{shipment.receiver.fullName}</div>
          <div className="font-medium text-slate-700">Phone: <span className="font-bold">{shipment.receiver.phone}</span></div>
          {shipment.receiver.altPhone && <div className="text-slate-600">Alt Phone: {shipment.receiver.altPhone}</div>}
          <div className="text-[10px] text-amber-800 font-semibold mt-0.5">
            Pickup Office: {shipment.destinationBranch.name}
          </div>
        </div>
      </div>

      {/* Parcel Information */}
      <div className="border border-slate-300 rounded mb-3 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-300">
            <tr>
              <th className="p-2">Category</th>
              <th className="p-2">Description</th>
              <th className="p-2 text-center">Pkgs</th>
              <th className="p-2 text-center">Weight</th>
              <th className="p-2 text-right">Declared Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2 font-semibold text-slate-800">{shipment.parcelCategory}</td>
              <td className="p-2 text-slate-700">{shipment.description}</td>
              <td className="p-2 text-center font-bold">{shipment.packagesCount}</td>
              <td className="p-2 text-center">{shipment.weightKg ? `${shipment.weightKg} kg` : "—"}</td>
              <td className="p-2 text-right">{shipment.declaredValue ? formatNaira(shipment.declaredValue) : "—"}</td>
            </tr>
          </tbody>
        </table>
        {shipment.specialInstructions && (
          <div className="bg-amber-50 p-2 text-[11px] text-amber-900 border-t border-amber-200 font-medium">
            <span className="font-bold uppercase text-[10px]">Special Instructions:</span> {shipment.specialInstructions}
          </div>
        )}
      </div>

      {/* Payment & Charges */}
      <div className="grid grid-cols-12 gap-3 mb-3 items-center">
        <div className="col-span-7 bg-slate-50 p-2.5 rounded border border-slate-200 text-[11px]">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Payment Method:</span>
              <span className="font-bold text-slate-800">{shipment.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Payment Status:</span>
              <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] inline-block ${
                shipment.paymentStatus === "PAID"
                  ? "bg-emerald-100 text-emerald-800"
                  : shipment.paymentStatus === "PARTIALLY_PAID"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}>
                {shipment.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-5 border border-slate-300 p-2.5 rounded bg-white text-right">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-600">Transport Charge:</span>
            <span className="font-bold text-slate-900">{formatNaira(shipment.transportCharge)}</span>
          </div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-slate-600">Amount Paid:</span>
            <span className="font-bold text-emerald-700">{formatNaira(shipment.amountPaid)}</span>
          </div>
          {shipment.balanceAmount > 0 && (
            <div className="flex justify-between text-xs font-black text-rose-700 border-t border-slate-200 pt-1">
              <span>Balance Due at Collection:</span>
              <span>{formatNaira(shipment.balanceAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Signatures & Terms */}
      <div className="grid grid-cols-12 gap-3 pt-2 border-t border-slate-300 text-[9px] text-slate-500">
        <div className="col-span-7">
          <p className="font-bold text-slate-700 mb-0.5">TERMS & CONDITIONS</p>
          <p className="leading-tight">{terms}</p>
          <p className="mt-1 text-[8px] text-slate-400">Created by: {shipment.createdBy.name} | System Waybill Valid Without Alteration</p>
        </div>

        <div className="col-span-5 grid grid-cols-2 gap-2 text-center">
          <div className="border-t border-slate-400 pt-1 mt-6">
            <span className="font-semibold text-slate-700 block">Sender Signature</span>
          </div>
          <div className="border-t border-slate-400 pt-1 mt-6">
            <span className="font-semibold text-slate-700 block">Officer Signature</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-2xl max-w-3xl w-full p-6 shadow-2xl my-auto printable-area">
        {/* Modal Controls (Hidden during print) */}
        <div className="no-print flex items-center justify-between pb-4 border-b border-slate-300 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Waybill Document</span>
              <span className="font-mono text-sm bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                {shipment.waybillNumber}
              </span>
            </h2>
            <p className="text-xs text-slate-600">Standard Office Dual-Slip Format (Consignor & Destination Copies)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-4 py-2 rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Waybill</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="print-content">
          {renderSlip("COPY 1: CONSIGNOR / SENDER RECEIPT")}
          <div className="border-b-2 border-dashed border-slate-400 my-4 text-center relative no-print">
            <span className="bg-slate-100 px-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest relative -top-2">
              ✂ Cut along dotted line
            </span>
          </div>
          {renderSlip("COPY 2: ATTACH TO PARCEL / DESTINATION OFFICE COPY")}
        </div>
      </div>
    </div>
  );
}
