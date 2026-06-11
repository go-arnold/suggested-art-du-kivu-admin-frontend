"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Users,
  ImageIcon,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Music,
  Calendar,
  Newspaper,
  Mic2,
  Radio,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Contenu",
    icon: FileText,
    submenu: [
      { title: "Articles", href: "/admin/articles", icon: Newspaper },
      { title: "Artistes", href: "/admin/artistes", icon: Music },
      { title: "Événements", href: "/admin/evenements", icon: Calendar },
      { title: "Podcasts", href: "/admin/podcasts", icon: Mic2 },
      { title: "Émissions Live", href: "/admin/emissions", icon: Radio },
    ],
  },
  {
    title: "Médiathèque",
    href: "/admin/mediatheque",
    icon: ImageIcon,
  },
  {
    title: "Utilisateurs",
    href: "/admin/utilisateurs",
    icon: Users,
  },
  {
    title: "Paramètres",
    href: "/admin/parametres",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(["Contenu"]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 african-pattern",
          collapsed ? "w-20" : "w-[280px]",
        )}
      >
        {/* Logo */}
        <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 transition-transform group-hover:scale-105">
                <Image
                  src="/logo.png"
                  alt="Art-du-Kivu"
                  width={40}
                  height={40}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-lg leading-tight text-sidebar-foreground">
                  Art-du-Kivu
                </span>
                <span className="text-xs text-sidebar-muted">
                  Administration
                </span>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5">
                <Image
                  src="/logo.png"
                  alt="Art-du-Kivu"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasSubmenu = !!item.submenu;
              const isOpen = openMenus.includes(item.title);
              const active = item.href
                ? isActive(item.href)
                : item.submenu?.some((sub) => isActive(sub.href));

              if (hasSubmenu && !collapsed) {
                return (
                  <li key={item.title}>
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleMenu(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth hover:bg-sidebar-accent",
                            active && "text-primary",
                          )}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1 text-left">{item.title}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform duration-200",
                              isOpen && "rotate-180",
                            )}
                          />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        <ul className="ml-4 space-y-1 border-l border-sidebar-border pl-4">
                          {item.submenu?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const subActive = isActive(subItem.href);
                            return (
                              <li key={subItem.href}>
                                <Link
                                  href={subItem.href}
                                  className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth hover:bg-sidebar-accent",
                                    subActive
                                      ? "bg-primary/10 text-primary font-medium"
                                      : "text-sidebar-muted hover:text-sidebar-foreground",
                                  )}
                                >
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                  {subActive && (
                                    <div className="absolute left-0 h-6 w-1 rounded-r-full bg-primary" />
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  </li>
                );
              }

              if (collapsed) {
                return (
                  <li key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href || item.submenu?.[0]?.href || "#"}
                          className={cn(
                            "flex h-11 w-11 items-center justify-center rounded-lg transition-smooth hover:bg-sidebar-accent mx-auto",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-sidebar-muted hover:text-sidebar-foreground",
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                );
              }

              return (
                <li key={item.title}>
                  <Link
                    href={item.href || "#"}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth hover:bg-sidebar-accent",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-sidebar-muted hover:text-sidebar-foreground",
                    )}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-smooth cursor-pointer group">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
                <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                  JM
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Jeremy Matabaro</p>
                <p className="text-xs text-sidebar-muted truncate">
                  Administrateur
                </p>
              </div>
              <LogOut className="h-4 w-4 text-sidebar-muted group-hover:text-sidebar-foreground transition-colors" />
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-smooth">
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                      JM
                    </AvatarFallback>
                  </Avatar>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                Jeremy Matabaro - Administrateur
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>
    </TooltipProvider>
  );
}
