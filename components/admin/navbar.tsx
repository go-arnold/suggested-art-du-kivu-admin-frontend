"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Bell,
  Search,
  Plus,
  ChevronRight,
  FileText,
  Music,
  Calendar,
  X,
  MessageSquare,
  Heart,
  UserPlus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const notifications = [
  {
    id: 1,
    type: "comment",
    message: "Nouveau commentaire sur 'Concert de Goma'",
    time: "Il y a 5 min",
    icon: MessageSquare,
  },
  {
    id: 2,
    type: "like",
    message: "15 nouveaux likes sur votre article",
    time: "Il y a 1h",
    icon: Heart,
  },
  {
    id: 3,
    type: "user",
    message: "Nouvel artiste inscrit: Marie K.",
    time: "Il y a 2h",
    icon: UserPlus,
  },
]

const quickActions = [
  { label: "Nouvel Article", href: "/admin/articles/nouveau", icon: FileText },
  { label: "Nouvel Artiste", href: "/admin/artistes/nouveau", icon: Music },
  { label: "Nouvel Événement", href: "/admin/evenements/nouveau", icon: Calendar },
]

const breadcrumbMap: Record<string, string> = {
  admin: "Dashboard",
  articles: "Articles",
  artistes: "Artistes",
  evenements: "Événements",
  podcasts: "Podcasts",
  live: "Émissions Live",
  mediatheque: "Médiathèque",
  utilisateurs: "Utilisateurs",
  parametres: "Paramètres",
  nouveau: "Nouveau",
  modifier: "Modifier",
}

interface AdminNavbarProps {
  sidebarCollapsed: boolean
}

export function AdminNavbar({ sidebarCollapsed }: AdminNavbarProps) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const pathSegments = pathname.split("/").filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join("/")}`
    const label = breadcrumbMap[segment] || segment
    return { href, label, isLast: index === pathSegments.length - 1 }
  })

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-[72px] items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 transition-all duration-300",
        sidebarCollapsed ? "left-20" : "left-[280px]"
      )}
    >
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            {crumb.isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          {searchOpen ? (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-4 duration-200">
              <Input
                type="search"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 h-9"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchQuery("")
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Quick Actions */}
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
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-primary hover:text-primary/80">
                Tout marquer comme lu
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((notif) => (
              <DropdownMenuItem key={notif.id} className="flex items-start gap-3 p-3 cursor-pointer">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <notif.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-tight">{notif.message}</p>
                  <p className="text-xs text-muted-foreground">{notif.time}</p>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/notifications" className="w-full text-center text-sm text-primary cursor-pointer">
                Voir toutes les notifications
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src="/placeholder-avatar.jpg" alt="Admin" />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  JD
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">Jean</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Déconnexion</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
