"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminNavbar } from "@/components/admin/navbar";
import { LivePlayerProvider } from "@/components/admin/live-player";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, LogIn, ExternalLink } from "lucide-react";

// Rôle(s) autorisé(s) à accéder à l'espace admin. Ajouter "editor"/"moderator"
// ici si ces rôles doivent aussi y accéder.
const ADMIN_ROLES = ["admin"];
// Site client : destination des comptes non autorisés.
const CLIENT_URL = "https://art-du-kivu.vercel.app";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const isAllowed = !!user && ADMIN_ROLES.includes(user.role);

  // Non connecté → page de connexion.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Loader pendant la vérif (ou pendant le redirect vers /login si non connecté).
  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Connecté mais pas admin → écran de choix (pas de redirect forcé).
  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
            <ShieldAlert className="h-7 w-7 text-warning" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Accès réservé aux administrateurs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Le compte <span className="font-medium text-foreground">{user.email}</span> n&apos;a pas accès à l&apos;espace d&apos;administration.
            </p>
          </div>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => { logout(); router.replace("/login"); }}>
              <LogIn className="mr-2 h-4 w-4" />Se connecter avec un compte admin
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { window.location.href = CLIENT_URL; }}>
              <ExternalLink className="mr-2 h-4 w-4" />Aller sur Art-du-Kivu
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LivePlayerProvider>
      <div className="app">
        <AdminSidebar />
        <div className="main">
          <AdminNavbar />
          <main className="canvas">{children}</main>
        </div>
      </div>
    </LivePlayerProvider>
  );
}
