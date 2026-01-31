"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Bell, Calendar, FileText, MessageSquare, X, ChevronRight, Clock, Type as type, LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Alert {
  id: string
  type: "warning" | "info" | "urgent"
  title: string
  description: string
  href: string
  icon: LucideIcon
  time: string
}

const initialAlerts: Alert[] = [
  {
    id: "1",
    type: "urgent",
    title: "Commentaires en attente",
    description: "12 commentaires requièrent une modération",
    href: "/admin/commentaires",
    icon: MessageSquare,
    time: "Il y a 2h",
  },
  {
    id: "2",
    type: "warning",
    title: "Concert de Goma",
    description: "Événement prévu dans 3 jours",
    href: "/admin/evenements/1",
    icon: Calendar,
    time: "Rappel",
  },
  {
    id: "3",
    type: "info",
    title: "Brouillons anciens",
    description: "5 articles non publiés depuis 7 jours",
    href: "/admin/articles?status=draft",
    icon: FileText,
    time: "Cette semaine",
  },
]

export function AlertsSection() {
  const [alerts, setAlerts] = useState(initialAlerts)

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  if (alerts.length === 0) {
    return null
  }

  const urgentCount = alerts.filter(a => a.type === "urgent").length

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="h-5 w-5 text-foreground" />
            {urgentCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
            </h3>
            <p className="text-xs text-muted-foreground">
              {alerts.length} en attente
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground h-8"
          onClick={() => setAlerts([])}
        >
          Tout effacer
        </Button>
      </div>

      {/* Alerts List */}
      <div className="divide-y divide-border">
        {alerts.map((alert) => {
          const Icon = alert.icon
          const isUrgent = alert.type === "urgent"
          const isWarning = alert.type === "warning"

          return (
            <div
              key={alert.id}
              className={cn(
                "group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50",
                isUrgent && "bg-primary/[0.02]"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isUrgent && "bg-primary/10 text-primary",
                  isWarning && "bg-warning/10 text-warning",
                  !isUrgent && !isWarning && "bg-secondary/50 text-secondary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm font-medium text-foreground truncate",
                    isUrgent && "text-primary"
                  )}>
                    {alert.title}
                  </p>
                  {isUrgent && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-primary text-primary-foreground">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {alert.description}
                </p>
              </div>

              {/* Time & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {alert.time}
                </span>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={alert.href}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span className="sr-only">Voir</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Ignorer</span>
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border bg-muted/20">
        <Link 
          href="/admin/notifications" 
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          Voir toutes les notifications
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
