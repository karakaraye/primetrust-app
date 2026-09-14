"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Truck,
  Inbox,
  PackageCheck,
  CheckCircle2,
  ClockAlert,
  Users,
  BarChart3,
  UserCog,
  Building2,
  ShieldAlert,
  Settings,
  LogOut,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
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

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (!currentUser) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) setCurrentUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isBranchAdmin = currentUser?.role === "BRANCH_ADMIN";
  const isAdminOrSuper = isSuperAdmin || isBranchAdmin;
  const isDeskOperator = currentUser?.role === "OPERATIONS_STAFF";

  const homeHref = isDeskOperator ? "/waybills" : "/dashboard";

  const navItems = [
    {
      title: "Operations",
      items: [
        ...(isAdminOrSuper ? [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] : []),
        { label: "New Waybill", href: "/waybills/new", icon: PlusCircle, highlight: true },
        { label: "Waybills", href: "/waybills", icon: FileText },
        { label: "Dispatch Manifests", href: "/manifests", icon: Truck },
        { label: "Incoming Parcels", href: "/incoming", icon: Inbox },
        { label: "Ready for Pickup", href: "/ready-for-pickup", icon: PackageCheck },
        { label: "Collections", href: "/collections", icon: CheckCircle2 },
        { label: "Uncollected Parcels", href: "/uncollected", icon: ClockAlert },
        ...(isAdminOrSuper ? [{ label: "Customers", href: "/customers", icon: Users }] : []),
      ],
    },
    {
      title: "Management & Reports",
      items: [
        { label: "Reports", href: "/reports", icon: BarChart3 },
        ...(isAdminOrSuper ? [{ label: "Staff", href: "/staff", icon: UserCog }] : []),
        ...(isSuperAdmin ? [{ label: "Branches", href: "/branches", icon: Building2 }] : []),
        ...(isAdminOrSuper ? [{ label: "Audit Logs", href: "/audit-logs", icon: ShieldAlert }] : []),
        ...(isSuperAdmin ? [{ label: "Settings", href: "/settings", icon: Settings }] : []),
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0 select-none no-print">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <Link href={homeHref} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-brand-500/20 group-hover:scale-105 transition">
            PTL
          </div>
          <div>
            <h1 className="font-black text-sm tracking-wider text-white uppercase leading-none">
              LOGISTICS OPS
            </h1>
            <p className="text-[10px] text-brand-400 font-semibold tracking-widest mt-1 uppercase">
              Port Harcourt ⇄ Abia
            </p>
          </div>
        </Link>

        {/* Current Branch Badge */}
        {currentUser?.branchName ? (
          <div className="mt-3.5 bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Current Office</div>
              <div className="text-xs font-bold text-white truncate">
                {currentUser.branchName} <span className="text-brand-400 font-mono">({currentUser.branchCode})</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 bg-purple-950/40 border border-purple-800/50 rounded-xl p-2.5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-purple-300">HQ Oversight</div>
              <div className="text-xs font-bold text-white truncate">All Branches (Global Admin)</div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navItems.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group",
                    isActive
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                      : item.highlight
                      ? "bg-brand-950/60 text-brand-300 border border-brand-800/60 hover:bg-brand-900/60 hover:text-white"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-transform group-hover:scale-110",
                        isActive ? "text-white" : item.highlight ? "text-brand-400" : "text-slate-400"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.highlight && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-white truncate">{currentUser?.name || "Staff"}</div>
            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>{currentUser?.role?.replace("_", " ")}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
