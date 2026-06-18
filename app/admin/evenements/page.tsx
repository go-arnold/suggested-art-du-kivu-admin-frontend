"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, MapPin, Users, Clock, Plus, Search, Filter,
  MoreHorizontal, Ticket, DollarSign, Eye, Edit, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { eventsApi, type EventList, type EventWrite } from "@/lib/api";
import { toast } from "sonner";

function getStatusBadge(status: EventList["status"]) {
  switch (status) {
    case "live":
    case "ongoing":
      return <Badge className="bg-emerald-500 text-white">En cours</Badge>;
    case "upcoming":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700">À venir</Badge>;
    case "past":
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Passé</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annulé</Badge>;
    default:
      return null;
  }
}

function getCategoryColor(category: string) {
  const colors: Record<string, string> = {
    festival: "bg-primary/10 text-primary",
    concert: "bg-pink-100 text-pink-700",
    exposition: "bg-blue-100 text-blue-700",
    atelier: "bg-emerald-100 text-emerald-700",
    conference: "bg-amber-100 text-amber-700",
    spectacle: "bg-purple-100 text-purple-700",
    expo: "bg-blue-100 text-blue-700",
  };
  return colors[category?.toLowerCase()] || "bg-muted text-muted-foreground";
}

function formatPrice(price: string | number | null) {
  if (!price || price === "0.00" || price === 0) return "Gratuit";
  const num = typeof price === "string" ? parseFloat(price) : price;
  return `${num.toLocaleString("fr-FR")} FC`;
}

const EMPTY_FORM: EventWrite = {
  title: "", description: "", date: "", venue_name: "", city: "", category: "",
  ticket_price: null, is_featured: false,
};

export default function EvenementsPage() {
  const [events, setEvents] = useState<EventList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [form, setForm] = useState<EventWrite>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);
      const data = await eventsApi.list(params.toString());
      setEvents(data.results);
    } catch {
      toast.error("Erreur lors du chargement des événements");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterCategory]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    if (!form.title || !form.date) { toast.error("Titre et date sont requis"); return; }
    if (!form.venue_name.trim()) { toast.error("Le lieu (salle) est requis"); return; }
    setSubmitting(true);
    try {
      await eventsApi.create(form);
      toast.success("Événement créé");
      setIsCreateDialogOpen(false);
      setForm(EMPTY_FORM);
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      await eventsApi.delete(slug);
      toast.success("Événement supprimé");
      fetchEvents();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const upcoming = events.filter((e) => e.status === "upcoming");
  const totalRegistered = events.reduce((acc, e) => acc + (e.registration_progress ?? 0), 0);
  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Événements</h1>
          <p className="text-muted-foreground">Gérez vos événements culturels et artistiques</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />Nouvel Événement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Créer un Événement</DialogTitle>
              <DialogDescription>Ajoutez un nouvel événement au calendrier culturel.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Titre</Label>
                <Input placeholder="Ex: Festival des Arts du Kivu" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Décrivez votre événement..." rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input type="datetime-local" value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Catégorie</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="festival">Festival</SelectItem>
                      <SelectItem value="concert">Concert</SelectItem>
                      <SelectItem value="exposition">Exposition</SelectItem>
                      <SelectItem value="atelier">Atelier</SelectItem>
                      <SelectItem value="conference">Conférence</SelectItem>
                      <SelectItem value="spectacle">Spectacle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Lieu (salle) *</Label>
                  <Input placeholder="Ex: Stade de Goma" value={form.venue_name}
                    onChange={(e) => setForm({ ...form, venue_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Ville</Label>
                  <Input placeholder="Ex: Goma" value={form.city ?? ""}
                    onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Prix billet (FC)</Label>
                <Input type="number" placeholder="0 = Gratuit" value={form.ticket_price ?? ""}
                  onChange={(e) => setForm({ ...form, ticket_price: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>En vedette</Label>
                  <p className="text-xs text-muted-foreground">Afficher sur la page d&apos;accueil</p>
                </div>
                <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer l&apos;événement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">À Venir</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcoming.length}</div>
            <p className="text-xs text-muted-foreground">événement(s)</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Événements</CardTitle>
            <Ticket className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">chargés</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Direct / En cours</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {events.filter((e) => e.status === "live" || e.status === "ongoing").length}
            </div>
            <p className="text-xs text-muted-foreground">actif(s) maintenant</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un événement..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="live">En cours</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="past">Passé</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="card-shadow overflow-hidden group">
              <div className="relative h-48 bg-muted">
                <img
                  src={event.image_url || "/placeholder.svg"}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-2">
                  {getStatusBadge(event.status)}
                  {event.is_featured && (
                    <Badge className="bg-primary text-primary-foreground">En vedette</Badge>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge className={getCategoryColor(event.category)}>{event.category}</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon"
                      className="absolute right-3 top-3 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />Voir</DropdownMenuItem>
                    <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(event.slug)}>
                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1">{event.title}</h3>
                {event.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                )}
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(event.date).toLocaleDateString("fr-FR", {
                        weekday: "long", day: "numeric", month: "long",
                      })}
                    </span>
                  </div>
                  {event.venue_name && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span className="line-clamp-1">
                        {event.venue_name}{event.city_name ? `, ${event.city_name}` : ""}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  {event.registration_progress !== null && (
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{event.registration_progress}%</span>
                      <span className="text-muted-foreground">rempli</span>
                    </div>
                  )}
                  <div className="ml-auto text-sm font-semibold text-primary">
                    {formatPrice(event.ticket_price)}
                  </div>
                </div>
                {event.registration_progress !== null && (
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(event.registration_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && events.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">Aucun événement trouvé</h3>
            <p className="mt-1 text-sm text-muted-foreground">Modifiez vos filtres ou créez un nouvel événement.</p>
            <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Créer un événement
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
