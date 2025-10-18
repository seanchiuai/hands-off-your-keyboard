"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconHelp,
  IconInnerShadowTop,
  IconMicrophone,
  IconBug,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: IconMicrophone,
    },
    {
      title: "History",
      url: "/history",
      icon: IconInnerShadowTop,
    },
  ],
  navSecondary: [
    {
      title: "Dev Test",
      url: "/dev-test",
      icon: IconBug,
    },
    {
      title: "Help",
      url: "#",
      icon: IconHelp,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 transition-smooth"
            >
              <Link href="/" className="flex items-center gap-3">
                <div className="gradient-primary p-2 rounded-lg shadow-lg glow-primary">
                  <IconInnerShadowTop className="!size-5 text-black/70" />
                </div>
                <span className="text-xl font-bold text-gradient-primary">Hands Off Your Keyboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
