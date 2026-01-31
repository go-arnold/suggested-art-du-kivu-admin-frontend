"use client"

import { cn } from "@/lib/utils"
import { FileText, Star, Heart, MessageSquare, Type as type, LucideIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Activity {
  id: string
  type: "publication" | "artist" | "like" | "comment"
  title: string
  description: string
  timestamp: string
  user?: {
    name: string
    avatar?: string
    initials: string
  }
}

const activityIcons: Record<Activity["type"], LucideIcon> = {
  publication: FileText,
  artist: Star,
  like: Heart,
  comment: MessageSquare,
}

const activityColors: Record<Activity["type"], string> = {
  publication: "bg-info/10 text-info",
  artist: "bg-warning/10 text-warning",
  like: "bg-destructive/10 text-destructive",
  comment: "bg-success/10 text-success",
}

const activities: Activity[] = [
  {
    id: "1",
    type: "publication",
    title: "Nouvel article publié",
    description: "\"Les rythmes du Kivu\" a été publié avec succès",
    timestamp: "Il y a 5 min",
    user: { name: "Jean Dupont", initials: "JD" },
  },
  {
    id: "2",
    type: "artist",
    title: "Nouvel artiste ajouté",
    description: "Marie Kalume a rejoint la plateforme",
    timestamp: "Il y a 1h",
    user: { name: "Admin", initials: "AD" },
  },
  {
    id: "3",
    type: "like",
    title: "Nouveau like",
    description: "\"Concert de Goma\" a reçu 25 nouveaux likes",
    timestamp: "Il y a 2h",
  },
  {
    id: "4",
    type: "comment",
    title: "Commentaire en attente",
    description: "3 nouveaux commentaires à modérer",
    timestamp: "Il y a 3h",
  },
  {
    id: "5",
    type: "publication",
    title: "Article mis à jour",
    description: "\"Festival Amani 2026\" a été modifié",
    timestamp: "Il y a 4h",
    user: { name: "Sophie M.", initials: "SM" },
  },
]

export function ActivityFeed() {
  return (
    <div className="rounded-xl bg-card p-6 card-shadow">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Activités Récentes
      </h3>
      <p className="text-sm text-muted-foreground">
        Dernières actions sur la plateforme
      </p>

      <div className="mt-6 space-y-1">
        {activities.map((activity, index) => {
          const Icon = activityIcons[activity.type]
          const colorClass = activityColors[activity.type]

          return (
            <div
              key={activity.id}
              className={cn(
                "group relative flex items-start gap-4 rounded-lg p-3 transition-smooth hover:bg-muted/50",
                index !== activities.length - 1 && "border-b border-border/50"
              )}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  colorClass
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground truncate">
                  {activity.description}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {activity.user && (
                    <>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.user.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {activity.user.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {activity.user.name}
                      </span>
                      <span className="text-muted-foreground">·</span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth">
        Voir toutes les activités
      </button>
    </div>
  )
}
