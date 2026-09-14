"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider } from "@/components/ui/Toast";
import { PrintableWaybill } from "@/components/waybill/PrintableWaybill";
import { formatNaira, formatDate, getStatusBadgeInfo, getPaymentBadgeInfo } from "@/lib/utils";
import {
  FileText,
  Search,
  Filter,
  PlusCircle,
  Printer,
  Eye,
  ArrowRight,
  MapPin,
  RefreshCw,
  Building2,
  Calendar,
} from "lucide-react";

export default function WaybillsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [originFilter, setOriginFilter] = useState("ALL");
  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Printable modal
  const [selectedPrintShipment, setSelectedPrintShipment] = useState<any>(null);

  const fetchShipments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (originFilter !== "ALL") params.set("origin", originFilter);
      if (destinationFilter !== "ALL") params.set("destination", destinationFilter);
      if (paymentFilter !== "ALL") params.set("paymentStatus", paymentFilter);

      const [shipRes, branchRes] = await Promise.all([
        fetch(`/api/shipments?${params.toString()}`),
        fetch("/api/branches"),
      ]);

      if (shipRes.ok) {
        const data = await shipRes.json();
        setShipments(data.shipments || []);
      }
      if (branchRes.ok) {
        const data = await branchRes.json();
        setBranches(data.branches || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [statusFilter, originFilter, destinationFilter, paymentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchShipments();
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={currentUser} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={currentUser} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Waybill Registry</h1>
                  <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {shipments.length} Total
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse, filter, and track all interstate shipments across Port Harcourt and Abia
                </p>
              </div>

              <Link
                href="/waybills/new"
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition self-start"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Waybill</span>
              </Link>
            </div>

            {/* Filters Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6 space-y-3">
              <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Waybill #, Sender, Receiver, Phone..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setOriginFilter("ALL");
                    setDestinationFilter("ALL");
                    setPaymentFilter("ALL");
                  }}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </form>

              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[11px] uppercase">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="AWAITING_DISPATCH">Awaiting Dispatch</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="ARRIVED_AT_DESTINATION">Arrived at Destination</option>
                    <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                    <option value="COLLECTED">Collected</option>
                    <option value="ON_HOLD">On Hold</option>
                  </select>
                </div>

                {/* Origin Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[11px] uppercase">Origin:</span>
                  <select
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Origins</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[11px] uppercase">Destination:</span>
                  <select
                    value={destinationFilter}
                    onChange={(e) => setDestinationFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Destinations</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 text-[11px] uppercase">Payment:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIALLY_PAID">Partially Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Waybills Table */}
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Waybill Number</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">Sender</th>
                      <th className="py-3 px-4">Receiver</th>
                      <th className="py-3 px-4">Parcel Details</th>
                      <th className="py-3 px-4">Charge & Status</th>
                      <th className="py-3 px-4">Shipment Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <span className="animate-pulse">Loading waybills registry...</span>
                        </td>
                      </tr>
                    ) : shipments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500">
                          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-sm text-slate-700">No shipments found</p>
                          <p className="text-xs text-slate-400 mt-0.5">Try adjusting search filters or create a new waybill</p>
                        </td>
                      </tr>
                    ) : (
                      shipments.map((s) => {
                        const statusBadge = getStatusBadgeInfo(s.status);
                        const payBadge = getPaymentBadgeInfo(s.paymentStatus);

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4">
                              <Link
                                href={`/waybills/${s.id}`}
                                className="font-mono font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                              >
                                <span>{s.waybillNumber}</span>
                              </Link>
                              <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.createdAt)}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1 font-mono font-black text-slate-800">
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded">{s.originBranch.code}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded">{s.destinationBranch.code}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{s.sender.fullName}</div>
                              <div className="text-[10px] text-slate-500">{s.sender.phone}</div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{s.receiver.fullName}</div>
                              <div className="text-[10px] text-slate-500">{s.receiver.phone}</div>
                            </td>

                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-semibold text-slate-800 truncate">{s.description}</div>
                              <div className="text-[10px] text-slate-500">
                                {s.packagesCount} pkg(s) • {s.parcelCategory} {s.weightKg ? `• ${s.weightKg}kg` : ""}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{formatNaira(s.transportCharge)}</div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${payBadge.color}`}>
                                {payBadge.label} ({s.paymentMethod})
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge.color}`}>
                                {statusBadge.label}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedPrintShipment(s)}
                                  title="Print Waybill Slips"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <Link
                                  href={`/waybills/${s.id}`}
                                  title="View Details"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-700 transition"
                                >
                                  <Eye className="w-3.5 h-3.5" />
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

            {/* Printable Waybill Modal */}
            {selectedPrintShipment && (
              <PrintableWaybill
                shipment={selectedPrintShipment}
                onClose={() => setSelectedPrintShipment(null)}
              />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
