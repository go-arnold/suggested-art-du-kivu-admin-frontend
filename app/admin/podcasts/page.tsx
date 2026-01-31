"use client"

import { useState } from "react"
import {
  Headphones,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Clock,
  Calendar,
  BarChart3,
  Upload,
  Mic,
  Edit,
  Trash2,
  Download,
  Share2,
  Eye,
  Heart,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

interface Episode {
  id: string
  title: string
  description: string
  podcastName: string
  podcastImage: string
  duration: string
  publishDate: string
  status: "published" | "draft" | "scheduled"
  plays: number
  likes: number
  audioUrl: string
}

interface Podcast {
  id: string
  name: string
  description: string
  host: string
  category: string
  image: string
  episodeCount: number
  totalPlays: number
  subscribers: number
  status: "active" | "paused"
}

const mockPodcasts: Podcast[] = [
  {
    id: "1",
    name: "Voix du Kivu",
    description: "Histoires et témoignages des artistes de la région",
    host: "Marie Kabila",
    category: "Culture",
    image: "/placeholder.svg",
    episodeCount: 45,
    totalPlays: 125000,
    subscribers: 3240,
    status: "active",
  },
  {
    id: "2",
    name: "Rythmes Africains",
    description: "Exploration de la musique traditionnelle et moderne",
    host: "Jean-Pierre Mulongo",
    category: "Musique",
    image: "/placeholder.svg",
    episodeCount: 32,
    totalPlays: 89000,
    subscribers: 2180,
    status: "active",
  },
  {
    id: "3",
    name: "Art & Paix",
    description: "L'art comme vecteur de réconciliation",
    host: "Patrick Bisimwa",
    category: "Société",
    image: "/placeholder.svg",
    episodeCount: 18,
    totalPlays: 45000,
    subscribers: 1520,
    status: "paused",
  },
]

const mockEpisodes: Episode[] = [
  {
    id: "1",
    title: "L'héritage musical de Tabu Ley",
    description: "Retour sur la carrière légendaire du roi de la rumba congolaise",
    podcastName: "Rythmes Africains",
    podcastImage: "/placeholder.svg",
    duration: "45:30",
    publishDate: "2026-01-28",
    status: "published",
    plays: 4520,
    likes: 342,
    audioUrl: "/audio/episode1.mp3",
  },
  {
    id: "2",
    title: "Rencontre avec Fally Ipupa",
    description: "Interview exclusive avec la star de la musique congolaise",
    podcastName: "Voix du Kivu",
    podcastImage: "/placeholder.svg",
    duration: "1:02:15",
    publishDate: "2026-01-25",
    status: "published",
    plays: 8930,
    likes: 892,
    audioUrl: "/audio/episode2.mp3",
  },
  {
    id: "3",
    title: "Les femmes dans l'art congolais",
    description: "Portrait de femmes artistes qui façonnent la scène culturelle",
    podcastName: "Voix du Kivu",
    podcastImage: "/placeholder.svg",
    duration: "38:45",
    publishDate: "2026-01-30",
    status: "scheduled",
    plays: 0,
    likes: 0,
    audioUrl: "/audio/episode3.mp3",
  },
  {
    id: "4",
    title: "La danse comme expression de paix",
    description: "Comment la danse traditionnelle unit les communautés",
    podcastName: "Art & Paix",
    podcastImage: "/placeholder.svg",
    duration: "52:20",
    publishDate: "2026-01-22",
    status: "published",
    plays: 2340,
    likes: 178,
    audioUrl: "/audio/episode4.mp3",
  },
  {
    id: "5",
    title: "Nouvel épisode en préparation",
    description: "Brouillon d'un nouvel épisode sur la sculpture traditionnelle",
    podcastName: "Voix du Kivu",
    podcastImage: "/placeholder.svg",
    duration: "00:00",
    publishDate: "",
    status: "draft",
    plays: 0,
    likes: 0,
    audioUrl: "",
  },
]

function getStatusBadge(status: Episode["status"]) {
  switch (status) {
    case "published":
      return (
        <Badge className="bg-emerald-500 text-white">
          Publié
        </Badge>
      )
    case "scheduled":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Programmé
        </Badge>
      )
    case "draft":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Brouillon
        </Badge>
      )
  }
}

export default function PodcastsPage() {
  const [podcasts] = useState<Podcast[]>(mockPodcasts)
  const [episodes, setEpisodes] = useState<Episode[]>(mockEpisodes)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPodcast, setFilterPodcast] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("episodes")
  const [playingEpisode, setPlayingEpisode] = useState<string | null>(null)

  const filteredEpisodes = episodes.filter((ep) => {
    const matchesSearch =
      ep.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ep.podcastName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || ep.status === filterStatus
    const matchesPodcast = filterPodcast === "all" || ep.podcastName === filterPodcast
    return matchesSearch && matchesStatus && matchesPodcast
  })

  const totalPlays = podcasts.reduce((acc, p) => acc + p.totalPlays, 0)
  const totalSubscribers = podcasts.reduce((acc, p) => acc + p.subscribers, 0)
  const totalEpisodes = podcasts.reduce((acc, p) => acc + p.episodeCount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Podcasts</h1>
          <p className="text-muted-foreground">
            Gérez vos podcasts et épisodes audio
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel Épisode
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ajouter un Épisode</DialogTitle>
                <DialogDescription>
                  Créez un nouvel épisode pour l&apos;un de vos podcasts.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="podcast">Podcast</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un podcast" />
                    </SelectTrigger>
                    <SelectContent>
                      {podcasts.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="title">Titre de l&apos;épisode</Label>
                  <Input id="title" placeholder="Ex: Interview avec..." />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez cet épisode..."
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fichier Audio</Label>
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 transition-colors hover:border-primary/50">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Glissez un fichier audio ou{" "}
                        <span className="text-primary">parcourir</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MP3, WAV jusqu&apos;à 500MB
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="publishDate">Date de publication</Label>
                    <Input id="publishDate" type="date" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="publishTime">Heure</Label>
                    <Input id="publishTime" type="time" />
                  </div>
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
                  Créer l&apos;épisode
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Podcasts Actifs
            </CardTitle>
            <Mic className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {podcasts.filter((p) => p.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">
              sur {podcasts.length} total
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Épisodes
            </CardTitle>
            <Headphones className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEpisodes}</div>
            <p className="text-xs text-muted-foreground">publiés</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Écoutes Totales
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlays.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% ce mois</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abonnés
            </CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+8% ce mois</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="episodes">Épisodes</TabsTrigger>
          <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un épisode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterPodcast} onValueChange={setFilterPodcast}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Mic className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Podcast" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les podcasts</SelectItem>
                {podcasts.map((p) => (
                  <SelectItem key={p.id} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="scheduled">Programmé</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Episodes List */}
          <div className="space-y-3">
            {filteredEpisodes.map((episode) => (
              <Card key={episode.id} className="card-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 flex-shrink-0 rounded-lg bg-muted">
                    <img
                      src={episode.podcastImage || "/placeholder.svg"}
                      alt={episode.podcastName}
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={() =>
                        setPlayingEpisode(
                          playingEpisode === episode.id ? null : episode.id
                        )
                      }
                      className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                    >
                      {playingEpisode === episode.id ? (
                        <Pause className="h-6 w-6 text-white" />
                      ) : (
                        <Play className="h-6 w-6 text-white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(episode.status)}
                      <span className="text-xs text-muted-foreground">
                        {episode.podcastName}
                      </span>
                    </div>
                    <h3 className="mt-1 font-semibold text-foreground line-clamp-1">
                      {episode.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {episode.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      {episode.publishDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(episode.publishDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                      {episode.duration !== "00:00" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {episode.duration}
                        </span>
                      )}
                      {episode.plays > 0 && (
                        <span className="flex items-center gap-1">
                          <Headphones className="h-3 w-3" />
                          {episode.plays.toLocaleString()}
                        </span>
                      )}
                      {episode.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {episode.likes}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Aperçu
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="mr-2 h-4 w-4" />
                        Partager
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEpisodes.length === 0 && (
            <Card className="card-shadow">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Headphones className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 font-semibold text-foreground">
                  Aucun épisode trouvé
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Modifiez vos filtres ou créez un nouvel épisode.
                </p>
                <Button
                  className="mt-4 bg-primary hover:bg-primary/90"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un épisode
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="podcasts" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {podcasts.map((podcast) => (
              <Card key={podcast.id} className="card-shadow overflow-hidden">
                <div className="relative h-40 bg-muted">
                  <img
                    src={podcast.image || "/placeholder.svg"}
                    alt={podcast.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <Badge
                    className={`absolute left-3 top-3 ${
                      podcast.status === "active"
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {podcast.status === "active" ? "Actif" : "En pause"}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-foreground">{podcast.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {podcast.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Par {podcast.host}</span>
                    <span>•</span>
                    <Badge variant="outline">{podcast.category}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 border-t pt-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        {podcast.episodeCount}
                      </div>
                      <div className="text-xs text-muted-foreground">Épisodes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        {(podcast.totalPlays / 1000).toFixed(0)}k
                      </div>
                      <div className="text-xs text-muted-foreground">Écoutes</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-foreground">
                        {(podcast.subscribers / 1000).toFixed(1)}k
                      </div>
                      <div className="text-xs text-muted-foreground">Abonnés</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Podcast Card */}
            <Card className="card-shadow flex items-center justify-center border-2 border-dashed min-h-[320px]">
              <CardContent className="flex flex-col items-center py-8">
                <div className="rounded-full bg-primary/10 p-4">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">
                  Nouveau Podcast
                </h3>
                <p className="mt-1 text-center text-sm text-muted-foreground">
                  Créez un nouveau podcast pour votre collection
                </p>
                <Button className="mt-4 bg-primary hover:bg-primary/90">
                  Créer un podcast
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
