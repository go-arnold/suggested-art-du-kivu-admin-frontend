"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Headphones, Play, Pause, Plus, Search, Filter, MoreHorizontal,
  Clock, Calendar, BarChart3, Mic, Edit, Trash2, Heart, Loader2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  podcastsApi, type PodcastSeriesList, type EpisodeList, type EpisodeWrite,
} from "@/lib/api";
import { toast } from "sonner";

const EMPTY_EP: { title: string; description: string; series: string } = {
  title: "", description: "", series: "",
};

export default function PodcastsPage() {
  const [podcasts, setPodcasts] = useState<PodcastSeriesList[]>([]);
  const [episodes, setEpisodes] = useState<EpisodeList[]>([]);
  const [loadingPodcasts, setLoadingPodcasts] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPodcast, setFilterPodcast] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("episodes");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_EP);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoadingPodcasts(true);
    // page_size élevé : charge toutes les séries pour le sélecteur (édition incluse)
    podcastsApi.list("page_size=100")
      .then((d) => setPodcasts(d.results))
      .catch(() => toast.error("Erreur chargement podcasts"))
      .finally(() => setLoadingPodcasts(false));
  }, []);

  const fetchEpisodes = useCallback(async () => {
    setLoadingEpisodes(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "-created_at"); // plus récents en premier
      if (searchQuery) params.set("search", searchQuery);
      if (filterPodcast !== "all") params.set("series", filterPodcast);
      const data = await podcastsApi.episodes.list(params.toString());
      setEpisodes(data.results);
    } catch {
      toast.error("Erreur chargement épisodes");
    } finally {
      setLoadingEpisodes(false);
    }
  }, [searchQuery, filterPodcast]);

  useEffect(() => { fetchEpisodes(); }, [fetchEpisodes]);

  const openCreate = () => {
    setEditingSlug(null);
    setForm(EMPTY_EP);
    setIsCreateDialogOpen(true);
  };

  const openEdit = (ep: EpisodeList) => {
    setEditingSlug(ep.slug);
    // Résout l'ID de la série (la liste renvoie series_slug, pas toujours l'id)
    let seriesId = ep.series?.id ? String(ep.series.id) : "";
    if (!seriesId && ep.series_slug) {
      const p = podcasts.find((x) => x.slug === ep.series_slug);
      if (p) seriesId = String(p.id);
    }
    setForm({
      title: ep.title ?? "",
      description: ep.description ?? "",
      series: seriesId,
    });
    setIsCreateDialogOpen(true);
  };

  const handleSubmitEpisode = async () => {
    if (!form.title || !form.series) { toast.error("Titre et série requis"); return; }
    setSubmitting(true);
    try {
      if (editingSlug) {
        // PATCH partiel : on ne réécrit pas published_at
        await podcastsApi.episodes.update(editingSlug, {
          title: form.title,
          description: form.description,
          series: Number(form.series),
        });
        toast.success("Épisode mis à jour");
      } else {
        const payload: EpisodeWrite = {
          title: form.title,
          description: form.description,
          series: Number(form.series),
          // published_at est requis par l'API (et "status" n'existe pas côté backend)
          published_at: new Date().toISOString(),
        };
        await podcastsApi.episodes.create(payload);
        toast.success("Épisode créé");
      }
      setIsCreateDialogOpen(false);
      setForm(EMPTY_EP);
      setEditingSlug(null);
      fetchEpisodes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEpisode = async (slug: string) => {
    if (!confirm("Supprimer cet épisode ?")) return;
    try {
      await podcastsApi.episodes.delete(slug);
      toast.success("Épisode supprimé");
      fetchEpisodes();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const totalPlays = episodes.reduce((acc, ep) => acc + (ep.play_count ?? 0), 0);
  const totalEpisodes = podcasts.reduce((acc, p) => acc + (p.episode_count ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Podcasts</h1>
          <p className="text-muted-foreground">Gérez vos podcasts et épisodes audio</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Nouvel Épisode
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSlug ? "Modifier l'Épisode" : "Ajouter un Épisode"}</DialogTitle>
              <DialogDescription>
                {editingSlug
                  ? "Mettez à jour les informations de l'épisode."
                  : "Créez un nouvel épisode pour l'un de vos podcasts."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Série / Podcast</Label>
                <Select value={form.series} onValueChange={(v) => setForm({ ...form, series: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un podcast" /></SelectTrigger>
                  <SelectContent>
                    {podcasts.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Titre</Label>
                <Input placeholder="Ex: Interview avec..." value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea placeholder="Décrivez cet épisode..." rows={3} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Annuler</Button>
              <Button className="bg-primary hover:bg-primary/90" onClick={handleSubmitEpisode} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSlug ? "Enregistrer" : "Créer l'épisode"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Séries</CardTitle>
            <Mic className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{podcasts.length}</div>
            <p className="text-xs text-muted-foreground">podcasts actifs</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Épisodes</CardTitle>
            <Headphones className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEpisodes}</div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Écoutes</CardTitle>
            <BarChart3 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlays.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">cette page</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En vedette</CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{episodes.filter((e) => e.is_featured).length}</div>
            <p className="text-xs text-muted-foreground">épisodes mis en avant</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="episodes">Épisodes</TabsTrigger>
          <TabsTrigger value="podcasts">Séries</TabsTrigger>
        </TabsList>

        <TabsContent value="episodes" className="mt-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher un épisode..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterPodcast} onValueChange={setFilterPodcast}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Mic className="mr-2 h-4 w-4" /><SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les séries</SelectItem>
                {podcasts.map((p) => (
                  <SelectItem key={p.id} value={p.slug}>{p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingEpisodes ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {episodes.map((ep) => (
                <Card key={ep.id} className="card-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    {/* Thumbnail + play */}
                    <div className="relative h-16 w-16 flex-shrink-0 rounded-lg bg-muted">
                      <img src={ep.cover_url || "/placeholder.svg"}
                        alt={ep.series_title ?? ep.series?.title ?? "Podcast"}
                        loading="lazy" decoding="async"
                        className="h-full w-full rounded-lg object-cover" />
                      <button
                        onClick={() => setPlayingId(playingId === ep.id ? null : ep.id)}
                        className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity hover:opacity-100"
                      >
                        {playingId === ep.id
                          ? <Pause className="h-6 w-6 text-white" />
                          : <Play className="h-6 w-6 text-white" />}
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {ep.is_featured && (
                          <Badge className="bg-primary text-primary-foreground text-xs">Featured</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {ep.series_title ?? ep.series?.title ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          S{ep.season_number}E{ep.episode_number}
                        </span>
                      </div>
                      <h3 className="mt-1 font-semibold text-foreground line-clamp-1">{ep.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{ep.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        {ep.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(ep.published_at).toLocaleDateString("fr-FR", {
                              day: "numeric", month: "short",
                            })}
                          </span>
                        )}
                        {ep.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{ep.duration}
                          </span>
                        )}
                        {ep.play_count > 0 && (
                          <span className="flex items-center gap-1">
                            <Headphones className="h-3 w-3" />{ep.play_count.toLocaleString()}
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
                        <DropdownMenuItem onClick={() => openEdit(ep)}>
                          <Edit className="mr-2 h-4 w-4" />Modifier
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteEpisode(ep.slug)}>
                          <Trash2 className="mr-2 h-4 w-4" />Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}

              {episodes.length === 0 && (
                <Card className="card-shadow">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Headphones className="h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 font-semibold text-foreground">Aucun épisode trouvé</h3>
                    <Button className="mt-4 bg-primary hover:bg-primary/90" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />Créer un épisode
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="podcasts" className="mt-6">
          {loadingPodcasts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {podcasts.map((podcast) => (
                <Card key={podcast.id} className="card-shadow overflow-hidden">
                  <div className="relative h-40 bg-muted">
                    <img src={podcast.cover_url || "/placeholder.svg"} alt={podcast.title}
                      loading="lazy" decoding="async"
                      className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {podcast.is_featured && (
                      <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">En vedette</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-foreground">{podcast.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{podcast.description}</p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">{podcast.category}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-foreground">{podcast.episode_count}</div>
                        <div className="text-xs text-muted-foreground">Épisodes</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-foreground capitalize">{podcast.category}</div>
                        <div className="text-xs text-muted-foreground">Catégorie</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add card */}
              <Card className="card-shadow flex items-center justify-center border-2 border-dashed min-h-[280px]">
                <CardContent className="flex flex-col items-center py-8">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Plus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="mt-4 font-semibold text-foreground">Nouveau Podcast</h3>
                  <Button className="mt-4 bg-primary hover:bg-primary/90">Créer une série</Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
