"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Home,
  BarChart3,
  CalendarDays,
  Newspaper,
  Music,
  Disc3,
  Mic2,
  Radio,
  Tv,
  Music2,
  Calendar,
  MessagesSquare,
  ImageIcon,
  Mail,
  Users,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Pilotage",
    items: [
      { title: "Page d'accueil", href: "/admin/accueil", icon: Home },
      { title: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
      { title: "Statistiques", href: "/admin/statistiques", icon: BarChart3 },
      { title: "Planning éditorial", href: "/admin/planning", icon: CalendarDays },
    ],
  },
  {
    label: "Contenu",
    items: [
      { title: "Articles", href: "/admin/articles", icon: Newspaper },
      { title: "Artistes", href: "/admin/artistes", icon: Music },
      { title: "Sorties", href: "/admin/releases", icon: Disc3 },
      { title: "Podcasts", href: "/admin/podcasts", icon: Mic2 },
      { title: "Émissions Live", href: "/admin/emissions", icon: Radio },
      { title: "Web TV", href: "/admin/webtv", icon: Tv },
      { title: "Live Music", href: "/admin/live-music", icon: Music2 },
      { title: "Radio", href: "/admin/radio", icon: Radio },
      { title: "Événements", href: "/admin/evenements", icon: Calendar },
    ],
  },
  {
    label: "Gestion",
    items: [
      { title: "Communauté", href: "/admin/community", icon: MessagesSquare },
      { title: "Médiathèque", href: "/admin/mediatheque", icon: ImageIcon },
      { title: "Newsletter", href: "/admin/newsletter", icon: Mail },
      { title: "Utilisateurs", href: "/admin/utilisateurs", icon: Users },
      { title: "Paramètres", href: "/admin/parametres", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

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
    admin: "Administrateur",
    editor: "Éditeur",
    moderator: "Modérateur",
    viewer: "Lecteur",
    user: "Utilisateur",
  };
  const roleLabel = roleLabels[user?.role ?? "viewer"] ?? user?.role ?? "viewer";

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="sb">
      <div className="sb-head">
        <Link href="/admin/accueil" className="logo" aria-label="Art-du-Kivu">
          <Image src="/logo.png" alt="Art-du-Kivu" width={42} height={42} className="object-contain" />
        </Link>
        <div>
          <div className="brand-t">Art-du-Kivu</div>
          <div className="brand-s">Console d&apos;administration</div>
        </div>
      </div>

      <nav className="sb-scroll">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="nav-lbl">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("nav-i", active && "on")}
                  title={item.title}
                >
                  <Icon className="ic" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-user">
        <div className="av">{initials}</div>
        <div className="min-w-0">
          <div className="su-n truncate">{displayName}</div>
          <div className="su-r truncate">{roleLabel}</div>
        </div>
        <button className="su-out" aria-label="Déconnexion" onClick={handleLogout}>
          <LogOut />
        </button>
      </div>
    </aside>
  );
}
