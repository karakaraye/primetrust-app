"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Calendar,
  Building2,
  CreditCard,
  Truck,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

function ReportsContent() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"WAYBILL" | "REVENUE" | "BRANCH" | "COLLECTION" | "MANIFEST">("REVENUE");
  const [shipments, setShipments] = useState<any[]>([]);
  const [manifests, setManifests] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [sRes, mRes, bRes] = await Promise.all([
          fetch("/api/shipments?limit=500"),
          fetch("/api/manifests"),
          fetch("/api/branches"),
        ]);

        if (sRes.ok) {
          const sData = await sRes.json();
          setShipments(sData.shipments || []);
        }
        if (mRes.ok) {
          const mData = await mRes.json();
          setManifests(mData.manifests || []);
        }
        if (bRes.ok) {
          const bData = await bRes.json();
          setBranches(bData.branches || []);
        }
      } catch (err: any) {
        error("Failed to load reporting data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Export CSV Helper
  const downloadCSV = (filename: string, rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success(`Report exported to ${filename}.csv`);
  };

  // Calculations: Revenue
  const totalWaybills = shipments.length;
  const totalFreightCharges = shipments.reduce((sum, s) => sum + (s.transportCharge || 0), 0);
  const totalAmountPaid = shipments.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const totalBalanceDue = shipments.reduce((sum, s) => sum + (s.balanceAmount || 0), 0);

  const cashPayments = shipments.filter((s) => s.paymentMethod === "CASH").reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const transferPayments = shipments.filter((s) => s.paymentMethod === "TRANSFER").reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const posPayments = shipments.filter((s) => s.paymentMethod === "POS").reduce((sum, s) => sum + (s.amountPaid || 0), 0);

  const handleExport = () => {
    if (activeTab === "WAYBILL") {
      const rows = [
        ["Waybill Number", "Date", "Origin", "Destination", "Sender", "Receiver", "Description", "Charge (NGN)", "Paid (NGN)", "Balance (NGN)", "Payment Status", "Shipment Status"],
        ...shipments.map((s) => [
          s.waybillNumber,
          formatDate(s.createdAt),
          s.originBranch.name,
          s.destinationBranch.name,
          s.sender.fullName,
          s.receiver.fullName,
          s.description,
          String(s.transportCharge),
          String(s.amountPaid),
          String(s.balanceAmount),
          s.paymentStatus,
          s.status,
        ]),
      ];
      downloadCSV("Waybill_Operations_Report", rows);
    } else if (activeTab === "REVENUE") {
      const rows = [
        ["Metric", "Value"],
        ["Total Waybills Registered", String(totalWaybills)],
        ["Total Freight Charges (NGN)", String(totalFreightCharges)],
        ["Total Amount Settled (NGN)", String(totalAmountPaid)],
        ["Total Outstanding Balance (NGN)", String(totalBalanceDue)],
        ["Cash Collections (NGN)", String(cashPayments)],
        ["Bank Transfer Collections (NGN)", String(transferPayments)],
        ["POS Terminal Collections (NGN)", String(posPayments)],
      ];
      downloadCSV("Revenue_Financial_Report", rows);
    } else if (activeTab === "BRANCH") {
      const rows = [
        ["Branch Name", "Code", "Outgoing Parcels", "Incoming Parcels", "Ready for Pickup", "Collected", "Total Outbound Revenue (NGN)"],
        ...branches.map((b) => {
          const outParcels = shipments.filter((s) => s.originBranchId === b.id);
          const inParcels = shipments.filter((s) => s.destinationBranchId === b.id);
          const ready = inParcels.filter((s) => s.status === "READY_FOR_PICKUP").length;
          const collected = inParcels.filter((s) => s.status === "COLLECTED").length;
          const revenue = outParcels.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
          return [b.name, b.code, String(outParcels.length), String(inParcels.length), String(ready), String(collected), String(revenue)];
        }),
      ];
      downloadCSV("Branch_Operations_Report", rows);
    } else if (activeTab === "MANIFEST") {
      const rows = [
        ["Manifest Number", "Date", "Origin", "Destination", "Parcels Count", "Driver", "Vehicle", "Status"],
        ...manifests.map((m) => [
          m.manifestNumber,
          formatDate(m.createdAt),
          m.originBranch.name,
          m.destinationBranch.name,
          String(m.totalParcels),
          m.driverName || "N/A",
          m.vehicleReg || "N/A",
          m.status,
        ]),
      ];
      downloadCSV("Manifest_Dispatches_Report", rows);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Operations & Financial Reports</h1>
            <span className="bg-brand-100 text-brand-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              Analytics
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interstate freight analytics, channel revenue breakdowns in Naira (₦), branch throughput, and CSV export
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition self-start"
        >
          <Download className="w-4 h-4" />
          <span>Export {activeTab} CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/80 rounded-2xl mb-8 text-xs font-bold max-w-2xl">
        {[
          { id: "REVENUE", label: "Revenue & Billing", icon: CreditCard },
          { id: "WAYBILL", label: "Waybills Summary", icon: FileSpreadsheet },
          { id: "BRANCH", label: "Branch Operations", icon: Building2 },
          { id: "MANIFEST", label: "Manifest Logistics", icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
                isActive ? "bg-white text-slate-950 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: REVENUE REPORT */}
      {activeTab === "REVENUE" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed Charges</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatNaira(totalFreightCharges)}</div>
              <span className="text-[11px] text-slate-500 mt-1 block">From {totalWaybills} waybills</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-800">Total Collected Settled</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{formatNaira(totalAmountPaid)}</div>
              <span className="text-[11px] text-emerald-600 mt-1 block">Paid in full / partial</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-rose-800">Outstanding Balances</span>
              <div className="text-2xl font-black text-rose-700 mt-1">{formatNaira(totalBalanceDue)}</div>
              <span className="text-[11px] text-rose-500 mt-1 block">Due upon destination pickup</span>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
              <span className="text-[10px] uppercase font-bold text-brand-800">Average Charge / Parcel</span>
              <div className="text-2xl font-black text-brand-700 mt-1">
                {formatNaira(totalWaybills > 0 ? totalFreightCharges / totalWaybills : 0)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Corridor freight average</span>
            </div>
          </div>

          {/* Payment Method Channels Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide mb-4 pb-2 border-b border-slate-100">
              Payment Method Settlement Channels (Naira ₦)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-700">Cash at Counter</span>
                  <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold">Physical</span>
                </div>
                <div className="text-xl font-black text-slate-900">{formatNaira(cashPayments)}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {((cashPayments / (totalAmountPaid || 1)) * 100).toFixed(1)}% of total settlements
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-blue-900">Direct Bank Transfer</span>
                  <span className="text-[10px] bg-blue-200 text-blue-800 px-2 py-0.5 rounded font-bold">Electronic</span>
                </div>
                <div className="text-xl font-black text-blue-900">{formatNaira(transferPayments)}</div>
                <div className="text-xs text-blue-700 mt-1">
                  {((transferPayments / (totalAmountPaid || 1)) * 100).toFixed(1)}% of total settlements
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-emerald-900">POS Card Machine</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold">Terminal</span>
                </div>
                <div className="text-xl font-black text-emerald-900">{formatNaira(posPayments)}</div>
                <div className="text-xs text-emerald-700 mt-1">
                  {((posPayments / (totalAmountPaid || 1)) * 100).toFixed(1)}% of total settlements
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WAYBILL REPORT */}
      {activeTab === "WAYBILL" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b">
                <tr>
                  <th className="p-3">Waybill #</th>
                  <th className="p-3">Route</th>
                  <th className="p-3">Sender</th>
                  <th className="p-3">Receiver</th>
                  <th className="p-3 text-right">Freight (₦)</th>
                  <th className="p-3 text-right">Settled (₦)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-brand-600">{s.waybillNumber}</td>
                    <td className="p-3 font-mono font-semibold">{s.originBranch.code} ➔ {s.destinationBranch.code}</td>
                    <td className="p-3">{s.sender.fullName}</td>
                    <td className="p-3">{s.receiver.fullName}</td>
                    <td className="p-3 text-right font-bold">{formatNaira(s.transportCharge)}</td>
                    <td className="p-3 text-right text-emerald-700 font-bold">{formatNaira(s.amountPaid)}</td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BRANCH REPORT */}
      {activeTab === "BRANCH" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {branches.map((b) => {
              const outbound = shipments.filter((s) => s.originBranchId === b.id);
              const inbound = shipments.filter((s) => s.destinationBranchId === b.id);
              const ready = inbound.filter((s) => s.status === "READY_FOR_PICKUP").length;
              const collected = inbound.filter((s) => s.status === "COLLECTED").length;
              const revenue = outbound.reduce((sum, s) => sum + (s.amountPaid || 0), 0);

              return (
                <div key={b.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">{b.name}</h4>
                      <span className="text-[11px] font-mono text-slate-500 font-bold">Branch Code: {b.code}</span>
                    </div>
                    <span className="text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl">
                      {formatNaira(revenue)} Revenue
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Outbound Parcels:</span>
                      <strong className="text-lg font-black text-slate-900">{outbound.length}</strong>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Inbound Parcels:</span>
                      <strong className="text-lg font-black text-slate-900">{inbound.length}</strong>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Ready for Pickup:</span>
                      <strong className="text-lg font-black text-emerald-600">{ready}</strong>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Collected Total:</span>
                      <strong className="text-lg font-black text-green-700">{collected}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: MANIFEST REPORT */}
      {activeTab === "MANIFEST" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase font-bold border-b">
                <tr>
                  <th className="p-3">Manifest #</th>
                  <th className="p-3">Route</th>
                  <th className="p-3 text-center">Total Parcels</th>
                  <th className="p-3">Driver / Vehicle</th>
                  <th className="p-3">Dispatched Time</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {manifests.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-brand-600">{m.manifestNumber}</td>
                    <td className="p-3 font-mono font-semibold">{m.originBranch.code} ➔ {m.destinationBranch.code}</td>
                    <td className="p-3 text-center font-bold">{m.totalParcels}</td>
                    <td className="p-3">{m.driverName ? `${m.driverName} (${m.vehicleReg || "—"})` : "—"}</td>
                    <td className="p-3 text-slate-500">{m.dispatchedAt ? formatDate(m.dispatchedAt) : "Not yet"}</td>
                    <td className="p-3 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <ReportsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
