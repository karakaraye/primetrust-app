"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  PlusCircle,
  MapPin,
  Phone,
  Mail,
  Users,
  Package,
  X,
} from "lucide-react";

function BranchesContent() {
  const { success, error } = useToast();
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branches");
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches || []);
      }
    } catch (err: any) {
      error("Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, address, phone, email }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to create branch");
        setIsSubmitting(false);
        return;
      }

      success(`Branch ${data.branch.name} (${data.branch.code}) added successfully!`);
      setShowAddModal(false);
      setName("");
      setCode("");
      setAddress("");
      setPhone("");
      setEmail("");
      fetchBranches();
    } catch (err: any) {
      error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Branch Network Nodes</h1>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {branches.length} Active Hubs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating branch registry. Manage authorized locations across the logistics network.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-brand-600/20 transition self-start"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Provision New Branch</span>
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-500">
            <span className="animate-pulse">Loading branch nodes...</span>
          </div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-brand-300 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-black text-base text-brand-700 bg-brand-50 px-2.5 py-0.5 rounded-xl border border-brand-200">
                    {b.code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {b.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">{b.name}</h3>
                <p className="text-xs text-slate-600 mb-4 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{b.address}</span>
                </p>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{b.phone}</span>
                  </div>
                  {b.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-[11px]">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Staff:</span>
                  <strong className="text-slate-900 text-xs">{b._count?.users || 0}</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Outbound:</span>
                  <strong className="text-slate-900 text-xs">{b._count?.originShipments || 0}</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Inbound:</span>
                  <strong className="text-brand-700 text-xs">{b._count?.destinationShipments || 0}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Provision New Branch Node</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Regional Office / Extension Hub"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Code (3-4 Letters) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. EXT or REG"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-brand-700 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Physical Office Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Office Address / Commercial Street"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +234 800 000 0000"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Branch Email <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. office@logisticsops.ng"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? "Provisioning..." : "Add Branch Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BranchesPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <BranchesContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
