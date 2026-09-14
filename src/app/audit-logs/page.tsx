"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  Lock,
  User,
  MapPin,
  Calendar,
} from "lucide-react";

function AuditLogsContent() {
  const { error } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.auditLogs || []);
      }
    } catch (err: any) {
      error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [actionFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security & Operational Audit Ledger</h1>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              Immutable
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-resistant historical audit logs of all waybills, dispatches, receiving inspections, and user actions
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-6 flex items-center gap-3 text-xs">
        <span className="font-bold text-slate-500 uppercase text-[11px]">Filter Action:</span>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-hidden"
        >
          <option value="ALL">All Actions</option>
          <option value="USER_LOGIN">User Logins</option>
          <option value="WAYBILL_CREATED">Waybill Created</option>
          <option value="MANIFEST_CREATED">Manifest Created</option>
          <option value="MANIFEST_DISPATCHED">Manifest Dispatched</option>
          <option value="MANIFEST_RECEIVED">Manifest Received</option>
          <option value="READY_FOR_PICKUP_ACTIVATED">Ready for Pickup</option>
          <option value="COLLECTION_CONFIRMED">Collection Confirmed</option>
          <option value="SHIPMENT_STATUS_UPDATED">Status Corrections</option>
          <option value="STAFF_CREATED">Staff Created</option>
          <option value="BRANCH_CREATED">Branch Created</option>
          <option value="SETTINGS_UPDATED">Settings Updated</option>
        </select>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 text-[10px] font-bold uppercase border-b">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Branch Node</th>
                <th className="py-3 px-4">Entity Target</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    <span className="animate-pulse">Loading immutable audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 font-sans">
                    No audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">{formatDate(log.createdAt)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                      <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-bold text-slate-800">{log.userName || "System"}</div>
                      <div className="text-[10px] text-slate-400">{log.userRole || "SYSTEM"}</div>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-700">
                      {log.branchCode ? `${log.branchCode}` : "Global HQ"}
                    </td>
                    <td className="py-3 px-4 text-brand-700 font-bold">
                      {log.entityType}: {log.entityId.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-sans max-w-xs truncate">
                      {log.details || "—"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(log.previousValue || log.newValue) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-sans font-bold"
                        >
                          View Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Audit Record Diff: {selectedLog.action}</h3>
                <span className="text-xs text-slate-500">{formatDate(selectedLog.createdAt)} by {selectedLog.userName}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {selectedLog.details && (
                <div className="p-3 bg-slate-50 rounded-xl text-slate-700 font-sans">
                  <strong>Description:</strong> {selectedLog.details}
                </div>
              )}

              {selectedLog.previousValue && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Previous State:</div>
                  <pre className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 overflow-x-auto text-[11px]">
                    {JSON.stringify(JSON.parse(selectedLog.previousValue), null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">New State:</div>
                  <pre className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 overflow-x-auto text-[11px]">
                    {JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <AuditLogsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
