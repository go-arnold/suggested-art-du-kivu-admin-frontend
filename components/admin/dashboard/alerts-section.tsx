"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Bell, Calendar, FileText, X, ChevronRight, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { articlesApi, eventsApi } from "@/lib/api";

interface Alert {
  id: string;
  type: "warning" | "info" | "urgent";
  title: string;
  description: string;
  href: string;
  time: string;
}

export function AlertsSection() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Build real alerts from API data
    Promise.allSettled([
      // Articles without published_at = drafts (approximate)
      articlesApi.list("page_size=1"),
      // Upcoming events in the next 7 days
      eventsApi.list("status=upcoming&page_size=5"),
    ]).then(([articlesRes, eventsRes]) => {
      const newAlerts: Alert[] = [];

      if (articlesRes.status === "fulfilled") {
        const total = articlesRes.value.count;
        if (total > 0) {
          newAlerts.push({
            id: "articles",
            type: "info",
            title: `${total} articles publiés`,
            description: "Dernière publication récente sur la plateforme",
            href: "/admin/articles",
            time: "Aujourd'hui",
          });
        }
      }

      if (eventsRes.status === "fulfilled") {
        const upcoming = eventsRes.value.results;
        if (upcoming.length > 0) {
          const next = upcoming[0];
          const daysUntil = Math.ceil(
            (new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntil >= 0 && daysUntil <= 7) {
            newAlerts.push({
              id: `event-${next.id}`,
              type: "warning",
              title: next.title,
              description: `Événement dans ${daysUntil === 0 ? "aujourd'hui" : `${daysUntil} jour${daysUntil > 1 ? "s" : ""}`}`,
              href: `/admin/evenements/${next.slug}`,
              time: "Rappel",
            });
          }
        }

        const total = eventsRes.value.count;
        if (total > 0) {
          newAlerts.push({
            id: "events-upcoming",
            type: "info",
            title: `${total} événement${total > 1 ? "s" : ""} à venir`,
            description: "Consultez le calendrier des prochains événements",
            href: "/admin/evenements?status=upcoming",
            time: "Ce mois",
          });
        }
      }

      setAlerts(newAlerts);
    }).finally(() => setLoading(false));
  }, []);

  const dismiss = (id: string) =>
    setAlerts((prev) => prev.filter((a) => a.id !== id));

  if (!loading && alerts.length === 0) return null;

  const urgentCount = alerts.filter((a) => a.type === "urgent").length;

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
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <p className="text-xs text-muted-foreground">
              {loading ? "Chargement…" : `${alerts.length} en attente`}
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <Button variant="ghost" size="sm"
            className="text-xs text-muted-foreground hover:text-foreground h-8"
            onClick={() => setAlerts([])}>
            Tout effacer
          </Button>
        )}
      </div>

      {/* Alerts */}
      <div className="divide-y divide-border">
        {alerts.map((alert) => {
          const isUrgent = alert.type === "urgent";
          const isWarning = alert.type === "warning";
          const Icon = isUrgent || isWarning ? Calendar : FileText;

          return (
            <div
              key={alert.id}
              className={cn(
                "group relative flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50",
                isUrgent && "bg-primary/[0.02]"
              )}
            >
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isUrgent && "bg-primary/10 text-primary",
                isWarning && "bg-warning/10 text-warning",
                !isUrgent && !isWarning && "bg-secondary/50 text-secondary-foreground"
              )}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm font-medium text-foreground truncate",
                    isUrgent && "text-primary"
                  )}>
                    {alert.title}
                  </p>
                  {isUrgent && (
                    <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-primary text-primary-foreground">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{alert.time}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={alert.href}>
                    <Button variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => dismiss(alert.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {alerts.length > 0 && (
        <div className="px-5 py-3 border-t border-border bg-muted/20">
          <Link href="/admin/evenements"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
            Voir tous les événements
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
