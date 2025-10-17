"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
// Minimal header; tasks UI removed

export function SiteHeader() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname?.startsWith("/history")) return "History";
    if (pathname?.startsWith("/settings")) return "Settings";
    return "Hands Off Your Keyboard";
  };

  // tasks removed

  return (
    <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-semibold text-foreground">
            {getPageTitle()}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <a href="/history" className="text-sm text-muted-foreground hover:text-foreground">History</a>
          <a href="/settings" className="text-sm text-muted-foreground hover:text-foreground">Settings</a>
        </div>
      </div>
    </header>
  );
}
