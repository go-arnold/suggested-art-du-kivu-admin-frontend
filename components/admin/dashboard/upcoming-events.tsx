"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { eventsApi, type EventList } from "@/lib/api";

export function UpcomingEvents() {
  const [events, setEvents] = useState<EventList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi
      .list("status=upcoming&page_size=5")
      .then((d) => setEvents(d.results))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categoryStyles: Record<string, string> = {
    festival: "bg-warning/10 text-warning",
    concert: "bg-primary/10 text-primary",
    exposition: "bg-info/10 text-info",
    atelier: "bg-success/10 text-success",
    conference: "bg-warning/10 text-warning",
    spectacle: "bg-purple-100 text-purple-700",
    expo: "bg-info/10 text-info",
  };

  return (
    <div className="rounded-xl bg-card p-6 card-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Événements à Venir
          </h3>
          <p className="text-sm text-muted-foreground">
            Prochains événements programmés
          </p>
        </div>
        <Link
          href="/admin/evenements"
          className="text-sm font-medium text-primary hover:underline"
        >
          Voir tout
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        {loading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && events.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun événement à venir
          </p>
        )}
        {!loading &&
          events.map((event) => {
            const daysUntil = Math.ceil(
              (new Date(event.date).getTime() - Date.now()) /
                (1000 * 60 * 60 * 24)
            );

            return (
              <Link
                key={event.id}
                href={`/admin/evenements/${event.slug}`}
                className="group block rounded-lg border border-border p-4 transition-smooth hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {event.title}
                      </h4>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          categoryStyles[event.category?.toLowerCase()] ??
                            "bg-muted text-muted-foreground"
                        )}
                      >
                        {event.category}
                      </Badge>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(event.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {event.venue_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.venue_name}
                          {event.city_name ? `, ${event.city_name}` : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {daysUntil >= 0 && (
                    <div
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-1.5 text-center",
                        daysUntil <= 7
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <p className="font-mono text-xl font-bold">{daysUntil}</p>
                      <p className="text-xs">jour{daysUntil !== 1 ? "s" : ""}</p>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
