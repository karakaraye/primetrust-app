import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatNaira, formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  FileText,
  Clock,
  Truck,
  Inbox,
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Building2,
  MapPin,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === "OPERATIONS_STAFF") {
    redirect("/waybills");
  }

  // Fetch branches
  const phcBranch = await db.branch.findUnique({ where: { code: "PHC" } });
  const abiBranch = await db.branch.findUnique({ where: { code: "ABI" } });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Operational Counts
  const [
    waybillsTodayCount,
    awaitingDispatchCount,
    inTransitCount,
    incomingCount,
    readyForPickupCount,
    collectedTodayCount,
    uncollectedCount,
    revenueTodayAggr,
    recentShipments,
    recentManifests,
    // Route 1: PHC -> ABI
    phcAwaiting,
    phcTransit,
    phcArrived,
    phcReady,
    // Route 2: ABI -> PHC
    abiAwaiting,
    abiTransit,
    abiArrived,
    abiReady,
  ] = await Promise.all([
    // Waybills created today
    db.shipment.count({
      where: { createdAt: { gte: todayStart } },
    }),
    // Awaiting dispatch
    db.shipment.count({
      where: { status: "AWAITING_DISPATCH" },
    }),
    // In transit
    db.shipment.count({
      where: { status: "IN_TRANSIT" },
    }),
    // Incoming parcels (if branch admin/staff, filtered by their destination branch)
    db.shipment.count({
      where: {
        status: { in: ["IN_TRANSIT", "ARRIVED_AT_DESTINATION"] },
        ...(user?.branchId ? { destinationBranchId: user.branchId } : {}),
      },
    }),
    // Ready for pickup
    db.shipment.count({
      where: {
        status: "READY_FOR_PICKUP",
        ...(user?.branchId ? { destinationBranchId: user.branchId } : {}),
      },
    }),
    // Collected today
    db.collection.count({
      where: {
        collectionDate: { gte: todayStart },
        ...(user?.branchId ? { branchId: user.branchId } : {}),
      },
    }),
    // Uncollected (Ready for pickup >= 3 days)
    db.shipment.count({
      where: {
        status: "READY_FOR_PICKUP",
        pickupCodeGeneratedAt: { lte: new Date(Date.now() - 3 * 86400000) },
      },
    }),
    // Revenue today
    db.payment.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { amount: true },
    }),
    // Recent shipments
    db.shipment.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        originBranch: true,
        destinationBranch: true,
        sender: true,
        receiver: true,
      },
    }),
    // Recent manifests
    db.manifest.findMany({
      take: 4,
      orderBy: { createdAt: "desc" },
      include: {
        originBranch: true,
        destinationBranch: true,
        createdBy: { select: { name: true } },
      },
    }),
    // PHC -> ABI metrics
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: phcBranch.id, destinationBranchId: abiBranch.id, status: "AWAITING_DISPATCH" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: phcBranch.id, destinationBranchId: abiBranch.id, status: "IN_TRANSIT" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: phcBranch.id, destinationBranchId: abiBranch.id, status: "ARRIVED_AT_DESTINATION" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: phcBranch.id, destinationBranchId: abiBranch.id, status: "READY_FOR_PICKUP" } })
      : 0,
    // ABI -> PHC metrics
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: abiBranch.id, destinationBranchId: phcBranch.id, status: "AWAITING_DISPATCH" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: abiBranch.id, destinationBranchId: phcBranch.id, status: "IN_TRANSIT" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: abiBranch.id, destinationBranchId: phcBranch.id, status: "ARRIVED_AT_DESTINATION" } })
      : 0,
    phcBranch && abiBranch
      ? db.shipment.count({ where: { originBranchId: abiBranch.id, destinationBranchId: phcBranch.id, status: "READY_FOR_PICKUP" } })
      : 0,
  ]);

  const totalRevenueToday = revenueTodayAggr._sum.amount || 0;

  const kpis = [
    { label: "Waybills Created Today", value: waybillsTodayCount, icon: FileText, color: "text-blue-600", bg: "bg-blue-50", href: "/waybills" },
    { label: "Awaiting Dispatch", value: awaitingDispatchCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", href: "/manifests/new" },
    { label: "In Transit", value: inTransitCount, icon: Truck, color: "text-purple-600", bg: "bg-purple-50", href: "/manifests" },
    { label: "Incoming Manifests", value: incomingCount, icon: Inbox, color: "text-cyan-600", bg: "bg-cyan-50", href: "/incoming" },
    { label: "Ready for Pickup", value: readyForPickupCount, icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50", href: "/ready-for-pickup" },
    { label: "Collected Today", value: collectedTodayCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", href: "/collections" },
    { label: "Uncollected (3+ Days)", value: uncollectedCount, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", href: "/uncollected" },
    { label: "Revenue Collected Today", value: formatNaira(totalRevenueToday), icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-100", href: "/reports", isCurrency: true },
  ];

  return (
    <AppLayout>
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operations Dashboard</h1>
            <span className="bg-brand-100 text-brand-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Live Network
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <strong className="text-slate-800">{user?.name}</strong> •{" "}
            {user?.branchName ? `Operational Node: ${user.branchName} (${user.branchCode})` : "Headquarters Global View"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Link
            href="/waybills/new"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Waybill</span>
          </Link>
          <Link
            href="/collections"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Customer Pickup</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-brand-300 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider line-clamp-1">
                  {kpi.label}
                </span>
                <div className={`p-2.5 rounded-xl ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black ${kpi.isCurrency ? "text-emerald-700" : "text-slate-900"} tracking-tight`}>
                {kpi.value}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 mt-2 group-hover:translate-x-1 transition">
                <span>Manage view</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bidirectional Route Activity Monitoring */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs mb-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              <span>Interstate Corridor Operations: Port Harcourt ⇄ Abia</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking of parcels along the bidirectional freight corridor
            </p>
          </div>
          <Link
            href="/manifests"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>All Manifests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Corridor 1: Port Harcourt -> Abia */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/50 to-slate-50 border border-blue-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-200/60">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-blue-900 bg-blue-200/70 px-2 py-0.5 rounded">
                  PHC ➔ ABI
                </span>
                <span className="text-xs font-bold text-slate-800">Port Harcourt to Abia</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full uppercase">
                Outbound PHC
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Awaiting</div>
                <div className="text-lg font-black text-amber-600 mt-0.5">{phcAwaiting}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">In Transit</div>
                <div className="text-lg font-black text-purple-600 mt-0.5">{phcTransit}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Arrived</div>
                <div className="text-lg font-black text-cyan-600 mt-0.5">{phcArrived}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Ready</div>
                <div className="text-lg font-black text-emerald-600 mt-0.5">{phcReady}</div>
              </div>
            </div>
          </div>

          {/* Corridor 2: Abia -> Port Harcourt */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/50 to-slate-50 border border-emerald-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-200/60">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded">
                  ABI ➔ PHC
                </span>
                <span className="text-xs font-bold text-slate-800">Abia to Port Harcourt</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                Outbound ABI
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Awaiting</div>
                <div className="text-lg font-black text-amber-600 mt-0.5">{abiAwaiting}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">In Transit</div>
                <div className="text-lg font-black text-purple-600 mt-0.5">{abiTransit}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Arrived</div>
                <div className="text-lg font-black text-cyan-600 mt-0.5">{abiArrived}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] uppercase font-bold text-slate-500">Ready</div>
                <div className="text-lg font-black text-emerald-600 mt-0.5">{abiReady}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Waybills & Operational Manifests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Waybills Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Recent Waybill Registrations</h3>
              <p className="text-xs text-slate-500">Latest parcels booked across offices</p>
            </div>
            <Link
              href="/waybills"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Waybill #</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3">Receiver</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentShipments.map((s) => {
                  const badge = getStatusBadgeInfo(s.status);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <Link
                          href={`/waybills/${s.id}`}
                          className="font-mono font-bold text-brand-600 hover:text-brand-700"
                        >
                          {s.waybillNumber}
                        </Link>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(s.createdAt)}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono font-semibold text-slate-700">
                          {s.originBranch.code} ➔ {s.destinationBranch.code}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{s.receiver.fullName}</div>
                        <div className="text-[10px] text-slate-500">{s.receiver.phone}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/waybills/${s.id}`}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded-lg inline-flex items-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Manifests */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Interstate Dispatch Manifests</h3>
              <p className="text-xs text-slate-500">Active batch transfer schedules</p>
            </div>
            <Link
              href="/manifests/new"
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <span>+ Create</span>
            </Link>
          </div>

          <div className="space-y-3">
            {recentManifests.map((m) => {
              const badge = getStatusBadgeInfo(m.status);
              return (
                <Link
                  key={m.id}
                  href={`/manifests/${m.id}`}
                  className="block p-3.5 rounded-2xl border border-slate-200/80 hover:border-brand-300 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {m.manifestNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                    <span>{m.originBranch.name}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span>{m.destinationBranch.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>Total Parcels: <strong className="text-slate-800">{m.totalParcels}</strong></span>
                    <span>Created by: {m.createdBy.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
