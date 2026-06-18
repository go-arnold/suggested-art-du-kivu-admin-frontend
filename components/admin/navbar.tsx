"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell, Search, Plus, ChevronRight, FileText, Music,
  Calendar, X, Menu, MessageSquare, Bell as BellIcon,
  LogOut, Settings, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { eventsApi, articlesApi } from "@/lib/api";

// ── Static quick actions ──────────────────────────────────────────────────────

const quickActions = [
  { label: "Nouvel Article",    href: "/admin/articles/nouveau",   icon: FileText },
  { label: "Nouvel Artiste",    href: "/admin/artistes/nouveau",   icon: Music    },
  { label: "Nouvel Événement",  href: "/admin/evenements",         icon: Calendar },
];

// ── Breadcrumb labels ─────────────────────────────────────────────────────────

const breadcrumbMap: Record<string, string> = {
  admin:          "Dashboard",
  articles:       "Articles",
  artistes:       "Artistes",
  evenements:     "Événements",
  podcasts:       "Podcasts",
  emissions:      "Émissions Live",
  mediatheque:    "Médiathèque",
  utilisateurs:   "Utilisateurs",
  parametres:     "Paramètres",
  newsletter:     "Newsletter",
  statistiques:   "Statistiques",
  notifications:  "Notifications",
  nouveau:        "Nouveau",
  modifier:       "Modifier",
};

// ── Notification shape ────────────────────────────────────────────────────────

interface Notif {
  id: string;
  message: string;
  time: string;
  icon: typeof BellIcon;
  unread: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AdminNavbarProps {
  sidebarCollapsed: boolean;
  onMobileMenuOpen: () => void;
}

export function AdminNavbar({ sidebarCollapsed, onMobileMenuOpen }: AdminNavbarProps) {
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, logout } = useAuth();

  const [searchOpen,  setSearchOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifs,      setNotifs]      = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Build real notifications from API data ────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      articlesApi.list("page_size=3"),
      eventsApi.list("status=upcoming&page_size=3"),
    ]).then(([articlesRes, eventsRes]) => {
      const built: Notif[] = [];

      if (articlesRes.status === "fulfilled" && articlesRes.value.results.length > 0) {
        const latest = articlesRes.value.results[0];
        built.push({
          id:      `article-${latest.id}`,
          message: `Nouvel article : "${latest.title.slice(0, 40)}…"`,
          time:    latest.published_at
            ? new Date(latest.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
            : "Récemment",
          icon:    FileText,
          unread:  true,
        });
      }

      if (eventsRes.status === "fulfilled") {
        eventsRes.value.results.slice(0, 2).forEach((ev) => {
          const days = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000);
          if (days >= 0 && days <= 7) {
            built.push({
              id:      `event-${ev.id}`,
              message: `Événement dans ${days === 0 ? "aujourd'hui" : `${days}j`} : ${ev.title.slice(0, 35)}…`,
              time:    new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
              icon:    Calendar,
              unread:  true,
            });
          }
        });
      }

      setNotifs(built);
      setUnreadCount(built.filter((n) => n.unread).length);
    });
  }, []);

  // ── Derived user display ──────────────────────────────────────────────────
  const displayName = user
    ? (user.username || user.email?.split("@")[0] || "Admin")
    : "Admin";
  const firstName = displayName.split(/[\s._-]+/)[0];
  const initials  = displayName
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() || "AK";

  // ── Breadcrumbs ───────────────────────────────────────────────────────────
  const pathSegments = pathname.split("/").filter(Boolean);
  const breadcrumbs  = pathSegments.map((seg, i) => ({
    href:   `/${pathSegments.slice(0, i + 1).join("/")}`,
    label:  breadcrumbMap[seg] || seg,
    isLast: i === pathSegments.length - 1,
  }));

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMarkAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <header className={cn(
      "fixed right-0 top-0 z-30 flex h-[72px] items-center justify-between gap-2 border-b border-border bg-background/80 backdrop-blur-sm px-4 transition-all duration-300 lg:px-6 left-0",
      sidebarCollapsed ? "lg:left-20" : "lg:left-[280px]",
    )}>

      {/* Hamburger + Breadcrumbs */}
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 lg:hidden"
          onClick={onMobileMenuOpen} aria-label="Ouvrir le menu">
          <Menu className="h-5 w-5" />
        </Button>

        <nav className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className={cn("flex items-center gap-1", !crumb.isLast && "hidden sm:flex")}>
              {index > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              {crumb.isLast ? (
                <span className="truncate font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="whitespace-nowrap text-muted-foreground hover:text-foreground transition-colors">
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">

        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
              <Input
                type="search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-40 h-9 sm:w-64"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-9 w-9"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick create */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Créer</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Actions rapides</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {quickActions.map((action) => (
              <DropdownMenuItem key={action.href} asChild>
                <Link href={action.href} className="flex items-center gap-2 cursor-pointer">
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm"
                  className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                  onClick={handleMarkAllRead}>
                  Tout marquer comme lu
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notifs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            ) : notifs.map((notif) => (
              <DropdownMenuItem key={notif.id}
                className={cn("flex items-start gap-3 p-3 cursor-pointer", notif.unread && "bg-primary/[0.03]")}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <notif.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm leading-tight">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">{notif.time}</p>
                </div>
                {notif.unread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/evenements"
                className="w-full text-center text-sm text-primary cursor-pointer justify-center">
                Voir tous les événements
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">{firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role ?? "admin"}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/parametres" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive flex items-center gap-2 cursor-pointer"
              onClick={handleLogout}>
              <LogOut className="h-4 w-4" />Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
