"use client"

import React from "react"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminNavbar } from "@/components/admin/navbar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <AdminNavbar sidebarCollapsed={sidebarCollapsed} />
      <main
        className={cn(
          "min-h-screen pt-[72px] transition-all duration-300 watermark-bg",
          sidebarCollapsed ? "ml-20" : "ml-[280px]"
        )}
      >
        
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
