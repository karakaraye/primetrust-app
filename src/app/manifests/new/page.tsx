"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { formatNaira, formatDate } from "@/lib/utils";
import {
  Truck,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  CheckSquare,
  Square,
  Package,
  User,
  ShieldCheck,
  AlertCircle,
  ScanBarcode,
  Search,
  Filter,
  Layers,
  Weight,
  DollarSign,
  Boxes,
  Lock,
  Send,
  Save,
  CheckCircle2,
} from "lucide-react";

function CreateManifestContent() {
  const router = useRouter();
  const { success, error, warning } = useToast();

  const [branches, setBranches] = useState<any[]>([]);
  const [originBranchId, setOriginBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");

  const [awaitingParcels, setAwaitingParcels] = useState<any[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Barcode / Scanner Input
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Fleet & Transport Details
  const [driverName, setDriverName] = useState("");
  const [vehicleReg, setVehicleReg] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [securitySeal, setSecuritySeal] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await fetch("/api/branches");
        if (res.ok) {
          const data = await res.json();
          const branchList = data.branches || [];
          setBranches(branchList);

          const phc = branchList.find((b: any) => b.code === "PHC");
          const abi = branchList.find((b: any) => b.code === "ABI");

          if (phc) setOriginBranchId(phc.id);
          if (abi) setDestinationBranchId(abi.id);
        }
      } catch (err: any) {
        error("Failed to load branches");
      }
    }
    loadBranches();
  }, []);

  // Fetch eligible shipments awaiting dispatch for selected origin & destination
  const loadAwaitingShipments = async () => {
    if (!originBranchId || !destinationBranchId) return;
    if (originBranchId === destinationBranchId) {
      setAwaitingParcels([]);
      setSelectedParcelIds([]);
      return;
    }

    setLoadingParcels(true);
    try {
      const res = await fetch(
        `/api/shipments?origin=${originBranchId}&destination=${destinationBranchId}&status=AWAITING_DISPATCH&unmanifestedOnly=true`
      );
      if (res.ok) {
        const data = await res.json();
        const items = data.shipments || [];
        setAwaitingParcels(items);
        // By default select all unmanifested parcels for fast staging
        setSelectedParcelIds(items.map((s: any) => s.id));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingParcels(false);
    }
  };

  useEffect(() => {
    loadAwaitingShipments();
  }, [originBranchId, destinationBranchId]);

  const handleSwapRoute = () => {
    const temp = originBranchId;
    setOriginBranchId(destinationBranchId);
    setDestinationBranchId(temp);
  };

  const toggleSelectAll = () => {
    if (selectedParcelIds.length === filteredParcels.length) {
      // Deselect filtered
      const filteredIds = new Set(filteredParcels.map((p) => p.id));
      setSelectedParcelIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      // Select all filtered
      const allFilteredIds = filteredParcels.map((p) => p.id);
      setSelectedParcelIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const toggleSelectParcel = (id: string) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Quick Barcode / Waybill Scanner
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanScan = scanInput.trim().toUpperCase();
    if (!cleanScan) return;

    const matched = awaitingParcels.find(
      (p) =>
        p.waybillNumber.toUpperCase() === cleanScan ||
        p.id.toUpperCase() === cleanScan ||
        p.receiver.phone.replace(/\s+/g, "") === cleanScan
    );

    if (matched) {
      if (selectedParcelIds.includes(matched.id)) {
        warning(`Waybill ${matched.waybillNumber} is already selected in manifest.`);
      } else {
        setSelectedParcelIds((prev) => [...prev, matched.id]);
        success(`✓ Scanned & Added: ${matched.waybillNumber} (${matched.receiver.fullName})`);
      }
      setScanInput("");
    } else {
      error(`Parcel ${cleanScan} not found in awaiting transit list for this route.`);
    }
  };

  // Filter parcels
  const filteredParcels = awaitingParcels.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.waybillNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiver.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.receiver.phone.includes(searchQuery) ||
      p.sender.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === "ALL" || p.parcelCategory === categoryFilter;

    const matchesPayment =
      paymentFilter === "ALL" || p.paymentStatus === paymentFilter;

    return matchesSearch && matchesCategory && matchesPayment;
  });

  // Calculate selected batch totals
  const selectedParcels = awaitingParcels.filter((p) => selectedParcelIds.includes(p.id));
  const totalSelectedCount = selectedParcels.length;
  const totalPackagesCount = selectedParcels.reduce(
    (sum, p) => sum + (p.packagesCount || 1),
    0
  );
  const totalGrossWeight = selectedParcels.reduce(
    (sum, p) => sum + (p.weightKg || 0),
    0
  );
  const totalFreightValue = selectedParcels.reduce(
    (sum, p) => sum + (p.transportCharge || 0),
    0
  );
  const totalPaidFreight = selectedParcels
    .filter((p) => p.paymentStatus === "PAID")
    .reduce((sum, p) => sum + (p.transportCharge || 0), 0);

  const categories = Array.from(new Set(awaitingParcels.map((p) => p.parcelCategory)));

  const handleCreateManifest = async () => {
    if (selectedParcelIds.length === 0) {
      error("Please select or scan at least one parcel to prepare the manifest.");
      return;
    }

    if (!driverName.trim()) {
      error("Please specify the driver's full name before creating the dispatch manifest.");
      return;
    }

    setIsSubmitting(true);
    try {
      const combinedNotes = [
        notes.trim(),
        securitySeal.trim() ? `Security Seal: ${securitySeal.trim()}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const res = await fetch("/api/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originBranchId,
          destinationBranchId,
          shipmentIds: selectedParcelIds,
          driverName,
          vehicleReg,
          driverPhone,
          notes: combinedNotes || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        error(data.error || "Failed to create manifest");
        setIsSubmitting(false);
        return;
      }

      success(
        `✓ Manifest ${data.manifest.manifestNumber} created! All ${totalSelectedCount} parcel(s) are now IN TRANSIT.`
      );

      router.push(`/manifests/${data.manifest.id}`);
    } catch (err: any) {
      error(err.message);
      setIsSubmitting(false);
    }
  };

  const originBranch = branches.find((b) => b.id === originBranchId);
  const destinationBranch = branches.find((b) => b.id === destinationBranchId);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/manifests"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Create & Prepare Dispatch Manifest
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select awaiting transit parcels, assign carrier details, and generate printable driver handover sheet
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-brand-50 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-700">
          <Truck className="w-4 h-4" />
          <span>
            {originBranch?.code || "..."} ➔ {destinationBranch?.code || "..."} Transit Batch
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2-column: Route & Parcels Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Route Selector Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Select Freight Transit Route</span>
              </h2>

              <button
                type="button"
                onClick={handleSwapRoute}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-600 bg-slate-100 hover:bg-brand-50 px-2.5 py-1.5 rounded-lg transition"
                title="Swap departure and destination"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Swap Hubs</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                  Departure Origin Hub
                </label>
                <select
                  required
                  value={originBranchId}
                  onChange={(e) => setOriginBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:border-brand-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.address}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-brand-700 mb-1">
                  Arrival Destination Hub
                </label>
                <select
                  required
                  value={destinationBranchId}
                  onChange={(e) => setDestinationBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-brand-800 focus:bg-white focus:outline-hidden focus:border-brand-500"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {b.address}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Barcode Scanner & Search Toolbar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Stage Awaiting Transit Parcels</span>
              </h2>

              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {awaitingParcels.length} Awaiting Transit
              </span>
            </div>

            {/* Barcode / Waybill Quick Scan Box */}
            <form onSubmit={handleScanSubmit} className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanBarcode className="w-4 h-4 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={scanInputRef}
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    placeholder="Scan barcode or type Waybill # / Phone, then press Enter..."
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-50/40 border-2 border-brand-200 hover:border-brand-400 focus:border-brand-600 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden transition"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition shrink-0"
                >
                  Add / Scan
                </button>
              </div>
            </form>

            {/* Search & Filter Chips */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter by waybill, customer name, description..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="ALL">All Payments</option>
                    <option value="PAID">Paid</option>
                    <option value="UNPAID">Unpaid / Collect</option>
                    <option value="PARTIALLY_PAID">Partial</option>
                  </select>

                  {awaitingParcels.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 transition shrink-0"
                    >
                      {selectedParcelIds.length === filteredParcels.length ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Deselect All</span>
                        </>
                      ) : (
                        <>
                          <Square className="w-4 h-4" />
                          <span>Select All ({filteredParcels.length})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Category Chips */}
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Category:</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("ALL")}
                    className={`px-2.5 py-0.5 rounded-full font-bold transition ${
                      categoryFilter === "ALL"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All ({awaitingParcels.length})
                  </button>
                  {categories.map((cat) => {
                    const count = awaitingParcels.filter((p) => p.parcelCategory === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-0.5 rounded-full font-bold transition whitespace-nowrap ${
                          categoryFilter === cat
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Parcels List */}
            <div className="mt-4">
              {loadingParcels ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <span className="animate-pulse">Loading awaiting transit parcels...</span>
                </div>
              ) : awaitingParcels.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    No Parcels Awaiting Transit on this Route
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Create new waybills from {originBranch?.name || "origin"} to{" "}
                    {destinationBranch?.name || "destination"} first.
                  </p>
                </div>
              ) : filteredParcels.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No parcels matched your search or filters.
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {filteredParcels.map((p) => {
                    const isSelected = selectedParcelIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectParcel(p.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? "bg-brand-50/70 border-brand-400 shadow-xs ring-1 ring-brand-300"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-brand-600 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-brand-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {p.waybillNumber}
                              </span>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.2 rounded">
                                {p.parcelCategory}
                              </span>
                              {p.specialInstructions && (
                                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                  Special Handling
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-800 font-semibold truncate mt-0.5">
                              {p.description}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>
                                Sender: <strong className="text-slate-700">{p.sender.fullName}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Receiver: <strong className="text-slate-700">{p.receiver.fullName}</strong> (
                                {p.receiver.phone})
                              </span>
                              <span>•</span>
                              <span>
                                {p.packagesCount || 1} pkg(s) {p.weightKg ? `• ${p.weightKg}kg` : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">
                            {formatNaira(p.transportCharge)}
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              p.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.paymentStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar 1-column: Staging Summary & Fleet Assignment */}
        <div className="space-y-6">
          {/* Staging Summary Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-3 border-b border-slate-800 flex items-center justify-between">
              <span>Manifest Staging Summary</span>
              <span className="bg-brand-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalSelectedCount} Selected
              </span>
            </h2>

            <div className="grid grid-cols-2 gap-3 my-4">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Waybills</span>
                <span className="text-lg font-black text-white">{totalSelectedCount}</span>
                <span className="text-[10px] text-slate-400 block">
                  of {awaitingParcels.length} available
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Units
                </span>
                <span className="text-lg font-black text-white">{totalPackagesCount}</span>
                <span className="text-[10px] text-slate-400 block">Physical Pkgs</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Gross Weight
                </span>
                <span className="text-lg font-black text-white">
                  {totalGrossWeight > 0 ? `${totalGrossWeight}kg` : "—"}
                </span>
                <span className="text-[10px] text-slate-400 block">Total Load</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Value
                </span>
                <span className="text-lg font-black text-white">
                  {formatNaira(totalFreightValue)}
                </span>
                <span className="text-[10px] text-emerald-400 block">
                  {formatNaira(totalPaidFreight)} Paid
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
              <span>Route:</span>
              <strong className="text-white">
                {originBranch?.code} ➔ {destinationBranch?.code}
              </strong>
            </div>
          </div>

          {/* Carrier & Vehicle Details Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100 mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-900 text-white inline-flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Carrier & Fleet Details</span>
            </h2>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Driver Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Sunday Okon"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Driver Contact Phone
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. 0803 333 4444"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vehicle Plate / Reg #
                </label>
                <input
                  type="text"
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value)}
                  placeholder="e.g. ABJ-452-XY (HiAce Bus)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Security Seal # <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={securitySeal}
                  onChange={(e) => setSecuritySeal(e.target.value)}
                  placeholder="e.g. SEAL-88219"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dispatch Notes / Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning express transfer, urgent medical parcels included"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>

            {/* Preparation Actions */}
            <div className="pt-5 mt-5 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmitting || selectedParcelIds.length === 0}
                onClick={handleCreateManifest}
                className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-black text-xs py-3.5 rounded-xl shadow-md shadow-brand-600/20 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Dispatching Manifest..."
                    : `Create & Dispatch Manifest (${totalSelectedCount} Parcels ➔ IN TRANSIT)`}
                </span>
              </button>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                All {totalSelectedCount} selected parcel(s) will automatically update to <strong>IN TRANSIT</strong> status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateManifestPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-100">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
            <CreateManifestContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
