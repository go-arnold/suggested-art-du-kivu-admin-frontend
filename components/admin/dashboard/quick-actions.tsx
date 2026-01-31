"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { FileText, Music, Calendar, Upload, Mail, BarChart3, Type as type, LucideIcon } from "lucide-react"

interface QuickAction {
  label: string
  description: string
  href: string
  icon: LucideIcon
  color: string
}

const quickActions: QuickAction[] = [
  {
    label: "Nouvel Article",
    description: "Créer un nouveau post",
    href: "/admin/articles/nouveau",
    icon: FileText,
    color: "bg-info/10 text-info hover:bg-info hover:text-info-foreground",
  },
  {
    label: "Promouvoir Artiste",
    description: "Mettre en avant un talent",
    href: "/admin/artistes?action=promote",
    icon: Music,
    color: "bg-warning/10 text-warning hover:bg-warning hover:text-warning-foreground",
  },
  {
    label: "Créer Événement",
    description: "Planifier un événement",
    href: "/admin/evenements/nouveau",
    icon: Calendar,
    color: "bg-success/10 text-success hover:bg-success hover:text-success-foreground",
  },
  {
    label: "Upload Media",
    description: "Ajouter des fichiers",
    href: "/admin/mediatheque?action=upload",
    icon: Upload,
    color: "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
  },
  {
    label: "Newsletter",
    description: "Gérer les abonnés",
    href: "/admin/newsletter",
    icon: Mail,
    color: "bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground",
  },
  {
    label: "Statistiques",
    description: "Voir les analyses",
    href: "/admin/statistiques",
    icon: BarChart3,
    color: "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground",
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl bg-card p-6 card-shadow">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Actions Rapides
      </h3>
      <p className="text-sm text-muted-foreground">
        Accès direct aux tâches fréquentes
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex flex-col items-center gap-3 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
                action.color
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-background/50 transition-colors group-hover:bg-background/80">
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{action.label}</p>
                <p className="text-xs opacity-80 hidden sm:block">
                  {action.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
