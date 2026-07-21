"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Calendar, MapPin, Users, Plus, Search, Filter,
  MoreHorizontal, Ticket, Eye, Edit, Trash2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Statut → badge du design-system (label + classe couleur)
function statusMeta(status: EventList["status"]): { label: string; cls: string } | null {
  switch (status) {
    case "live":
    case "ongoing":
      return { label: "En cours", cls: "b-green" };
    case "upcoming":
      return { label: "À venir", cls: "b-blue" };
    case "past":
      return { label: "Passé", cls: "b-gray" };
    case "cancelled":
      return { label: "Annulé", cls: "b-red" };
    default:
      return null;
  }
}

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
  title: "", description: "", date: "", venue_name: "", city: null, category: "",
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
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [viewEvent, setViewEvent] = useState<EventList | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    setImageFile(file); // envoyé en multipart à la soumission
    const reader = new FileReader();
    reader.onload = () => setImagePreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Les plus récemment créés en premier
      params.set("ordering", "-created_at");
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

  // Charge la liste des villes (le backend attend l'ID de la ville, pas son nom)
  useEffect(() => {
    eventsApi.cities().then(setCities).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setImageFile(null);
    setIsCreateDialogOpen(true);
  };

  // Pré-remplit le formulaire pour l'édition. On ouvre tout de suite avec les
  // données de la liste (partielles), puis on charge le détail complet
  // (description, ville, image) qui n'est pas renvoyé par la liste.
  const openEdit = async (event: EventList) => {
    setEditingSlug(event.slug);
    setImageFile(null); // on ne réenvoie l'image que si l'utilisateur en choisit une
    setImagePreview(event.image_url ?? null);
    setForm({
      title: event.title,
      description: event.description ?? "",
      date: event.date ? event.date.slice(0, 16) : "",
      venue_name: event.venue_name ?? "",
      venue_address: event.venue_address ?? "",
      city: event.city?.id ?? null,
      category: event.category ?? "",
      ticket_price: event.ticket_price != null ? Number(event.ticket_price) : null,
      is_featured: event.is_featured,
    });
    setIsCreateDialogOpen(true);

    try {
      const d = await eventsApi.get(event.slug);
      setImagePreview(d.image_url ?? null);
      setForm((f) => ({
        ...f,
        description: d.description ?? "",
        venue_address: d.venue_address ?? "",
        city: d.city?.id ?? null,
        ticket_price: d.ticket_price != null ? Number(d.ticket_price) : null,
        image: undefined, // on ne renvoie l'image que si l'utilisateur en choisit une nouvelle
      }));
    } catch {
      /* on garde les valeurs de la liste si le détail échoue */
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.date) { toast.error("Titre et date sont requis"); return; }
    if (!form.venue_name.trim()) { toast.error("Le lieu (salle) est requis"); return; }
    if (!form.category) { toast.error("La catégorie est requise"); return; }
    setSubmitting(true);
    try {
      if (imageFile) {
        // Upload multipart (le backend attend un fichier pour l'image)
        const fd = new FormData();
        fd.append("title", form.title);
        fd.append("description", form.description);
        fd.append("date", form.date);
        fd.append("venue_name", form.venue_name);
        if (form.venue_address) fd.append("venue_address", form.venue_address);
        if (form.city != null) fd.append("city", String(form.city));
        fd.append("category", form.category);
        if (form.ticket_price != null) fd.append("ticket_price", String(form.ticket_price));
        fd.append("is_featured", String(form.is_featured));
        fd.append("image", imageFile);
        if (editingSlug) await eventsApi.updateForm(editingSlug, fd);
        else await eventsApi.createForm(fd);
      } else if (editingSlug) {
        await eventsApi.update(editingSlug, form);
      } else {
        await eventsApi.create(form);
      }
      toast.success(editingSlug ? "Événement mis à jour" : "Événement créé");
      setIsCreateDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingSlug(null);
      setImageFile(null);
      setImagePreview(null);
      fetchEvents();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
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
  const categories = [...new Set(events.map((e) => e.category).filter(Boolean))];

  return (
    <section className="view">
      {/* En-tête */}
      <div className="page-h">
        <div>
          <h1>Événements</h1>
          <p>Gérez vos événements culturels et artistiques</p>
        </div>
        <div className="h-actions">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-red" onClick={openCreate}>
                <Plus strokeWidth={2.2} />Nouvel Événement
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSlug ? "Modifier l'Événement" : "Créer un Événement"}</DialogTitle>
                <DialogDescription>
                  {editingSlug
                    ? "Mettez à jour les informations de l'événement."
                    : "Ajoutez un nouvel événement au calendrier culturel."}
                </DialogDescription>
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
                    <Select
                      value={form.city != null ? String(form.city) : ""}
                      onValueChange={(v) => setForm({ ...form, city: v ? Number(v) : null })}
                    >
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Image de l&apos;événement</Label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleImage(e.target.files?.[0])} />
                  {imagePreview ? (
                    <div className="relative h-40 overflow-hidden rounded-lg bg-muted">
                      <img src={imagePreview} alt="Aperçu" loading="lazy" decoding="async"
                        className="h-full w-full object-cover" />
                      <Button type="button" variant="destructive" size="icon"
                        className="absolute right-2 top-2 h-8 w-8"
                        onClick={() => { setImagePreview(null); setImageFile(null); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div onClick={() => fileRef.current?.click()}
                      className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors">
                      <Plus className="mb-1 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
                    </div>
                  )}
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
                <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingSlug ? "Enregistrer" : "Créer l'événement"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><Calendar /></div>
            <div><div className="kpi-lb">À Venir</div></div>
          </div>
          <div className="kpi-v">{upcoming.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Ticket /></div>
            <div><div className="kpi-lb">Total Événements</div></div>
          </div>
          <div className="kpi-v">{events.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--emerald-soft)", color: "var(--emerald)" }}><Users /></div>
            <div><div className="kpi-lb">En Direct / En cours</div></div>
          </div>
          <div className="kpi-v">
            {events.filter((e) => e.status === "live" || e.status === "ongoing").length}
          </div>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher un événement..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="filter">
            <Filter /><SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="live">En cours</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="past">Passé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="filter">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Chargement */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
        </div>
      )}

      {/* Grille */}
      {!loading && events.length > 0 && (
        <div className="ev-grid">
          {events.map((event) => {
            const sm = statusMeta(event.status);
            const price = formatPrice(event.ticket_price);
            return (
              <div className="ev-card" key={event.id} onClick={() => setViewEvent(event)}>
                <div className="ev-cover" style={{ background: "linear-gradient(135deg,#dbe7f0,#c3d4e2)" }}>
                  {event.image_url && (
                    <img src={event.image_url} alt={event.title} loading="lazy" decoding="async" />
                  )}
                  <div className="ev-pos top" style={{ display: "flex", gap: 8 }}>
                    {sm && <span className={`badge ${sm.cls}`}><span className="bd" />{sm.label}</span>}
                    {event.is_featured && <span className="badge b-gold">En vedette</span>}
                  </div>
                  {event.category && <span className="badge b-purple ev-pos bot">{event.category}</span>}
                  <div style={{ position: "absolute", top: 14, right: 14, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="row-act" style={{ background: "rgba(255,255,255,0.92)", boxShadow: "0 2px 10px rgba(20,22,43,.2)" }}>
                          <MoreHorizontal />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewEvent(event)}>
                          <Eye className="mr-2 h-4 w-4" />Voir
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(event)}>
                          <Edit className="mr-2 h-4 w-4" />Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(event.slug)}>
                          <Trash2 className="mr-2 h-4 w-4" />Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="ev-body">
                  <div className="ev-title">{event.title}</div>
                  <div className="ev-row">
                    <Calendar />
                    {new Date(event.date).toLocaleDateString("fr-FR", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </div>
                  {event.venue_name && (
                    <div className="ev-row">
                      <MapPin />
                      {event.venue_name}{event.city_name ? `, ${event.city_name}` : ""}
                    </div>
                  )}
                  {event.registration_progress !== null && (
                    <div style={{ marginTop: 12 }}>
                      <div className="ev-row" style={{ marginTop: 0 }}>
                        <Users />
                        <span><b>{event.registration_progress}%</b> rempli</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 6, background: "var(--line-2)", overflow: "hidden", marginTop: 6 }}>
                        <div style={{ height: "100%", width: `${Math.min(event.registration_progress, 100)}%`, background: "var(--red)" }} />
                      </div>
                    </div>
                  )}
                  <div className="ev-foot">
                    <span className={`ev-price${price === "Gratuit" ? " free" : ""}`}>{price}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* État vide */}
      {!loading && events.length === 0 && (
        <div className="ph">
          <div className="ph-ic"><Calendar /></div>
          <h3>Aucun événement trouvé</h3>
          <p>Modifiez vos filtres ou créez un nouvel événement.</p>
          <button className="btn btn-red" onClick={openCreate}>
            <Plus strokeWidth={2.2} />Créer un événement
          </button>
        </div>
      )}

      {/* Détail de l'événement (Voir) */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => !o && setViewEvent(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {viewEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{viewEvent.title}</DialogTitle>
                <DialogDescription>Détails de l&apos;événement</DialogDescription>
              </DialogHeader>
              {viewEvent.image_url && (
                <img
                  src={viewEvent.image_url}
                  alt={viewEvent.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full rounded-lg object-cover"
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(viewEvent.status)}
                {viewEvent.category && (
                  <Badge variant="secondary" className={getCategoryColor(viewEvent.category)}>
                    {viewEvent.category}
                  </Badge>
                )}
                {viewEvent.is_featured && (
                  <Badge className="bg-primary/10 text-primary">En vedette</Badge>
                )}
              </div>
              {viewEvent.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {viewEvent.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {viewEvent.date
                    ? new Date(viewEvent.date).toLocaleString("fr-FR", {
                        dateStyle: "long", timeStyle: "short",
                      })
                    : "—"}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {viewEvent.venue_name ?? "—"}
                  {viewEvent.city?.name ? `, ${viewEvent.city.name}` : ""}
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-muted-foreground" />
                  {formatPrice(viewEvent.ticket_price)}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewEvent(null)}>Fermer</Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => { const e = viewEvent; setViewEvent(null); openEdit(e); }}
                >
                  <Edit className="mr-2 h-4 w-4" />Modifier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
