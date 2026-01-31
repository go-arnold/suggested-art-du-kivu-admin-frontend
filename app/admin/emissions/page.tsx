"use client"

import { useState } from "react"
import {
  Radio,
  Play,
  Pause,
  Calendar,
  Clock,
  Users,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Wifi,
  WifiOff,
  Video,
  Mic,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LiveShow {
  id: string
  title: string
  description: string
  host: string
  hostAvatar: string
  scheduledDate: string
  scheduledTime: string
  duration: string
  status: "live" | "scheduled" | "ended" | "cancelled"
  viewers: number
  type: "video" | "audio"
  thumbnail: string
}

const mockShows: LiveShow[] = [
  {
    id: "1",
    title: "Soirée Jazz du Kivu",
    description: "Une soirée musicale avec les meilleurs artistes jazz de la région",
    host: "Jean-Pierre Mulongo",
    hostAvatar: "/placeholder.svg",
    scheduledDate: "2026-01-30",
    scheduledTime: "20:00",
    duration: "2h",
    status: "live",
    viewers: 1247,
    type: "video",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "2",
    title: "Découverte des Talents",
    description: "Émission hebdomadaire présentant les nouveaux artistes",
    host: "Marie Kabila",
    hostAvatar: "/placeholder.svg",
    scheduledDate: "2026-01-31",
    scheduledTime: "19:00",
    duration: "1h30",
    status: "scheduled",
    viewers: 0,
    type: "video",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "3",
    title: "Radio Kivu - Matinale",
    description: "L'actualité culturelle du matin",
    host: "Patrick Bisimwa",
    hostAvatar: "/placeholder.svg",
    scheduledDate: "2026-02-01",
    scheduledTime: "07:00",
    duration: "3h",
    status: "scheduled",
    viewers: 0,
    type: "audio",
    thumbnail: "/placeholder.svg",
  },
  {
    id: "4",
    title: "Concert Live - Fally Ipupa",
    description: "Retransmission en direct du concert à Goma",
    host: "Équipe Art-du-Kivu",
    hostAvatar: "/placeholder.svg",
    scheduledDate: "2026-01-29",
    scheduledTime: "21:00",
    duration: "3h",
    status: "ended",
    viewers: 15420,
    type: "video",
    thumbnail: "/placeholder.svg",
  },
]

function getStatusBadge(status: LiveShow["status"]) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-red-500 text-white animate-pulse">
          <Wifi className="mr-1 h-3 w-3" />
          En Direct
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Clock className="mr-1 h-3 w-3" />
          Programmé
        </Badge>
      )
    case "ended":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <WifiOff className="mr-1 h-3 w-3" />
          Terminé
        </Badge>
      )
    case "cancelled":
      return (
        <Badge variant="destructive">
          Annulé
        </Badge>
      )
  }
}

export default function EmissionsPage() {
  const [shows, setShows] = useState<LiveShow[]>(mockShows)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredShows = shows.filter((show) => {
    const matchesSearch =
      show.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      show.host.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || show.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const liveNow = shows.filter((s) => s.status === "live")
  const scheduled = shows.filter((s) => s.status === "scheduled")
  const totalViewers = shows.reduce((acc, s) => acc + s.viewers, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Émissions Live</h1>
          <p className="text-muted-foreground">
            Gérez vos diffusions en direct et programmées
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Émission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Programmer une Émission</DialogTitle>
              <DialogDescription>
                Créez une nouvelle émission en direct ou programmée.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre de l&apos;émission</Label>
                <Input id="title" placeholder="Ex: Soirée Jazz du Kivu" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre émission..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Heure</Label>
                  <Input id="time" type="time" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="duration">Durée estimée</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30m">30 minutes</SelectItem>
                      <SelectItem value="1h">1 heure</SelectItem>
                      <SelectItem value="1h30">1h30</SelectItem>
                      <SelectItem value="2h">2 heures</SelectItem>
                      <SelectItem value="3h">3 heures</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Vidéo</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="host">Présentateur</Label>
                <Input id="host" placeholder="Nom du présentateur" />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Programmer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En Direct
            </CardTitle>
            <Radio className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{liveNow.length}</div>
            <p className="text-xs text-muted-foreground">émission(s) active(s)</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Programmées
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduled.length}</div>
            <p className="text-xs text-muted-foreground">à venir</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spectateurs Live
            </CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {liveNow.reduce((acc, s) => acc + s.viewers, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">en ce moment</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vues
            </CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViewers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une émission..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="live">En Direct</SelectItem>
            <SelectItem value="scheduled">Programmé</SelectItem>
            <SelectItem value="ended">Terminé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Shows List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredShows.map((show) => (
          <Card key={show.id} className="card-shadow overflow-hidden">
            <div className="flex">
              <div className="relative h-32 w-32 flex-shrink-0 bg-muted">
                <img
                  src={show.thumbnail || "/placeholder.svg"}
                  alt={show.title}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  {show.type === "video" ? (
                    <Video className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </div>
                {show.status === "live" && (
                  <div className="absolute left-2 top-2">
                    <span className="flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {getStatusBadge(show.status)}
                      <Badge variant="outline" className="text-xs">
                        {show.type === "video" ? "Vidéo" : "Audio"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-foreground line-clamp-1">
                      {show.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {show.description}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {show.status === "live" ? (
                        <DropdownMenuItem>
                          <Pause className="mr-2 h-4 w-4" />
                          Arrêter la diffusion
                        </DropdownMenuItem>
                      ) : show.status === "scheduled" ? (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Démarrer maintenant
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Voir les statistiques</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(show.scheduledDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {show.scheduledTime}
                    </span>
                    <span>{show.duration}</span>
                  </div>
                  {show.viewers > 0 && (
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {show.viewers.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <img
                    src={show.hostAvatar || "/placeholder.svg"}
                    alt={show.host}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="text-muted-foreground">{show.host}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredShows.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">
              Aucune émission trouvée
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez vos filtres ou créez une nouvelle émission.
            </p>
            <Button
              className="mt-4 bg-primary hover:bg-primary/90"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer une émission
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
