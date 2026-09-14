"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { PrintableWaybill } from "@/components/waybill/PrintableWaybill";
import { formatNaira } from "@/lib/utils";
import {
  FileText,
  User,
  Users,
  MapPin,
  Package,
  CreditCard,
  Printer,
  CheckCircle2,
  PlusCircle,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export default function NewWaybillPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  // Form State
  // Sender
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAltPhone, setSenderAltPhone] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [senderSearchResults, setSenderSearchResults] = useState<any[]>([]);

  // Receiver
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAltPhone, setReceiverAltPhone] = useState("");
  const [receiverEmail, setReceiverEmail] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  const [receiverSearchResults, setReceiverSearchResults] = useState<any[]>([]);

  // Route
  const [originBranchId, setOriginBranchId] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");

  // Parcel Info
  const [parcelCategory, setParcelCategory] = useState("General Parcel");
  const [description, setDescription] = useState("");
  const [packagesCount, setPackagesCount] = useState("1");
  const [quantity, setQuantity] = useState("1");
  const [weightKg, setWeightKg] = useState("");
  const [declaredValue, setDeclaredValue] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Payment
  const [transportCharge, setTransportCharge] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountPaid, setAmountPaid] = useState("");

  // Submission & Success Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdShipment, setCreatedShipment] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Fetch initial user and branches
  useEffect(() => {
    async function loadData() {
      try {
        const [branchRes, userRes] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/auth/quick-switch", { method: "GET" }).catch(() => null),
        ]);

        if (branchRes.ok) {
          const data = await branchRes.json();
          setBranches(data.branches || []);

          // Auto-setup origin and destination default
          const phc = data.branches?.find((b: any) => b.code === "PHC");
          const abi = data.branches?.find((b: any) => b.code === "ABI");

          if (phc) setOriginBranchId(phc.id);
          if (abi) setDestinationBranchId(abi.id);
        }
      } catch (err) {
        console.error("Failed to load branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    }
    loadData();
  }, []);

  // Live Sender lookup
  useEffect(() => {
    if (senderPhone.trim().length >= 4) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(senderPhone.trim())}`);
          if (res.ok) {
            const data = await res.json();
            setSenderSearchResults(data.customers || []);
          }
        } catch {}
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSenderSearchResults([]);
    }
  }, [senderPhone]);

  // Live Receiver lookup
  useEffect(() => {
    if (receiverPhone.trim().length >= 4) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/customers/search?q=${encodeURIComponent(receiverPhone.trim())}`);
          if (res.ok) {
            const data = await res.json();
            setReceiverSearchResults(data.customers || []);
          }
        } catch {}
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setReceiverSearchResults([]);
    }
  }, [receiverPhone]);

  const handleSelectSender = (customer: any) => {
    setSenderName(customer.fullName);
    setSenderPhone(customer.phone);
    setSenderAltPhone(customer.altPhone || "");
    setSenderEmail(customer.email || "");
    setSenderAddress(customer.address || "");
    setSenderSearchResults([]);
  };

  const handleSelectReceiver = (customer: any) => {
    setReceiverName(customer.fullName);
    setReceiverPhone(customer.phone);
    setReceiverAltPhone(customer.altPhone || "");
    setReceiverEmail(customer.email || "");
    setReceiverAddress(customer.address || "");
    setReceiverSearchResults([]);
  };

  // Charge and Paid calculations
  const chargeNum = parseFloat(transportCharge) || 0;
  const paidNum = amountPaid === "" ? chargeNum : parseFloat(amountPaid) || 0;
  const balanceNum = Math.max(0, chargeNum - paidNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        sender: {
          fullName: senderName,
          phone: senderPhone,
          altPhone: senderAltPhone,
          email: senderEmail,
          address: senderAddress,
        },
        receiver: {
          fullName: receiverName,
          phone: receiverPhone,
          altPhone: receiverAltPhone,
          email: receiverEmail,
          address: receiverAddress,
        },
        originBranchId,
        destinationBranchId,
        parcelCategory,
        description,
        packagesCount: parseInt(packagesCount, 10) || 1,
        quantity: parseInt(quantity, 10) || 1,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        declaredValue: declaredValue ? parseFloat(declaredValue) : null,
        specialInstructions,
        transportCharge: chargeNum,
        paymentMethod,
        amountPaid: paidNum,
      };

      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to create waybill");
        setIsSubmitting(false);
        return;
      }

      setCreatedShipment(data.shipment);
    } catch (err: any) {
      alert("Error submitting waybill: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSenderName("");
    setSenderPhone("");
    setSenderAltPhone("");
    setSenderEmail("");
    setSenderAddress("");

    setReceiverName("");
    setReceiverPhone("");
    setReceiverAltPhone("");
    setReceiverEmail("");
    setReceiverAddress("");

    setDescription("");
    setPackagesCount("1");
    setQuantity("1");
    setWeightKg("");
    setDeclaredValue("");
    setSpecialInstructions("");

    setTransportCharge("");
    setAmountPaid("");
    setCreatedShipment(null);
  };

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={currentUser} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={currentUser} />
          <main className="flex-1 p-6 md:p-8 max-w-5xl w-full mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">New Waybill Registration</h1>
                  <span className="bg-brand-100 text-brand-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    Office Terminal
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Book parcel for interstate office-to-office transportation and generate atomic waybill number
                </p>
              </div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: SENDER DETAILS */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Sender Information (Consignor)
                      </h2>
                      <p className="text-[11px] text-slate-500">Sender details and customer account lookup</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">Origin Office</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sender Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="e.g. 08032345678"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                    />

                    {/* Sender Lookup Dropdown */}
                    {senderSearchResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b">
                          Existing Customers Found
                        </div>
                        {senderSearchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectSender(c)}
                            className="w-full text-left p-2.5 hover:bg-brand-50 flex items-center justify-between text-xs border-b last:border-0"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{c.fullName}</div>
                              <div className="text-[10px] text-slate-500">{c.phone} {c.address ? `• ${c.address}` : ""}</div>
                            </div>
                            <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                              Auto-fill
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sender Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="e.g. Alhaji Musa Danjuma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alternative Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={senderAltPhone}
                      onChange={(e) => setSenderAltPhone(e.target.value)}
                      placeholder="e.g. 08092345678"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sender Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      placeholder="e.g. 14 Trans-Amadi, Port Harcourt"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: RECEIVER DETAILS */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Receiver Information (Consignee)
                      </h2>
                      <p className="text-[11px] text-slate-500">Receiver details for collection verification and SMS notice</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold">Destination Collector</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Receiver Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      placeholder="e.g. 08023456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                    />

                    {/* Receiver Lookup Dropdown */}
                    {receiverSearchResults.length > 0 && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                        <div className="p-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b">
                          Existing Customers Found
                        </div>
                        {receiverSearchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectReceiver(c)}
                            className="w-full text-left p-2.5 hover:bg-emerald-50 flex items-center justify-between text-xs border-b last:border-0"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{c.fullName}</div>
                              <div className="text-[10px] text-slate-500">{c.phone} {c.address ? `• ${c.address}` : ""}</div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              Auto-fill
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Receiver Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="e.g. Dr. Ifeanyi Adeleke"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alternative Phone <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={receiverAltPhone}
                      onChange={(e) => setReceiverAltPhone(e.target.value)}
                      placeholder="e.g. 08183456789"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={receiverEmail}
                      onChange={(e) => setReceiverEmail(e.target.value)}
                      placeholder="e.g. ifeanyi.adeleke@gmail.com"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ROUTE SELECTION */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Route & Branch Selection
                      </h2>
                      <p className="text-[11px] text-slate-500">Origin office and destination collection hub</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Origin Departure Office <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={originBranchId}
                      onChange={(e) => setOriginBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Destination Pickup Office <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={destinationBranchId}
                      onChange={(e) => setDestinationBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-brand-700 focus:bg-white focus:outline-hidden"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 4: PARCEL INFORMATION */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Parcel Information & Goods Description
                      </h2>
                      <p className="text-[11px] text-slate-500">Package specifications, weight and instructions</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Parcel Category <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={parcelCategory}
                        onChange={(e) => setParcelCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden"
                      >
                        <option value="General Parcel">General Parcel</option>
                        <option value="Documents">Documents</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Food Items">Food Items</option>
                        <option value="Fragile">Fragile</option>
                        <option value="Spare Parts">Spare Parts</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Number of Packages <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={packagesCount}
                        onChange={(e) => setPackagesCount(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Weight in Kg <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        placeholder="e.g. 12.5"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Detailed Parcel Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. 2 Cartons Solar Inverters (Luminous 1.5KVA) with cables"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Declared Value (₦) <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={declaredValue}
                        onChange={(e) => setDeclaredValue(e.target.value)}
                        placeholder="e.g. 150000"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Special Instructions / Handling <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        placeholder="e.g. Keep upright, Fragile glass components"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: PAYMENT */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                      5
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Payment & Transport Billing
                      </h2>
                      <p className="text-[11px] text-slate-500">Freight charges, settlement method and balance due</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Transport Charge (₦) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={transportCharge}
                      onChange={(e) => {
                        setTransportCharge(e.target.value);
                        if (amountPaid === "" || amountPaid === transportCharge) {
                          setAmountPaid(e.target.value);
                        }
                      }}
                      placeholder="e.g. 15000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Method <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                    >
                      <option value="CASH">Cash at Counter</option>
                      <option value="TRANSFER">Bank Transfer</option>
                      <option value="POS">POS Terminal Card</option>
                      <option value="OTHER">Other / Credit Account</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Amount Paid Now (₦) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-brand-500 rounded-xl text-sm font-black text-emerald-700 focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Summary calculation pill */}
                <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Freight:</span>
                      <span className="text-base font-black text-slate-900">{formatNaira(chargeNum)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Amount Settled:</span>
                      <span className="text-base font-black text-emerald-700">{formatNaira(paidNum)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Balance Due:</span>
                      <span className={`text-base font-black ${balanceNum > 0 ? "text-rose-700" : "text-slate-400"}`}>
                        {formatNaira(balanceNum)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                      balanceNum === 0
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : paidNum > 0
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}>
                      {balanceNum === 0 ? "PAID IN FULL" : paidNum > 0 ? "PARTIALLY PAID" : "UNPAID"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button Bar */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-700 transition"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-brand-600/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Generating Waybill...</span>
                  ) : (
                    <>
                      <span>Complete Registration & Generate Waybill</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Success Modal */}
            {createdShipment && (
              <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in duration-200">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <h3 className="text-xl font-black text-slate-900 uppercase">
                    WAYBILL CREATED SUCCESSFULLY
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Unique sequential number generated server-side and recorded immutably.
                  </p>

                  <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Assigned Waybill Number
                    </div>
                    <div className="text-xl font-mono font-black text-brand-600 mt-1">
                      {createdShipment.waybillNumber}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-2">
                      {createdShipment.originBranch.name} ➔ {createdShipment.destinationBranch.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Receiver: <strong className="text-slate-800">{createdShipment.receiver.fullName}</strong> ({createdShipment.receiver.phone})
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => setShowPrintModal(true)}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Waybill Slips</span>
                    </button>

                    <button
                      onClick={() => router.push(`/waybills/${createdShipment.id}`)}
                      className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition"
                    >
                      View Waybill Details & Tracking
                    </button>

                    <button
                      onClick={handleResetForm}
                      className="w-full py-2.5 text-slate-500 hover:text-slate-800 font-bold text-xs transition"
                    >
                      + Create Another Waybill
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Printable Waybill Modal Component */}
            {showPrintModal && createdShipment && (
              <PrintableWaybill
                shipment={createdShipment}
                onClose={() => setShowPrintModal(false)}
              />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
