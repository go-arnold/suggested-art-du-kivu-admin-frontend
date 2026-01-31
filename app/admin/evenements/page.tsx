"use client"

import { useState } from "react"
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Ticket,
  DollarSign,
  Eye,
  Edit,
  Trash2,
  Copy,
  CalendarDays,
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
import { Switch } from "@/components/ui/switch"

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  endTime: string
  location: string
  address: string
  category: string
  status: "upcoming" | "ongoing" | "past" | "cancelled"
  ticketPrice: number | null
  capacity: number
  registered: number
  image: string
  isFeatured: boolean
}

const mockEvents: Event[] = [
  {
    id: "1",
    title: "Festival des Arts du Kivu 2026",
    description: "Le plus grand rassemblement artistique de la région, célébrant la diversité culturelle du Kivu.",
    date: "2026-03-15",
    time: "10:00",
    endTime: "22:00",
    location: "Stade de Goma",
    address: "Avenue du Lac, Goma",
    category: "Festival",
    status: "upcoming",
    ticketPrice: 5000,
    capacity: 5000,
    registered: 3247,
    image: "/placeholder.svg",
    isFeatured: true,
  },
  {
    id: "2",
    title: "Exposition: Regards sur le Kivu",
    description: "Une exposition photographique capturant la beauté et la résilience du peuple Kivutien.",
    date: "2026-02-10",
    time: "09:00",
    endTime: "18:00",
    location: "Centre Culturel Franco-Congolais",
    address: "Avenue de la Paix, Bukavu",
    category: "Exposition",
    status: "upcoming",
    ticketPrice: null,
    capacity: 200,
    registered: 145,
    image: "/placeholder.svg",
    isFeatured: false,
  },
  {
    id: "3",
    title: "Concert Rumba Congolaise",
    description: "Une soirée dédiée à la rumba congolaise avec les légendes vivantes du genre.",
    date: "2026-01-30",
    time: "19:00",
    endTime: "23:00",
    location: "Hôtel Ihusi",
    address: "Bord du Lac, Goma",
    category: "Concert",
    status: "ongoing",
    ticketPrice: 10000,
    capacity: 500,
    registered: 500,
    image: "/placeholder.svg",
    isFeatured: true,
  },
  {
    id: "4",
    title: "Atelier de Sculpture Traditionnelle",
    description: "Apprenez les techniques ancestrales de sculpture sur bois avec des maîtres artisans.",
    date: "2026-02-05",
    time: "14:00",
    endTime: "17:00",
    location: "Village des Artistes",
    address: "Quartier Himbi, Goma",
    category: "Atelier",
    status: "upcoming",
    ticketPrice: 2000,
    capacity: 30,
    registered: 18,
    image: "/placeholder.svg",
    isFeatured: false,
  },
  {
    id: "5",
    title: "Conférence: L'Art comme Outil de Paix",
    description: "Discussion avec des artistes et activistes sur le rôle de l'art dans la construction de la paix.",
    date: "2026-01-20",
    time: "15:00",
    endTime: "18:00",
    location: "Université de Goma",
    address: "Campus Principal, Goma",
    category: "Conférence",
    status: "past",
    ticketPrice: null,
    capacity: 300,
    registered: 287,
    image: "/placeholder.svg",
    isFeatured: false,
  },
]

function getStatusBadge(status: Event["status"]) {
  switch (status) {
    case "ongoing":
      return (
        <Badge className="bg-emerald-500 text-white">
          En cours
        </Badge>
      )
    case "upcoming":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          À venir
        </Badge>
      )
    case "past":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          Passé
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

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    Festival: "bg-primary/10 text-primary",
    Concert: "bg-pink-100 text-pink-700",
    Exposition: "bg-blue-100 text-blue-700",
    Atelier: "bg-emerald-100 text-emerald-700",
    Conférence: "bg-amber-100 text-amber-700",
  }
  return colors[category] || "bg-muted text-muted-foreground"
}

export default function EvenementsPage() {
  const [events, setEvents] = useState<Event[]>(mockEvents)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || event.status === filterStatus
    const matchesCategory = filterCategory === "all" || event.category === filterCategory
    return matchesSearch && matchesStatus && matchesCategory
  })

  const upcoming = events.filter((e) => e.status === "upcoming")
  const totalRegistered = events.reduce((acc, e) => acc + e.registered, 0)
  const totalRevenue = events.reduce(
    (acc, e) => acc + (e.ticketPrice || 0) * e.registered,
    0
  )

  const categories = [...new Set(events.map((e) => e.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Événements</h1>
          <p className="text-muted-foreground">
            Gérez vos événements culturels et artistiques
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Événement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un Événement</DialogTitle>
              <DialogDescription>
                Ajoutez un nouvel événement au calendrier culturel.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Titre de l&apos;événement</Label>
                <Input id="title" placeholder="Ex: Festival des Arts du Kivu" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez votre événement..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="exposition">Exposition</SelectItem>
                      <SelectItem value="atelier">Atelier</SelectItem>
                      <SelectItem value="conference">Conférence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startTime">Heure de début</Label>
                  <Input id="startTime" type="time" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endTime">Heure de fin</Label>
                  <Input id="endTime" type="time" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Lieu</Label>
                <Input id="location" placeholder="Ex: Stade de Goma" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" placeholder="Ex: Avenue du Lac, Goma" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacité</Label>
                  <Input id="capacity" type="number" placeholder="500" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Prix du billet (FC)</Label>
                  <Input id="price" type="number" placeholder="0 = Gratuit" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Événement en vedette</Label>
                  <p className="text-xs text-muted-foreground">
                    Afficher sur la page d&apos;accueil
                  </p>
                </div>
                <Switch />
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
                Créer l&apos;événement
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
              À Venir
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground">événement(s)</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inscriptions
            </CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRegistered.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRevenue.toLocaleString()} FC
            </div>
            <p className="text-xs text-muted-foreground">billetterie</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taux de Remplissage
            </CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (events.reduce((acc, e) => acc + e.registered, 0) /
                  events.reduce((acc, e) => acc + e.capacity, 0)) *
                  100
              )}
              %
            </div>
            <p className="text-xs text-muted-foreground">moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un événement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="ongoing">En cours</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="past">Passé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <CalendarDays className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="card-shadow overflow-hidden group">
            <div className="relative h-48 bg-muted">
              <img
                src={event.image || "/placeholder.svg"}
                alt={event.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute left-3 top-3 flex gap-2">
                {getStatusBadge(event.status)}
                {event.isFeatured && (
                  <Badge className="bg-primary text-primary-foreground">
                    En vedette
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <Badge className={getCategoryColor(event.category)}>
                  {event.category}
                </Badge>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-3 top-3 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Copy className="mr-2 h-4 w-4" />
                    Dupliquer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {event.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {event.description}
              </p>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {event.time} - {event.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{event.registered}</span>
                  <span className="text-muted-foreground">/ {event.capacity}</span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  {event.ticketPrice ? `${event.ticketPrice.toLocaleString()} FC` : "Gratuit"}
                </div>
              </div>
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${Math.min((event.registered / event.capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">
              Aucun événement trouvé
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez vos filtres ou créez un nouvel événement.
            </p>
            <Button
              className="mt-4 bg-primary hover:bg-primary/90"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Créer un événement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
