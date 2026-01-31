"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Calendar, MapPin, Clock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Event {
  id: string
  title: string
  date: string
  time: string
  location: string
  type: "concert" | "expo" | "workshop" | "festival"
  attendees: number
  daysUntil: number
}

const events: Event[] = [
  {
    id: "1",
    title: "Concert de Goma",
    date: "2 Fév 2026",
    time: "19:00",
    location: "Place de l'Indépendance",
    type: "concert",
    attendees: 250,
    daysUntil: 3,
  },
  {
    id: "2",
    title: "Exposition Art Contemporain",
    date: "10 Fév 2026",
    time: "10:00",
    location: "Musée de Bukavu",
    type: "expo",
    attendees: 80,
    daysUntil: 11,
  },
  {
    id: "3",
    title: "Atelier Sculpture",
    date: "15 Fév 2026",
    time: "14:00",
    location: "Centre Culturel",
    type: "workshop",
    attendees: 25,
    daysUntil: 16,
  },
]

const eventTypeStyles = {
  concert: "bg-primary/10 text-primary",
  expo: "bg-info/10 text-info",
  workshop: "bg-success/10 text-success",
  festival: "bg-warning/10 text-warning",
}

const eventTypeLabels = {
  concert: "Concert",
  expo: "Exposition",
  workshop: "Atelier",
  festival: "Festival",
}

export function UpcomingEvents() {
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
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/admin/evenements/${event.id}`}
            className="group block rounded-lg border border-border p-4 transition-smooth hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {event.title}
                  </h4>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", eventTypeStyles[event.type])}
                  >
                    {eventTypeLabels[event.type]}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {event.date} à {event.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {event.attendees} inscrits
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-center",
                  event.daysUntil <= 7
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <p className="font-mono text-xl font-bold">{event.daysUntil}</p>
                <p className="text-xs">jour{event.daysUntil > 1 ? "s" : ""}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
