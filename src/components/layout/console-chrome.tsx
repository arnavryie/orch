"use client";

import type { ReactNode } from "react";
import { MarketingBar } from "@/components/layout/marketing-bar";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function ConsoleChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-base font-sans text-on-surface">
      <MarketingBar />
      <div className="flex min-h-0 flex-1">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
