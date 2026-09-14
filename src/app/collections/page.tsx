"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatNaira, formatDate, getStatusBadgeInfo } from "@/lib/utils";
import {
  CheckCircle2,
  Search,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Package,
  AlertCircle,
  FileCheck,
  ArrowRight,
  Printer,
  X,
} from "lucide-react";

function CollectionsContent() {
  const searchParams = useSearchParams();
  const initialWaybill = searchParams?.get("waybill") || "";
  const { success, error } = useToast();

  const [searchQuery, setSearchQuery] = useState(initialWaybill);
  const [matchingParcels, setMatchingParcels] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Selected Parcel
  const [selectedParcel, setSelectedParcel] = useState<any>(null);

  // Verification Form
  const [verificationMethod, setVerificationMethod] = useState<"PICKUP_CODE" | "ID_VERIFICATION">("PICKUP_CODE");
  const [pickupCodeInput, setPickupCodeInput] = useState("");
  const [idType, setIdType] = useState("NATIONAL_ID");
  const [idReference, setIdReference] = useState("");

  // Collector Information
  const [collectorName, setCollectorName] = useState("");
  const [collectorPhone, setCollectorPhone] = useState("");
  const [relationship, setRelationship] = useState("SELF");
  const [remarks, setRemarks] = useState("");

  const [isVerified, setIsVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedCollection, setCompletedCollection] = useState<any>(null);

  // Auto search if initialWaybill passed
  useEffect(() => {
    if (initialWaybill) {
      handleSearch(initialWaybill);
    }
  }, [initialWaybill]);

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim() || query.trim().length < 2) return;
    setIsSearching(true);
    setSelectedParcel(null);
    setIsVerified(false);
    setCompletedCollection(null);

    try {
      const res = await fetch(`/api/shipments?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        // Filter to parcels that are ready for pickup or arrived
        const eligible = (data.shipments || []).filter(
          (s: any) => s.status === "READY_FOR_PICKUP" || s.status === "ARRIVED_AT_DESTINATION" || s.status === "COLLECTED"
        );
        setMatchingParcels(eligible);

        if (eligible.length === 1 && eligible[0].status !== "COLLECTED") {
          selectParcel(eligible[0]);
        }
      }
    } catch (err: any) {
      error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const selectParcel = (p: any) => {
    setSelectedParcel(p);
    setCollectorName(p.receiver?.fullName || "");
    setCollectorPhone(p.receiver?.phone || "");
    setRelationship("SELF");
    setPickupCodeInput("");
    setIsVerified(false);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationMethod === "PICKUP_CODE") {
      const cleanInput = pickupCodeInput.trim();
      const actualCode = (selectedParcel.pickupCode || "").trim();

      if (!cleanInput) {
        error("Please enter the 6-digit pickup code");
        return;
      }

      if (cleanInput !== actualCode) {
        error("Incorrect pickup code. Please verify SMS PIN or use official ID document fallback.");
        return;
      }

      setIsVerified(true);
      success("Receiver Verified Successfully via Secure Pickup PIN! ✓");
    } else {
      if (!idReference.trim()) {
        error("Please enter document reference number");
        return;
      }
      setIsVerified(true);
      success("Receiver Verified Successfully via Official Identification! ✓");
    }
  };

  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParcel || !isVerified) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/collections/verify-and-collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipmentId: selectedParcel.id,
          pickupCodeInput,
          verificationMethod,
          collectorName,
          collectorPhone,
          relationship,
          idType: verificationMethod === "ID_VERIFICATION" ? idType : null,
          idReference: verificationMethod === "ID_VERIFICATION" ? idReference : null,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to confirm collection");
        setIsSubmitting(false);
        return;
      }

      success(`Parcel ${selectedParcel.waybillNumber} collected and released successfully!`);
      setCompletedCollection(data);
      setSelectedParcel(null);
      setMatchingParcels([]);
    } catch (err: any) {
      error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 8) return phone;
    return phone.substring(0, 4) + "****" + phone.substring(phone.length - 4);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Customer Pickup Verification Terminal</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              Counter Release
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verify receiver identity using secret SMS PIN or government ID document, and record immutable release receipt
          </p>
        </div>
      </div>

      {/* Search Parcel Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-wrap gap-3"
        >
          <div className="flex-1 min-w-[280px] relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter Waybill Number (e.g. PTL-PHC-ABI-260911-0002) or Receiver Phone Number..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSearching ? <span className="animate-pulse">Searching...</span> : <span>Search Parcel</span>}
          </button>
        </form>

        {/* Search Results List */}
        {matchingParcels.length > 0 && !selectedParcel && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Matching Parcels at Counter ({matchingParcels.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matchingParcels.map((p) => {
                const isCollected = p.status === "COLLECTED";
                return (
                  <div
                    key={p.id}
                    onClick={() => !isCollected && selectParcel(p)}
                    className={`p-4 rounded-2xl border transition ${
                      isCollected
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md cursor-pointer"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-brand-600">{p.waybillNumber}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCollected
                          ? "bg-slate-200 text-slate-700"
                          : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900">{p.receiver?.fullName}</div>
                    <div className="text-xs text-slate-500">Phone: {maskPhone(p.receiver?.phone)}</div>
                    <div className="text-xs text-slate-700 mt-1 truncate">{p.description}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Parcel Verification & Collection Workflow */}
      {selectedParcel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Parcel Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-800">
                  VERIFICATION TARGET
                </span>
                <button
                  onClick={() => setSelectedParcel(null)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Change Parcel
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Waybill Number:</span>
                  <span className="font-mono text-base font-black text-slate-900">{selectedParcel.waybillNumber}</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-slate-400 uppercase text-[10px] font-bold">Registered Receiver:</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedParcel.receiver.fullName}</div>
                  <div className="text-slate-600 font-semibold mt-0.5">Masked Phone: {maskPhone(selectedParcel.receiver.phone)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block">Origin:</span>
                    <strong className="text-slate-800">{selectedParcel.originBranch.name}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block">Collection Hub:</span>
                    <strong className="text-emerald-800">{selectedParcel.destinationBranch.name}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Parcel Description:</span>
                  <p className="font-medium text-slate-800 mt-0.5">{selectedParcel.description}</p>
                </div>

                <div className="flex justify-between py-2 border-t border-slate-100">
                  <span className="text-slate-500">Transport Charge:</span>
                  <span className="font-bold text-slate-900">{formatNaira(selectedParcel.transportCharge)}</span>
                </div>

                <div className="flex justify-between py-2 border-t border-slate-100">
                  <span className="text-slate-500">Balance Due:</span>
                  <span className={`font-black ${selectedParcel.balanceAmount > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                    {formatNaira(selectedParcel.balanceAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Verification & Collector Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-600" />
                  <span>Step 1: Receiver Identity Verification</span>
                </h3>

                {isVerified && (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>

              {/* Verification Method Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod("PICKUP_CODE");
                    setIsVerified(false);
                  }}
                  className={`flex-1 py-2 rounded-xl transition ${
                    verificationMethod === "PICKUP_CODE"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Secret Pickup Code (PIN)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerificationMethod("ID_VERIFICATION");
                    setIsVerified(false);
                  }}
                  className={`flex-1 py-2 rounded-xl transition ${
                    verificationMethod === "ID_VERIFICATION"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Official Government ID (Fallback)
                </button>
              </div>

              {!isVerified ? (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  {verificationMethod === "PICKUP_CODE" ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Enter 6-Digit Pickup Code from Customer SMS
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={pickupCodeInput}
                        onChange={(e) => setPickupCodeInput(e.target.value.trim())}
                        placeholder="e.g. 583921"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-center font-mono font-black text-2xl tracking-widest text-slate-900 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">ID Type</label>
                        <select
                          value={idType}
                          onChange={(e) => setIdType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                        >
                          <option value="NATIONAL_ID">National ID (NIN)</option>
                          <option value="DRIVERS_LICENSE">Driver's License</option>
                          <option value="VOTERS_CARD">Voter's Card</option>
                          <option value="PASSPORT">International Passport</option>
                          <option value="OTHER">Official Staff ID</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Document Reference #</label>
                        <input
                          type="text"
                          required
                          value={idReference}
                          onChange={(e) => setIdReference(e.target.value)}
                          placeholder="e.g. NIN-9988223311"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Verify Receiver Identity
                  </button>
                </form>
              ) : (
                /* Step 2: Collector Details & Confirmation */
                <form onSubmit={handleConfirmCollection} className="space-y-4 pt-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Identity verified. Please confirm collector details to complete release.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Collector Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={collectorName}
                        onChange={(e) => setCollectorName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Collector Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={collectorPhone}
                        onChange={(e) => setCollectorPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Relationship to Receiver
                      </label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                      >
                        <option value="SELF">Self (Consignee in person)</option>
                        <option value="SPOUSE">Spouse / Partner</option>
                        <option value="COLLEAGUE">Colleague / Work Associate</option>
                        <option value="RELATIVE">Family / Relative</option>
                        <option value="AGENT">Dispatch / Delivery Agent</option>
                        <option value="OTHER">Other Authorized Representative</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Release Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="e.g. Inspected and released in good condition"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsVerified(false)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                    >
                      Re-verify
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmitting ? "Confirming Release..." : "Confirm Collection & Release Parcel"}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Confirmation Receipt Screen */}
      {completedCollection && (
        <div className="bg-white border-2 border-emerald-500 rounded-3xl p-8 shadow-xl text-center max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 uppercase">
            PARCEL SUCCESSFULLY COLLECTED
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Official handover completed. The transaction record has been permanently logged in the audit ledger.
          </p>

          <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Collector Name:</span>
              <strong className="text-slate-900 font-bold">{completedCollection.collection.collectorName}</strong> ({completedCollection.collection.relationship})
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Collector Phone:</span>
              <strong className="text-slate-900 font-bold">{completedCollection.collection.collectorPhone}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Verification Mode:</span>
              <span className="text-emerald-700 font-bold">{completedCollection.collection.verificationMethod}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Collection Timestamp:</span>
              <span className="text-slate-800 font-mono">{formatDate(completedCollection.collection.collectionDate)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href={`/waybills/${completedCollection.shipment.id}`}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
            >
              View Full Shipment Audit Trail
            </Link>
            <button
              onClick={() => {
                setCompletedCollection(null);
                setSearchQuery("");
              }}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
            >
              Process Next Collection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <React.Suspense
              fallback={
                <div className="p-12 text-center text-slate-500">
                  <span className="animate-pulse">Loading collection terminal...</span>
                </div>
              }
            >
              <CollectionsContent />
            </React.Suspense>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

