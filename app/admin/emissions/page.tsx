"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio, Calendar, Clock, Eye, MoreHorizontal, Plus, Search, Filter,
  Wifi, WifiOff, Video, Loader2, Play, Pause, Edit,
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
import { emissionsApi, type EmissionList, type EmissionWrite } from "@/lib/api";
import { toast } from "sonner";

// ── Status badge ──────────────────────────────────────────────────────────────

function getStatusBadge(status: EmissionList["status"]) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-red-500 text-white animate-pulse">
          <Wifi className="mr-1 h-3 w-3" />En Direct
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Clock className="mr-1 h-3 w-3" />Programmé
        </Badge>
      );
    case "recorded":
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground">
          <WifiOff className="mr-1 h-3 w-3" />Enregistré
        </Badge>
      );
    case "cancelled":
      return <Badge variant="destructive">Annulé</Badge>;
    default:
      return null;
  }
}

function formatDuration(minutes: number) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m > 0 ? m + "min" : ""}` : `${m}min`;
}

// ── Empty form matches EmissionWrite exactly ──────────────────────────────────

const EMPTY_FORM: EmissionWrite = {
  title: "",
  description: "",
  scheduled_at: "",
  duration_minutes: 60,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmissionsPage() {
  const [shows,       setShows]       = useState<EmissionList[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [form,        setForm]        = useState<EmissionWrite>(EMPTY_FORM);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "-created_at"); // plus récentes en premier
      if (searchQuery)            params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const data = await emissionsApi.list(params.toString());
      setShows(data.results);
    } catch {
      toast.error("Erreur lors du chargement des émissions");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus]);

  useEffect(() => { fetchShows(); }, [fetchShows]);

  const openCreate = () => {
    setEditingSlug(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  // Pré-remplit depuis la liste puis charge le détail (description complète, etc.)
  const openEdit = async (show: EmissionList) => {
    setEditingSlug(show.slug);
    setForm({
      title: show.title,
      description: show.description ?? "",
      scheduled_at: show.scheduled_at ? show.scheduled_at.slice(0, 16) : "",
      duration_minutes: show.duration_minutes ?? 0,
      stream_url: show.stream_url || undefined,
    });
    setDialogOpen(true);
    try {
      const d = await emissionsApi.get(show.slug);
      setForm((f) => ({
        ...f,
        description: d.description ?? "",
        stream_url: d.stream_url || undefined,
        duration_minutes: d.duration_minutes ?? f.duration_minutes,
      }));
    } catch {
      /* on garde les valeurs de la liste */
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.scheduled_at) {
      toast.error("Titre et date / heure sont requis");
      return;
    }
    setSubmitting(true);
    try {
      if (editingSlug) {
        await emissionsApi.update(editingSlug, form);
        toast.success("Émission mise à jour");
      } else {
        await emissionsApi.create(form);
        toast.success("Émission programmée");
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingSlug(null);
      fetchShows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  // Démarrer / arrêter une diffusion = changer son statut (PATCH).
  const handleSetStatus = async (
    slug: string,
    status: "live" | "recorded"
  ) => {
    try {
      await emissionsApi.update(slug, { status });
      toast.success(status === "live" ? "Émission démarrée — en direct" : "Diffusion arrêtée");
      fetchShows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de statut");
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cette émission ?")) return;
    try {
      await emissionsApi.delete(slug);
      toast.success("Émission supprimée");
      fetchShows();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const liveNow    = shows.filter((s) => s.status === "live");
  const scheduled  = shows.filter((s) => s.status === "scheduled");
  const totalViews = shows.reduce((acc, s) => acc + (s.total_views ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Émissions Live</h1>
          <p className="text-muted-foreground">Gérez vos diffusions en direct et programmées</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Nouvelle Émission
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{editingSlug ? "Modifier l'Émission" : "Programmer une Émission"}</DialogTitle>
              <DialogDescription>
                {editingSlug
                  ? "Mettez à jour les informations de l'émission."
                  : "Créez une nouvelle émission en direct ou programmée."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Titre *</Label>
                <Input placeholder="Ex: Soirée Jazz du Kivu" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Décrivez votre émission..." rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date et heure *</Label>
                  <Input type="datetime-local" value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Durée (minutes)</Label>
                  <Input type="number" placeholder="60" value={form.duration_minutes || ""}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>URL de stream (optionnel)</Label>
                <Input placeholder="https://..." value={form.stream_url ?? ""}
                  onChange={(e) => setForm({ ...form, stream_url: e.target.value || undefined })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSlug ? "Enregistrer" : "Programmer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "En Direct",        value: liveNow.length,          icon: Radio,    color: "text-red-500"      },
          { label: "Programmées",      value: scheduled.length,        icon: Calendar, color: "text-blue-500"     },
          { label: "Spectateurs live", value: liveNow.reduce((a, s) => a + (s.viewer_count ?? 0), 0).toLocaleString(), icon: Eye, color: "text-primary" },
          { label: "Total vues",       value: totalViews.toLocaleString(), icon: Eye, color: "text-emerald-500"   },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une émission..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="live">En Direct</SelectItem>
            <SelectItem value="scheduled">Programmé</SelectItem>
            <SelectItem value="recorded">Enregistré</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Shows grid */}
      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {shows.map((show) => (
            <Card key={show.id} className="card-shadow overflow-hidden">
              <div className="flex">
                {/* Thumbnail */}
                <div className="relative h-32 w-32 shrink-0 bg-muted">
                  <img src={show.cover_url || "/placeholder.svg"} alt={show.title}
                    loading="lazy" decoding="async"
                    className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Video className="h-8 w-8 text-white" />
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

                {/* Content */}
                <div className="flex flex-1 flex-col p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1">{getStatusBadge(show.status)}</div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{show.title}</h3>
                      {show.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{show.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {show.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => handleSetStatus(show.slug, "live")}>
                            <Play className="mr-2 h-4 w-4" />Démarrer maintenant
                          </DropdownMenuItem>
                        )}
                        {show.status === "live" && (
                          <DropdownMenuItem onClick={() => handleSetStatus(show.slug, "recorded")}>
                            <Pause className="mr-2 h-4 w-4" />Arrêter la diffusion
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => openEdit(show)}>
                          <Edit className="mr-2 h-4 w-4" />Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(show.slug)}>
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Meta */}
                  <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(show.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(show.scheduled_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span>{formatDuration(show.duration_minutes)}</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {(show.total_views ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Hosts */}
                  {show.host_names && show.host_names.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {show.host_names.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && shows.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">Aucune émission trouvée</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez vos filtres ou créez une nouvelle émission.
            </p>
            <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Créer une émission
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
