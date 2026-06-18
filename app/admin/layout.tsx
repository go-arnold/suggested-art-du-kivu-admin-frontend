"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminNavbar } from "@/components/admin/navbar";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = () => setIsDesktop(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const collapsed = isDesktop ? sidebarCollapsed : false;

  // Show loader while checking auth
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
  );
}
