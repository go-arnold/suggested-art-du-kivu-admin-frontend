"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Bell, Search, Plus, FileText, Music, Calendar,
  Bell as BellIcon, LogOut, Settings, ChevronDown,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { eventsApi, articlesApi, searchApi, type SearchResult } from "@/lib/api";

const quickActions = [
  { label: "Nouvel Article",   href: "/admin/articles/nouveau", icon: FileText },
  { label: "Nouvel Artiste",   href: "/admin/artistes/nouveau", icon: Music    },
  { label: "Nouvel Événement", href: "/admin/evenements",       icon: Calendar },
];

const breadcrumbMap: Record<string, string> = {
  admin: "Tableau de bord",
  accueil: "Page d'accueil",
  articles: "Articles",
  artistes: "Artistes",
  releases: "Sorties",
  evenements: "Événements",
  podcasts: "Podcasts",
  emissions: "Émissions Live",
  webtv: "Web TV",
  "live-music": "Live Music",
  radio: "Radio",
  mediatheque: "Médiathèque",
  utilisateurs: "Utilisateurs",
  community: "Communauté",
  planning: "Planning éditorial",
  parametres: "Paramètres",
  newsletter: "Newsletter",
  statistiques: "Statistiques",
  notifications: "Notifications",
  nouveau: "Nouveau",
  modifier: "Modifier",
};

interface Notif {
  id: string;
  message: string;
  time: string;
  icon: typeof BellIcon;
  unread: boolean;
}

export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recherche globale (debouncée) via /search/
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    const t = setTimeout(async () => {
      try { setSearchResults((await searchApi.query(q)).results.slice(0, 8)); }
      catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fermer le menu résultats en cliquant ailleurs
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const SEARCH_HREF: Record<string, string> = {
    artists: "/admin/artistes", articles: "/admin/articles", events: "/admin/evenements",
    podcast_series: "/admin/podcasts", podcast_episodes: "/admin/podcasts",
    webtv_videos: "/admin/mediatheque", releases: "/admin/releases", community_posts: "/admin/community",
  };
  const SEARCH_LABEL: Record<string, string> = {
    artists: "Artiste", articles: "Article", events: "Événement",
    podcast_series: "Podcast", podcast_episodes: "Épisode", webtv_videos: "Vidéo",
    releases: "Sortie", community_posts: "Post",
  };
  const openResult = (r: SearchResult) => {
    setSearchQuery(""); setSearchResults([]); setSearchFocused(false);
    const base = SEARCH_HREF[r.type] ?? "/admin";
    router.push(r.type === "artists" || r.type === "articles" ? `${base}/${r.slug}` : base);
  };

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    Promise.allSettled([
      articlesApi.list("page_size=3"),
      eventsApi.list("status=upcoming&page_size=3"),
    ]).then(([articlesRes, eventsRes]) => {
      const built: Notif[] = [];
      if (articlesRes.status === "fulfilled" && articlesRes.value.results.length > 0) {
        const latest = articlesRes.value.results[0];
        built.push({
          id: `article-${latest.id}`,
          message: `Nouvel article : "${latest.title.slice(0, 40)}…"`,
          time: latest.published_at
            ? new Date(latest.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
            : "Récemment",
          icon: FileText,
          unread: true,
        });
      }
      if (eventsRes.status === "fulfilled") {
        eventsRes.value.results.slice(0, 2).forEach((ev) => {
          const days = Math.ceil((new Date(ev.date).getTime() - Date.now()) / 86400000);
          if (days >= 0 && days <= 7) {
            built.push({
              id: `event-${ev.id}`,
              message: `Événement dans ${days === 0 ? "aujourd'hui" : `${days}j`} : ${ev.title.slice(0, 35)}…`,
              time: new Date(ev.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
              icon: Calendar,
              unread: true,
            });
          }
        });
      }
      setNotifs(built);
      setUnreadCount(built.filter((n) => n.unread).length);
    });
  }, []);

  const displayName = user
    ? (user.username || user.email?.split("@")[0] || "Admin")
    : "Admin";
  const initials =
    displayName
      .split(/[\s._-]+/)
      .slice(0, 2)
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "AK";
  const roleLabels: Record<string, string> = {
    admin: "Administrateur", editor: "Éditeur", moderator: "Modérateur",
    viewer: "Lecteur", user: "Utilisateur",
  };
  const roleLabel = roleLabels[user?.role ?? "admin"] ?? user?.role ?? "admin";

  // Fil d'ariane : Accueil / <page courante>
  const pathSegments = pathname.split("/").filter(Boolean);
  const currentLabel =
    breadcrumbMap[pathSegments[pathSegments.length - 1]] ||
    breadcrumbMap[pathSegments[1]] ||
    "Tableau de bord";

  const handleMarkAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const showResults = searchFocused && searchQuery.trim().length >= 2;

  return (
    <header className="topbar">
      <div className="crumb">
        <Link href="/admin">Accueil</Link>
        <span className="sep">/</span>
        <span className="cur">{currentLabel}</span>
      </div>

      {/* Recherche globale */}
      <div ref={searchRef} className="relative" style={{ flex: 1, maxWidth: 440, marginLeft: 8 }}>
        <div className="cmdk" style={{ margin: 0, maxWidth: "none" }}>
          <Search />
          <input
            placeholder="Rechercher un contenu, un artiste, un membre…"
            aria-label="Rechercher"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
          />
        </div>
        {showResults && (
          <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-[var(--shadow-pop)]">
            {searchLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Recherche…</p>
            ) : searchResults.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Aucun résultat</p>
            ) : (
              searchResults.map((r) => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => openResult(r)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex-1 truncate">{r.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {SEARCH_LABEL[r.type] ?? r.type}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="tb-r">
        {/* Créer */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="btn btn-red">
              <Plus strokeWidth={2.2} />
              <span className="hidden sm:inline">Créer</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
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
            <button className="icon-btn" aria-label="Notifications">
              <Bell strokeWidth={1.8} />
              {unreadCount > 0 && <span className="dot" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && (
                <button
                  className="text-xs text-primary hover:text-primary/80"
                  onClick={handleMarkAllRead}
                >
                  Tout marquer comme lu
                </button>
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
                {notif.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
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

        {/* Profil */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="tb-prof">
              <div className="av">{initials}</div>
              <div className="text-left">
                <div className="nm">{displayName}</div>
                <div className="rl">{roleLabel}</div>
              </div>
              <ChevronDown />
            </button>
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
