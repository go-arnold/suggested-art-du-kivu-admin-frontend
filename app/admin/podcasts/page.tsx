"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Headphones, Play, Pause, Plus, Search, MoreVertical,
  Clock, BarChart3, Mic, Edit, Trash2, Heart, Loader2, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  podcastsApi, commentsApi, artistsApi,
  type PodcastSeriesList, type EpisodeList, type EpisodeWrite,
  type PodcastSeriesWrite, type ArtistList,
} from "@/lib/api";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import { toast } from "sonner";

const EMPTY_EP = {
  title: "", description: "", series: "",
  audio_url: "", duration: "", cover: "",
  episode_number: "", season_number: "",
  is_featured: false, published_at: "",
  guests: [] as number[],          // IDs d'artistes invités
  guestNames: [] as string[],      // invités non-artistes (noms libres)
  transcript: "",
};

const COVER_GRADIENTS = ["", "c2", "c3"];

/**
 * Une URL audio est jugée « lisible » si elle est vide, ou en HTTPS et pointant
 * soit vers Cloudinary, soit vers un fichier audio direct (.mp3/.m4a/…).
 * Les liens de pages / embeds (SoundCloud, YouTube, Spotify…) ne sont pas des
 * fichiers lisibles et provoquent des erreurs CORS côté client → on les bloque.
 */
function isPlayableAudioUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return true;
  let parsed: URL;
  try { parsed = new URL(u); } catch { return false; }
  if (parsed.protocol !== "https:") return false;
  if (/(res\.)?cloudinary\.com$/.test(parsed.hostname)) return true;
  return /\.(mp3|m4a|aac|ogg|oga|wav|flac)$/i.test(parsed.pathname);
}

/** ISO → valeur pour <input type="datetime-local"> (heure locale). */
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  const audioRef = useRef<HTMLAudioElement>(null);

  // Lance / arrête réellement la lecture de l'audio d'un épisode.
  // La liste ne renvoie pas audio_url → on le récupère via le détail.
  const togglePlay = async (ep: EpisodeList) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingId === ep.id) { a.pause(); setPlayingId(null); return; }
    let url = ep.audio_url ?? undefined;
    if (!url) {
      try { url = (await podcastsApi.episodes.get(ep.slug)).audio_url ?? undefined; }
      catch { /* on gère juste en dessous */ }
    }
    if (!url) { toast.error("Aucun fichier audio pour cet épisode"); return; }
    a.src = url;
    a.play().then(() => setPlayingId(ep.id)).catch(() => toast.error("Lecture impossible — réessaie"));
  };
  const [form, setForm] = useState(EMPTY_EP);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [comments, setComments] = useState<EpisodeList | null>(null);
  const [artists, setArtists] = useState<ArtistList[]>([]);
  const toggleGuest = (id: number) =>
    setForm((f) => ({ ...f, guests: f.guests.includes(id) ? f.guests.filter((x) => x !== id) : [...f.guests, id] }));

  // Invités non-artistes (noms libres)
  const [guestNameInput, setGuestNameInput] = useState("");
  const addGuestName = () => {
    const v = guestNameInput.trim();
    if (v && !form.guestNames.includes(v)) setForm((f) => ({ ...f, guestNames: [...f.guestNames, v] }));
    setGuestNameInput("");
  };
  const removeGuestName = (n: string) =>
    setForm((f) => ({ ...f, guestNames: f.guestNames.filter((x) => x !== n) }));

  // Création / édition d'une série
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [savingSeries, setSavingSeries] = useState(false);
  const EMPTY_SERIES = { title: "", category: "", description: "", cover: "", is_featured: false };
  const [seriesForm, setSeriesForm] = useState(EMPTY_SERIES);
  const [editingSeriesSlug, setEditingSeriesSlug] = useState<string | null>(null);

  const loadPodcasts = useCallback(async (): Promise<PodcastSeriesList[]> => {
    setLoadingPodcasts(true);
    try {
      // page_size élevé : charge toutes les séries pour le sélecteur (édition incluse)
      const d = await podcastsApi.list("page_size=100");
      setPodcasts(d.results);
      return d.results;
    } catch {
      toast.error("Erreur chargement podcasts");
      return [];
    } finally {
      setLoadingPodcasts(false);
    }
  }, []);

  useEffect(() => { loadPodcasts(); }, [loadPodcasts]);

  useEffect(() => {
    podcastsApi.categories()
      .then(setCategories)
      .catch(() => { /* catégories non bloquantes */ });
    artistsApi.list("page_size=200&ordering=name")
      .then((d) => setArtists(d.results))
      .catch(() => { /* invités non bloquants */ });
  }, []);

  const openCreateSeries = () => {
    setEditingSeriesSlug(null);
    setSeriesForm(EMPTY_SERIES);
    setSeriesDialogOpen(true);
  };

  const openEditSeries = (p: PodcastSeriesList) => {
    setEditingSeriesSlug(p.slug);
    setSeriesForm({
      title: p.title ?? "",
      category: p.category ?? "",
      description: p.description ?? "",
      cover: p.cover_url ?? "",
      is_featured: !!p.is_featured,
    });
    setSeriesDialogOpen(true);
  };

  const handleSubmitSeries = async () => {
    if (!seriesForm.title.trim()) { toast.error("Le titre de la série est obligatoire"); return; }
    if (!seriesForm.category)     { toast.error("La catégorie est obligatoire"); return; }
    setSavingSeries(true);
    try {
      const payload: PodcastSeriesWrite = {
        title: seriesForm.title.trim(),
        category: seriesForm.category,
        description: seriesForm.description.trim() || undefined,
        cover: seriesForm.cover || undefined,
        is_featured: seriesForm.is_featured,
      };
      if (editingSeriesSlug) {
        await podcastsApi.update(editingSeriesSlug, payload);
        toast.success("Série mise à jour");
        await loadPodcasts();
      } else {
        const created = await podcastsApi.create(payload);
        toast.success("Série créée");
        await loadPodcasts();
        // sélectionne automatiquement la nouvelle série dans le formulaire d'épisode
        setForm((f) => ({ ...f, series: String(created.id) }));
      }
      setSeriesForm(EMPTY_SERIES);
      setEditingSeriesSlug(null);
      setSeriesDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement de la série");
    } finally {
      setSavingSeries(false);
    }
  };

  const handleDeleteSeries = async (p: PodcastSeriesList) => {
    if (!confirm(`Supprimer la série « ${p.title} » et détacher ses épisodes ?`)) return;
    try {
      await podcastsApi.delete(p.slug);
      toast.success("Série supprimée");
      loadPodcasts();
      fetchEpisodes();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  // Naviguer vers les épisodes d'une série (arborescence Série → Épisodes).
  const viewSeriesEpisodes = (p: PodcastSeriesList) => {
    setFilterPodcast(p.slug);
    setActiveTab("episodes");
  };

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
      audio_url: ep.audio_url ?? "",
      duration: ep.duration ?? "",
      cover: ep.cover_url ?? "",
      episode_number: ep.episode_number ? String(ep.episode_number) : "",
      season_number: ep.season_number ? String(ep.season_number) : "",
      is_featured: !!ep.is_featured,
      published_at: toLocalInput(ep.published_at),
      guests: [], guestNames: [], transcript: "",
    });
    setIsCreateDialogOpen(true);
    // guests + transcript + audio_url ne sont que dans le détail → on complète.
    podcastsApi.episodes.get(ep.slug).then((d) => {
      const guestIds: number[] = [];
      const guestNames: string[] = [];
      for (const g of d.guests ?? []) {
        if (typeof g === "number") guestIds.push(g);
        else if (typeof g === "string") guestNames.push(g);
        else if (g && typeof g.id === "number") guestIds.push(g.id);
        else if (g && g.name) guestNames.push(g.name);
      }
      setForm((f) => ({ ...f, guests: guestIds, guestNames, transcript: d.transcript ?? "", audio_url: d.audio_url ?? f.audio_url }));
    }).catch(() => { /* on garde les valeurs de la liste */ });
  };

  const handleSubmitEpisode = async () => {
    if (!form.title || !form.series) { toast.error("Titre et série requis"); return; }
    // Bloque les URLs audio non lisibles (pages/embeds → CORS côté client).
    if (form.audio_url.trim() && !isPlayableAudioUrl(form.audio_url)) {
      toast.error("URL audio non compatible : téléversez le fichier ou collez un lien direct .mp3/.m4a (les liens de pages ou d'embed provoquent une erreur CORS côté client).");
      return;
    }
    setSubmitting(true);
    try {
      // Invités : IDs d'artistes + noms libres d'invités non-artistes.
      const guests: (number | string)[] = [...form.guests, ...form.guestNames];
      // Champs communs (création + édition)
      const common: Partial<EpisodeWrite> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        series: Number(form.series),
        audio_url: form.audio_url.trim() || undefined,
        duration: form.duration.trim() || undefined,
        cover: form.cover || undefined,
        episode_number: form.episode_number ? Number(form.episode_number) : undefined,
        season_number: form.season_number ? Number(form.season_number) : undefined,
        is_featured: form.is_featured,
        guests: guests.length ? guests : undefined,
        transcript: form.transcript.trim() || undefined,
      };
      if (editingSlug) {
        // PATCH partiel : published_at seulement si l'utilisateur l'a renseignée
        await podcastsApi.episodes.update(editingSlug, {
          ...common,
          ...(form.published_at ? { published_at: new Date(form.published_at).toISOString() } : {}),
        });
        toast.success("Épisode mis à jour");
      } else {
        const payload: EpisodeWrite = {
          ...common,
          title: form.title.trim(),
          series: Number(form.series),
          // published_at requis par l'API : la date choisie, sinon maintenant
          published_at: form.published_at
            ? new Date(form.published_at).toISOString()
            : new Date().toISOString(),
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

  const kpis = [
    { label: "Séries", value: podcasts.length, icon: Mic, bg: "var(--red-soft)", color: "var(--red)" },
    { label: "Épisodes", value: totalEpisodes, icon: Headphones, bg: "var(--blue-soft)", color: "var(--blue)" },
    { label: "Écoutes", value: totalPlays.toLocaleString(), icon: BarChart3, bg: "var(--emerald-soft)", color: "var(--emerald)" },
    { label: "En vedette", value: episodes.filter((e) => e.is_featured).length, icon: Heart, bg: "var(--gold-soft)", color: "var(--gold)" },
  ];

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Podcasts</h1>
          <p>Gérez vos podcasts et épisodes audio</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-red" onClick={openCreate}>
            <Plus strokeWidth={2.2} />Nouvel Épisode
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="kpis">
        {kpis.map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: s.bg, color: s.color }}><s.icon /></div>
              <div><div className="kpi-lb">{s.label}</div></div>
            </div>
            <div className="kpi-v">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="seg">
        <button className={activeTab === "episodes" ? "on" : ""} onClick={() => setActiveTab("episodes")}>Épisodes</button>
        <button className={activeTab === "podcasts" ? "on" : ""} onClick={() => setActiveTab("podcasts")}>Séries</button>
      </div>

      {/* Épisodes */}
      {activeTab === "episodes" && (
        <>
          <div className="toolbar">
            <div className="tb-search">
              <Search />
              <input placeholder="Rechercher un épisode..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Select value={filterPodcast} onValueChange={setFilterPodcast}>
              <SelectTrigger className="filter w-full sm:w-[200px]">
                <SelectValue placeholder="Série" />
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
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
            </div>
          ) : episodes.length === 0 ? (
            <div className="ph">
              <div className="ph-ic"><Headphones /></div>
              <h3>Aucun épisode trouvé</h3>
              <p>Créez un nouvel épisode pour l{"'"}un de vos podcasts.</p>
              <button className="btn btn-red" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus strokeWidth={2.2} />Créer un épisode
              </button>
            </div>
          ) : (
            <div className="m-grid">
              {episodes.map((ep, i) => (
                <div className="m-card" key={ep.id}>
                  <div className={`m-cover ${ep.cover_url ? "" : COVER_GRADIENTS[i % COVER_GRADIENTS.length]}`}>
                    {ep.cover_url && <img src={ep.cover_url} alt={ep.title} loading="lazy" decoding="async" />}
                    {ep.is_featured && <span className="m-tag m-sched">En vedette</span>}
                    <button className="m-play" onClick={() => togglePlay(ep)} aria-label="Lecture">
                      <div className="pb">{playingId === ep.id ? <Pause /> : <Play />}</div>
                    </button>
                  </div>
                  <div className="m-body">
                    <div className="m-title" title={ep.title}>{ep.title}</div>
                    <div className="m-series">{ep.series_title ?? ep.series?.title ?? "—"}</div>
                    <div className="m-meta">
                      {ep.duration && <span className="mi"><Clock />{ep.duration}</span>}
                      {ep.play_count > 0 && <span className="mi"><Headphones />{ep.play_count.toLocaleString()}</span>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="row-act" aria-label="Actions"><MoreVertical /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(ep)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setComments(ep)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteEpisode(ep.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Séries */}
      {activeTab === "podcasts" && (
        <>
          <div className="toolbar" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => openCreateSeries}>
              <Plus strokeWidth={2.2} />Nouvelle série
            </button>
          </div>

          {loadingPodcasts ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
            </div>
          ) : podcasts.length === 0 ? (
            <div className="ph">
              <div className="ph-ic"><Mic /></div>
              <h3>Aucune série</h3>
              <p>Créez une série (podcast) pour y rattacher vos épisodes.</p>
              <button className="btn btn-red" onClick={() => openCreateSeries}>
                <Plus strokeWidth={2.2} />Créer une série
              </button>
            </div>
          ) : (
            <div className="m-grid">
              {podcasts.map((podcast, i) => (
                <div className="m-card" key={podcast.id}>
                  <div className={`m-cover ${podcast.cover_url ? "" : COVER_GRADIENTS[i % COVER_GRADIENTS.length]}`}
                    style={{ cursor: "pointer" }} onClick={() => viewSeriesEpisodes(podcast)}>
                    {podcast.cover_url && <img src={podcast.cover_url} alt={podcast.title} loading="lazy" decoding="async" />}
                    {podcast.is_featured && <span className="m-tag m-sched">En vedette</span>}
                  </div>
                  <div className="m-body">
                    <div className="m-title">{podcast.title}</div>
                    <div className="m-series">{podcast.description}</div>
                    <div className="m-meta">
                      <span className="mi" style={{ cursor: "pointer" }} onClick={() => viewSeriesEpisodes(podcast)}>
                        <Headphones />{podcast.episode_count} épisodes
                      </span>
                      <span className="mi" style={{ textTransform: "capitalize" }}>{podcast.category}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="row-act" aria-label="Actions"><MoreVertical /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewSeriesEpisodes(podcast)}><Headphones className="mr-2 h-4 w-4" />Voir les épisodes</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditSeries(podcast)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSeries(podcast)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Création / édition d'un épisode */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center justify-between">
                <Label>Série / Podcast</Label>
                <button type="button" onClick={() => openCreateSeries}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="h-3 w-3" />Nouvelle série
                </button>
              </div>
              <Select value={form.series} onValueChange={(v) => setForm({ ...form, series: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un podcast" /></SelectTrigger>
                <SelectContent>
                  {podcasts.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Série introuvable ? Cliquez sur « Nouvelle série » pour la créer.
              </p>
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
            <MediaUpload
              label="Fichier audio (upload)" context="podcast_audio" variant="audio" accept="audio/*"
              value={form.audio_url || null} onChange={(url) => setForm({ ...form, audio_url: url ?? "" })}
              onDuration={(d) => setForm((f) => ({ ...f, duration: d }))}
            />
            <div className="grid gap-2">
              <Label>…ou coller une URL audio</Label>
              <Input type="url" placeholder="https://… .mp3" value={form.audio_url}
                onChange={(e) => setForm({ ...form, audio_url: e.target.value })} />
              {form.audio_url.trim() && !isPlayableAudioUrl(form.audio_url) ? (
                <p className="text-xs text-destructive">
                  Lien non lisible (page/embed) — risque d&apos;erreur CORS côté client. Téléversez le fichier ou collez un lien direct .mp3/.m4a.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Un lien direct vers un fichier audio (.mp3, .m4a…) ou l&apos;upload ci-dessus. Les liens de page (SoundCloud, Spotify…) ne sont pas lisibles.
                </p>
              )}
            </div>
            <MediaUpload
              label="Miniature" context="podcast_cover" aspect="square"
              value={form.cover || null} onChange={(url) => setForm({ ...form, cover: url ?? "" })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Durée</Label>
                <Input placeholder="12:34" maxLength={10} value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Date de publication</Label>
                <Input type="datetime-local" value={form.published_at}
                  onChange={(e) => setForm({ ...form, published_at: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Saison</Label>
                <Input type="number" min={0} placeholder="1" value={form.season_number}
                  onChange={(e) => setForm({ ...form, season_number: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>N° d'épisode</Label>
                <Input type="number" min={0} placeholder="1" value={form.episode_number}
                  onChange={(e) => setForm({ ...form, episode_number: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Invités artistes</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {artists.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun artiste enregistré.</p>}
                {artists.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                    <input type="checkbox" checked={form.guests.includes(a.id)} onChange={() => toggleGuest(a.id)} />
                    {a.name}
                  </label>
                ))}
              </div>

              <Label className="mt-1">Invités externes (non-artistes)</Label>
              <div className="flex gap-2">
                <Input placeholder="Nom de l'invité…" value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGuestName(); } }} />
                <Button type="button" variant="secondary" onClick={addGuestName}>Ajouter</Button>
              </div>
              {form.guestNames.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.guestNames.map((n) => (
                    <button type="button" key={n} onClick={() => removeGuestName(n)}
                      className="badge b-purple" style={{ cursor: "pointer" }} title="Retirer">
                      {n} ✕
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {form.guests.length + form.guestNames.length} invité(s). Optionnel.
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Transcription (optionnelle)</Label>
              <Textarea rows={3} value={form.transcript}
                onChange={(e) => setForm({ ...form, transcript: e.target.value })}
                placeholder="Transcription écrite de l'épisode…" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">En vedette</Label>
                <p className="text-xs text-muted-foreground">Mettre cet épisode en avant.</p>
              </div>
              <Switch checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
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

      {/* Création d'une série / podcast */}
      <Dialog open={seriesDialogOpen} onOpenChange={(o) => { if (!savingSeries) setSeriesDialogOpen(o); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSeriesSlug ? "Modifier la série" : "Nouvelle série"}</DialogTitle>
            <DialogDescription>
              {editingSeriesSlug
                ? "Mettez à jour les informations de cette série."
                : "Créez une série (podcast) pour y rattacher vos épisodes."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Titre *</Label>
              <Input placeholder="Ex: Les voix du Kivu" value={seriesForm.title}
                onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} />
            </div>
            <MediaUpload
              label="Couverture" context="podcast_cover" aspect="square"
              value={seriesForm.cover || null} onChange={(url) => setSeriesForm({ ...seriesForm, cover: url ?? "" })}
            />
            <div className="grid gap-2">
              <Label>Catégorie *</Label>
              <Select value={seriesForm.category}
                onValueChange={(v) => setSeriesForm({ ...seriesForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea placeholder="Décrivez cette série..." rows={3} value={seriesForm.description}
                onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="cursor-pointer">En vedette</Label>
                <p className="text-xs text-muted-foreground">Mettre cette série en avant.</p>
              </div>
              <Switch checked={seriesForm.is_featured}
                onCheckedChange={(v) => setSeriesForm({ ...seriesForm, is_featured: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingSeries} onClick={() => setSeriesDialogOpen(false)}>Annuler</Button>
            <Button className="bg-primary hover:bg-primary/90" disabled={savingSeries} onClick={handleSubmitSeries}>
              {savingSeries && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSeriesSlug ? "Enregistrer" : "Créer la série"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modération des commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cet épisode."
          load={() => commentsApi.list("podcasts/episodes", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("podcasts/episodes", comments.slug, cid)}
        />
      )}

      {/* Lecteur audio (caché) — pilote la lecture des épisodes. */}
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />
    </section>
  );
}
