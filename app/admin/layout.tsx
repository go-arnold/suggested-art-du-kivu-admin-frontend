"use client"

import React, { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { AdminSidebar } from "@/components/admin/sidebar"
import { AdminNavbar } from "@/components/admin/navbar"

// Vrai à partir du breakpoint lg (1024px), où la sidebar fixe remplace le tiroir.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true)

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const onChange = () => setIsDesktop(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isDesktop = useIsDesktop()

  // Referme le tiroir mobile à chaque navigation.
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Le mode « replié » (rail d'icônes) ne concerne que le desktop ; le tiroir
  // mobile s'affiche toujours déployé.
  const collapsed = isDesktop ? sidebarCollapsed : false

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar
        collapsed={collapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <AdminNavbar
        sidebarCollapsed={sidebarCollapsed}
        onMobileMenuOpen={() => setMobileOpen(true)}
      />
      <main
        className={cn(
          "min-h-screen pt-[72px] transition-all duration-300 watermark-bg ml-0",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-[280px]"
        )}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  )
}
