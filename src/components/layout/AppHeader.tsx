"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Users,
  Shield,
  FileText,
  Truck,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  user: {
    userId: string;
    name: string;
    email: string;
    role: "SUPER_ADMIN" | "BRANCH_ADMIN" | "OPERATIONS_STAFF";
    branchId: string | null;
    branchCode: string | null;
    branchName: string | null;
  } | null;
}

interface SearchResult {
  type: "shipment" | "manifest" | "customer";
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  url: string;
}

export function AppHeader({ user }: AppHeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
          setShowResults(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectResult = (url: string) => {
    setShowResults(false);
    setSearchQuery("");
    router.push(url);
  };

  const handleQuickSwitch = async (email: string) => {
    try {
      const res = await fetch("/api/auth/quick-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const demoAccounts = [
    { name: "Chidiebere Nwosu", email: "phc.staff@logisticsops.ng", role: "OPERATIONS_STAFF", branch: "Port Harcourt (PHC)", color: "bg-blue-600" },
    { name: "Tamuno Briggs", email: "phc.admin@logisticsops.ng", role: "BRANCH_ADMIN", branch: "Port Harcourt (PHC)", color: "bg-indigo-600" },
    { name: "Kalu Uzor", email: "abi.staff@logisticsops.ng", role: "OPERATIONS_STAFF", branch: "Abia Office (ABI)", color: "bg-emerald-600" },
    { name: "Ngozi Ebere", email: "abi.admin@logisticsops.ng", role: "BRANCH_ADMIN", branch: "Abia Office (ABI)", color: "bg-teal-600" },
    { name: "Emeka Okafor", email: "admin@logisticsops.ng", role: "SUPER_ADMIN", branch: "Headquarters (Global)", color: "bg-purple-600" },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs no-print">
      {/* Global Search Bar */}
      <div ref={searchRef} className="relative w-full max-w-lg">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search Waybill #, Phone, Receiver, Sender, Manifest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-brand-500 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Search Results ({searchResults.length})</span>
              {isSearching && <span className="text-brand-600 animate-pulse">Searching...</span>}
            </div>

            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                No matching waybills, manifests, or customers found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectResult(item.url)}
                    className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          item.type === "shipment" && "bg-blue-100 text-blue-700",
                          item.type === "manifest" && "bg-purple-100 text-purple-700",
                          item.type === "customer" && "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {item.type === "shipment" && <FileText className="w-4 h-4" />}
                        {item.type === "manifest" && <Truck className="w-4 h-4" />}
                        {item.type === "customer" && <Users className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {item.status && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                        {item.status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Tools: Branch Info & Quick Role Switcher */}
      <div className="flex items-center gap-3">
        {/* Branch Info Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-brand-600" />
          <span>{user?.branchName || "Global Administration"}</span>
        </div>

        {/* Quick Demo Switcher Button */}
        <button
          onClick={() => setShowSwitchModal(true)}
          className="flex items-center gap-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs"
          title="Switch role/branch for testing"
        >
          <UserCheck className="w-3.5 h-3.5 text-brand-600" />
          <span>Switch Account</span>
        </button>
      </div>

      {/* Quick Switch Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Switch Operator Account</h3>
                <p className="text-xs text-slate-500">Quickly test Port Harcourt vs Abia staff viewpoints</p>
              </div>
              <button
                onClick={() => setShowSwitchModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {demoAccounts.map((acc, i) => {
                const isCurrent = user?.email === acc.email;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setShowSwitchModal(false);
                      handleQuickSwitch(acc.email);
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all",
                      isCurrent
                        ? "bg-brand-50/80 border-brand-300 ring-2 ring-brand-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs", acc.color)}>
                        {acc.branch.includes("PHC") ? "PH" : acc.branch.includes("ABI") ? "AB" : "HQ"}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <span>{acc.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-brand-600 text-white px-1.5 py-0.2 rounded font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {acc.branch} • <span className="font-semibold text-slate-700">{acc.role.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
