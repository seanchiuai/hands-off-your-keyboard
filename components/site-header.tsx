"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { QuickAddTask } from "@/components/QuickAddTask";

export function SiteHeader() {
  const pathname = usePathname();

  const getPageTitle = () => {
    if (pathname?.startsWith("/voice-shopper")) return "Voice Shopper";
    if (pathname?.startsWith("/tasks")) return "Tasks";
    if (pathname?.startsWith("/research")) return "Research";
    if (pathname?.startsWith("/server")) return "Server";
    return "Tasks";
  };

  const isTasksPage = pathname?.startsWith("/tasks");

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{getPageTitle()}</h1>
        </div>
        {isTasksPage && <QuickAddTask />}
      </div>
    </header>
  );
}
