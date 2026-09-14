import React from "react";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ToastProvider } from "@/components/ui/Toast";

interface AppLayoutProps {
  children: React.ReactNode;
}

export async function AppLayout({ children }: AppLayoutProps) {
  const user = await getCurrentUser();

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar user={user} />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader user={user} />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
