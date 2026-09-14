"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  Settings,
  Save,
  Building,
  FileText,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Send,
  Key,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Radio,
} from "lucide-react";

function SettingsContent() {
  const { success, error, info } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({
    COMPANY_NAME: "LOGISTICS OPERATIONS SYSTEM",
    COMPANY_CODE: "PTL",
    COMPANY_PHONE: "+234 800 564 4784",
    COMPANY_EMAIL: "operations@logisticsops.ng",
    COMPANY_ADDRESS: "Head Office: Plot 14 Aba Road, Port Harcourt, Rivers State",
    CURRENCY_SYMBOL: "₦",
    WAYBILL_TERMS:
      "1. All parcels are received in apparent good condition unless noted. 2. Company liability is strictly limited to verified declared value. 3. Parcels not collected within 14 calendar days from arrival date will incur statutory demurrage fees. 4. Valid government identification or secret pickup code is required for parcel release.",
    NOTIFICATION_TEMPLATE:
      "Your parcel with waybill {{waybillNumber}} from {{originBranch}} has arrived at our {{destinationBranch}} office and is ready for collection. Pickup Code: {{pickupCode}}. Please present this message at the counter.",
    TERMII_API_KEY: "",
    TERMII_SENDER_ID: "PTL-OPS",
    TERMII_CHANNEL: "dnd",
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // SMS Live Test State
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "PTL LOGISTICS: Your parcel with waybill PTL-PHC-ABI-260914-0001 has arrived at Aba Terminal. Pickup PIN: 739201. Present this code at the counter."
  );
  const [isTestingSMS, setIsTestingSMS] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    simulated?: boolean;
    messageId?: string;
    error?: string;
    sentTo?: string;
  } | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const map: Record<string, string> = { ...settings };
          data.settings?.forEach((s: any) => {
            map[s.key] = s.value;
          });
          setSettings(map);
        }
      } catch (err: any) {
        error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = Object.entries(settings).map(([key, value]) => ({ key, value }));
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });

      if (!res.ok) {
        error("Failed to save settings");
        setIsSaving(false);
        return;
      }

      success("System configuration saved and applied across all terminals!");
    } catch (err: any) {
      error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      error("Please enter a test phone number (e.g. 08031234567)");
      return;
    }

    setIsTestingSMS(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim(),
          channel: settings.TERMII_CHANNEL || "dnd",
        }),
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        if (data.simulated) {
          info("SMS Gateway in SIMULATION mode. Add your live Termii API key above to send real SMS!");
        } else {
          success(`Live SMS successfully dispatched via Termii to ${data.sentTo}!`);
        }
      } else {
        error(data.error || "Failed to deliver test SMS");
      }
    } catch (err: any) {
      error(err.message || "Network error");
      setTestResult({
        success: false,
        error: err.message || "Network connection failure",
      });
    } finally {
      setIsTestingSMS(false);
    }
  };

  const isLiveConfigured = Boolean(settings.TERMII_API_KEY && settings.TERMII_API_KEY.length > 8);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration & Gateway</h1>
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase">
              Super Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage company branding, waybill code prefixes, legal terms, and Termii real-time SMS gateway integration
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        {/* Termii SMS Gateway Integration Card */}
        <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">
                  Termii Real-Time SMS Gateway (Nigeria Telcos)
                </h2>
                {isLiveConfigured ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Gateway Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Simulation Mode Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dispatches real-time arrival SMS with secret 6-digit Pickup PINs to customers across MTN, Airtel, Glo, and 9mobile.
              </p>
            </div>
            <a
              href="https://termii.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <span>Termii Portal ↗</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* API Key */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  Termii API Key
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  Copy from: Termii Dashboard → Settings → API Key
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="e.g. TLXkxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.TERMII_API_KEY || ""}
                  onChange={(e) => handleChange("TERMII_API_KEY", e.target.value.trim())}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sender ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Termii Sender ID (Alphanumeric)
              </label>
              <input
                type="text"
                maxLength={11}
                placeholder="e.g. PTL-OPS or Termii"
                value={settings.TERMII_SENDER_ID || ""}
                onChange={(e) => handleChange("TERMII_SENDER_ID", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default: <strong>PTL-OPS</strong> (or use your approved Termii Sender ID / &quot;Termii&quot;)
              </span>
            </div>

            {/* Channel */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Delivery Channel / Priority Route
              </label>
              <select
                value={settings.TERMII_CHANNEL || "dnd"}
                onChange={(e) => handleChange("TERMII_CHANNEL", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
              >
                <option value="dnd">DND Route (Recommended - Bypasses Telco DND block)</option>
                <option value="generic">Generic Route (Standard delivery)</option>
                <option value="whatsapp">WhatsApp Channel</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                <strong>DND Route</strong> guarantees OTP and Secret Pickup PIN delivery.
              </span>
            </div>
          </div>
        </div>

        {/* Company Identity */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-brand-600" />
            <span>Company Branding & Identifiers</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Company Display Name
              </label>
              <input
                type="text"
                required
                value={settings.COMPANY_NAME}
                onChange={(e) => handleChange("COMPANY_NAME", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Waybill Prefix Company Code (3-4 Chars)
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={settings.COMPANY_CODE}
                onChange={(e) => handleChange("COMPANY_CODE", e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-brand-700 uppercase focus:bg-white focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Used in waybill generation: e.g. <strong className="font-mono">{settings.COMPANY_CODE}-PHC-ABI-260914-0001</strong>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Support Phone</label>
              <input
                type="text"
                value={settings.COMPANY_PHONE}
                onChange={(e) => handleChange("COMPANY_PHONE", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Support Email</label>
              <input
                type="email"
                value={settings.COMPANY_EMAIL}
                onChange={(e) => handleChange("COMPANY_EMAIL", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters Address</label>
              <input
                type="text"
                value={settings.COMPANY_ADDRESS}
                onChange={(e) => handleChange("COMPANY_ADDRESS", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Legal Waybill Terms */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <span>Printed Waybill Legal Terms & Conditions</span>
          </h2>

          <div>
            <textarea
              rows={4}
              value={settings.WAYBILL_TERMS}
              onChange={(e) => handleChange("WAYBILL_TERMS", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 leading-relaxed focus:bg-white focus:outline-hidden"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              These terms will automatically be printed at the footer of every dual-slip waybill copy.
            </span>
          </div>
        </div>

        {/* Customer Notification Message Template */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-600" />
            <span>SMS / WhatsApp Customer Notification Template</span>
          </h2>

          <div>
            <textarea
              rows={3}
              value={settings.NOTIFICATION_TEMPLATE}
              onChange={(e) => handleChange("NOTIFICATION_TEMPLATE", e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 leading-relaxed focus:bg-white focus:outline-hidden"
            />
            <div className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
              <strong className="text-slate-800">Supported Placeholders:</strong> <code className="text-brand-600 font-mono">{"{{waybillNumber}}"}</code>, <code className="text-brand-600 font-mono">{"{{originBranch}}"}</code>, <code className="text-brand-600 font-mono">{"{{destinationBranch}}"}</code>, <code className="text-brand-600 font-mono">{"{{pickupCode}}"}</code>.
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save System Settings"}</span>
          </button>
        </div>
      </form>

      {/* Live Interactive SMS Tester Drawer/Card */}
      <div className="mt-8 max-w-4xl bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Live SMS Gateway Tester
              </h3>
              <p className="text-[11px] text-slate-400">
                Test real-time delivery to any Nigerian phone number (MTN, Airtel, Glo, 9mobile)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            Route: {settings.TERMII_CHANNEL || "dnd"}
          </span>
        </div>

        <form onSubmit={handleSendTestSMS} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-400" />
                Destination Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. 08031234567 or 2348031234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-hidden focus:border-brand-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Accepts local (080...) or international (234...) format.
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Sample Test Message</span>
                <button
                  type="button"
                  onClick={() =>
                    setTestMessage(
                      `PTL LOGISTICS: Your parcel with waybill PTL-PHC-ABI-${Math.floor(
                        100000 + Math.random() * 900000
                      )} has arrived. Secret PIN: ${Math.floor(100000 + Math.random() * 900000)}.`
                    )
                  }
                  className="text-[10px] text-brand-400 hover:text-brand-300 underline font-normal"
                >
                  Generate random PIN
                </button>
              </label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-400">
              {isLiveConfigured ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  API Key is configured. Live SMS will be dispatched via Termii.
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  API Key is empty. SMS will be logged in simulation mode.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isTestingSMS}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              {isTestingSMS ? (
                <span>Dispatching SMS...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test SMS Now</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Live Test Results Card */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs ${
              testResult.success
                ? testResult.simulated
                  ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                  : "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                : "bg-rose-950/40 border-rose-800/80 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              {testResult.success ? (
                testResult.simulated ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>SIMULATION MODE SUCCESS (No live API key saved yet)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>LIVE TERMII SMS DISPATCHED SUCCESSFULLY!</span>
                  </>
                )
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>TERMII SMS DELIVERY FAILED</span>
                </>
              )}
            </div>

            <div className="text-[11px] opacity-90 font-mono mt-1 space-y-0.5">
              {testResult.sentTo && <div>Recipient: {testResult.sentTo}</div>}
              {testResult.messageId && <div>Message ID / Ref: {testResult.messageId}</div>}
              {testResult.error && <div className="text-rose-300 font-bold">Error: {testResult.error}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={null} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={null} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            <SettingsContent />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
