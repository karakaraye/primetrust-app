import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logistics Operations System | Port Harcourt ⇄ Abia Parcel Network",
  description: "Enterprise Logistics Waybill and Parcel Management System for Nigerian office-to-office parcel transportation operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
