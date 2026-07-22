"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tv, Search, Filter, MoreHorizontal, Eye, Play, Radio, Pause, Share2,
  Trash2, Loader2, Video, Copy, Star, Plus, MessageSquare, MessagesSquare, Edit, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { HlsPlayer } from "@/components/admin/hls-player";
import { ModerationDialog, commentToMod, chatToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import { videosApi, commentsApi, chatApi, extractStreamCreds, artistsApi, type VideoListItem, type VideoDetail, type VideoWrite, type ArtistList } from "@/lib/api";
import { toast } from "sonner";

// Catégories valides (enum backend CategoryFc0Enum) — ne rien ajouter d'autre.
const CATEGORY_LABELS: Record<string, string> = {
  freestyles: "Freestyles", studio_sessions: "Studio", docs: "Documentaires",
  interviews: "Interviews", premiers: "Premières",
};

// Placeholder envoyé pour une entrée « direct caméra » : le backend exige un
// video_url ET vérifie qu'il est joignable. On utilise une petite vidéo publique
// (Cloudinary demo) — elle n'est jamais affichée (le player détecte ce placeholder
// et montre « Direct caméra »), la lecture réelle se fait via le flux caméra.
const CAMERA_PLACEHOLDER = "https://res.cloudinary.com/demo/video/upload/dog.mp4";

export default function WebTvPage() {
  const [videos,     setVideos]     = useState<VideoListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState("all");
  const [watch,      setWatch]      = useState<{ item: VideoListItem; detail: VideoDetail | null } | null>(null);
  const [liveCreds,  setLiveCreds]  = useState<{ title: string; url: string; key: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  // Mode de création : "file" = fichier vidéo uploadé ; "camera" = direct caméra (OBS).
  const [mode,       setMode]       = useState<"file" | "camera">("file");
  const [comments,   setComments]   = useState<VideoListItem | null>(null);
  const [chatFor,    setChatFor]    = useState<VideoListItem | null>(null);
  // Slugs diffusés en mode « vidéo uploadée » (playout) — le backend ne distingue
  // pas ce mode du direct caméra, on le mémorise donc localement.
  const [playoutSlugs, setPlayoutSlugs] = useState<Set<string>>(new Set());
  // Slugs créés en mode « direct caméra » (type permanent, pas de fichier vidéo).
  const [cameraSlugs, setCameraSlugs] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setPlayoutSlugs(new Set(JSON.parse(localStorage.getItem("webtv_playout") || "[]"))); } catch { /* ignore */ }
    try { setCameraSlugs(new Set(JSON.parse(localStorage.getItem("webtv_camera") || "[]"))); } catch { /* ignore */ }
  }, []);
  const savePlayout = (next: Set<string>) => {
    setPlayoutSlugs(next);
    try { localStorage.setItem("webtv_playout", JSON.stringify([...next])); } catch { /* ignore */ }
  };
  const saveCamera = (next: Set<string>) => {
    setCameraSlugs(next);
    try { localStorage.setItem("webtv_camera", JSON.stringify([...next])); } catch { /* ignore */ }
  };

  const emptyForm = {
    title: "", category: "freestyles", video_url: "", description: "",
    duration: "", location: "", is_premier: false, published_at: "", thumbnail: "",
    artists: [] as number[],
  };
  const [form, setForm] = useState(emptyForm);
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Artistes associés à la vidéo
  const [allArtists, setAllArtists] = useState<ArtistList[]>([]);
  useEffect(() => {
    artistsApi.list("page_size=200&ordering=name").then((d) => setAllArtists(d.results)).catch(() => {});
  }, []);
  const toggleVideoArtist = (id: number) =>
    setForm((f) => ({ ...f, artists: f.artists.includes(id) ? f.artists.filter((x) => x !== id) : [...f.artists, id] }));

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-created_at");
      p.set("page_size", "60");
      if (search) p.set("search", search);
      if (category !== "all") p.set("category", category);
      const data = await videosApi.list(p.toString());
      setVideos(data.results);
    } catch {
      toast.error("Erreur lors du chargement des vidéos");
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  // Pendant qu'on regarde un direct, on ré-interroge le détail toutes les 8 s
  // jusqu'à ce que le flux caméra (playback_hls_url) apparaisse — MediaMTX met
  // ~15 s à détecter OBS après go_live.
  useEffect(() => {
    if (!watch?.item.is_live || watch.detail?.playback_hls_url) return;
    const slug = watch.item.slug;
    if (playoutSlugs.has(slug)) return; // playout : pas de flux caméra à attendre
    const id = setInterval(async () => {
      try {
        const d = await videosApi.get(slug);
        setWatch((w) => (w && w.item.slug === slug ? { ...w, detail: d } : w));
      } catch { /* on retentera au prochain tick */ }
    }, 8000);
    return () => clearInterval(id);
  }, [watch?.item.slug, watch?.item.is_live, watch?.detail?.playback_hls_url, playoutSlugs]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copié"); };

  const handleWatch = async (item: VideoListItem) => {
    setWatch({ item, detail: null });
    try {
      setWatch({ item, detail: await videosApi.get(item.slug) });
    } catch (err: unknown) {
      setWatch(null);
      toast.error(err instanceof Error ? err.message : "Impossible de charger la vidéo");
    }
  };

  const openCreate = () => { setEditingSlug(null); setForm(emptyForm); setMode("file"); setCreateOpen(true); };

  const openEdit = async (item: VideoListItem) => {
    try {
      const d = await videosApi.get(item.slug);
      const isCamera = d.broadcast_mode === "camera" || d.video_url === CAMERA_PLACEHOLDER || cameraSlugs.has(item.slug);
      setEditingSlug(item.slug);
      setMode(isCamera ? "camera" : "file");
      setForm({
        title: d.title ?? "",
        category: d.category ?? "freestyles",
        video_url: isCamera ? "" : (d.video_url ?? ""),
        description: d.description ?? "",
        duration: d.duration ?? "",
        location: d.location ?? "",
        is_premier: !!d.is_premier,
        published_at: d.published_at ? new Date(d.published_at).toISOString().slice(0, 16) : "",
        thumbnail: d.thumbnail_url ?? "",
        artists: (() => {
          const raw = (d as unknown as { artists?: (number | { id: number })[] }).artists;
          return Array.isArray(raw) ? raw.map((a) => (typeof a === "number" ? a : a.id)).filter(Boolean) : [];
        })(),
      });
      setCreateOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de charger la vidéo");
    }
  };

  const handleUpdate = async () => {
    if (!editingSlug) return;
    const isCamera = mode === "camera";
    if (!form.title.trim())     { toast.error("Le titre est obligatoire"); return; }
    if (!isCamera && !form.video_url.trim()) { toast.error("La vidéo est obligatoire (upload ou URL)"); return; }
    setSaving(true);
    try {
      await videosApi.update(editingSlug, {
        title: form.title.trim(),
        category: form.category,
        broadcast_mode: isCamera ? "camera" : "playout",
        video_url: isCamera ? undefined : form.video_url.trim(),
        description: form.description.trim() || undefined,
        duration: form.duration.trim() || undefined,
        location: form.location.trim() || undefined,
        is_premier: form.is_premier,
        thumbnail: form.thumbnail || undefined,
        artists: form.artists.length ? form.artists : undefined,
        published_at: form.published_at ? new Date(form.published_at).toISOString() : undefined,
      });
      const c = new Set(cameraSlugs);
      if (isCamera) c.add(editingSlug); else c.delete(editingSlug);
      saveCamera(c);
      toast.success("Vidéo mise à jour");
      setCreateOpen(false); setForm(emptyForm); setMode("file"); setEditingSlug(null);
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  // camera=true : diffusion caméra via OBS (on affiche les identifiants RTMP).
  // camera=false : diffuser la vidéo uploadée en direct (aucun OBS nécessaire).
  const handleGoLive = async (item: VideoListItem, camera: boolean) => {
    try {
      const res = await videosApi.goLive(item.slug);
      const next = new Set(playoutSlugs);
      if (camera) {
        next.delete(item.slug); savePlayout(next);
        const creds = extractStreamCreds(res);
        if (creds) setLiveCreds({ title: item.title, ...creds });
        else toast.warning("Direct démarré, mais les identifiants RTMP n'ont pas été renvoyés (voir la console).");
        console.log("go_live response (webtv):", res);
        toast.success("Direct caméra démarré — configure OBS");
      } else {
        next.add(item.slug); savePlayout(next);
        toast.success("Vidéo diffusée en direct");
      }
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur au démarrage du direct");
    }
  };

  const handleEndLive = async (slug: string) => {
    try {
      await videosApi.endLive(slug);
      const next = new Set(playoutSlugs); next.delete(slug); savePlayout(next);
      toast.success("Direct arrêté");
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt du direct");
    }
  };

  const handleShare = async (item: VideoListItem) => {
    try {
      const d = await videosApi.get(item.slug);
      const link = (d.is_live ? d.playback_hls_url : d.video_url) || d.video_url || "";
      if (!link) { toast.error("Aucun lien de lecture"); return; }
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié");
      videosApi.share(item.slug).catch(() => {});
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de récupérer le lien");
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cette vidéo ?")) return;
    try {
      await videosApi.delete(slug);
      toast.success("Vidéo supprimée");
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleCreate = async (thenGoLive: boolean) => {
    const isCamera = mode === "camera";
    if (!form.title.trim())     { toast.error("Le titre est obligatoire"); return; }
    if (!isCamera && !form.video_url.trim()) { toast.error("La vidéo est obligatoire (upload ou URL)"); return; }
    setSaving(true);
    try {
      const payload: VideoWrite = {
        title: form.title.trim(),
        category: form.category,
        // Direct caméra : pas de fichier → placeholder (le backend exige video_url).
        broadcast_mode: isCamera ? "camera" : "playout",
        video_url: isCamera ? undefined : form.video_url.trim(),
        published_at: form.published_at
          ? new Date(form.published_at).toISOString()
          : new Date().toISOString(),
        description: form.description.trim() || undefined,
        duration: form.duration.trim() || undefined,
        location: form.location.trim() || undefined,
        is_premier: form.is_premier,
        thumbnail: form.thumbnail || undefined,
        artists: form.artists.length ? form.artists : undefined,
      };
      const created = await videosApi.create(payload);
      if (isCamera) { const c = new Set(cameraSlugs); c.add(created.slug); saveCamera(c); }
      toast.success("Vidéo créée");
      setCreateOpen(false);
      setForm(emptyForm);
      setMode("file");

      if (thenGoLive) {
        const res = await videosApi.goLive(created.slug);
        const next = new Set(playoutSlugs);
        if (isCamera) {
          next.delete(created.slug); savePlayout(next);
          const creds = extractStreamCreds(res);
          if (creds) setLiveCreds({ title: created.title, ...creds });
          else toast.warning("Direct démarré, mais les identifiants RTMP n'ont pas été renvoyés (voir la console).");
          toast.success("Direct caméra démarré — configure OBS");
        } else {
          next.add(created.slug); savePlayout(next);
          toast.success("Vidéo diffusée en direct");
        }
      }
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  const liveCount = videos.filter((v) => v.is_live).length;
  const premierCount = videos.filter((v) => v.is_premier).length;
  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Web TV</h1>
          <p>Catalogue vidéo et diffusions en direct</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-red" onClick={openCreate}>
            <Plus strokeWidth={2.2} />Nouvelle vidéo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="kpis">
        {[
          { label: "Vidéos", value: videos.length, icon: Video, bg: "var(--red-soft)", fg: "var(--red)" },
          { label: "En direct", value: liveCount, icon: Radio, bg: "var(--red-soft)", fg: "var(--red)" },
          { label: "Premières", value: premierCount, icon: Star, bg: "var(--gold-soft)", fg: "var(--gold)" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: s.bg, color: s.fg }}><s.icon /></div>
              <div><div className="kpi-lb">{s.label}</div></div>
            </div>
            <div className="kpi-v">{loading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher une vidéo…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="filter">
            <Filter /><SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Grille */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : videos.length === 0 ? (
        <div className="ph">
          <div className="ph-ic"><Tv /></div>
          <h3>Aucune vidéo</h3>
          <p>Ajoutez une vidéo ou lancez une diffusion en direct pour commencer.</p>
          <button className="btn btn-red" onClick={openCreate}><Plus strokeWidth={2.2} />Nouvelle vidéo</button>
        </div>
      ) : (
        <div className="m-grid">
          {videos.map((v) => (
            <div key={v.id} className="m-card">
              <div className="m-cover">
                {v.thumbnail_url && (
                  <img src={v.thumbnail_url} alt={v.title} loading="lazy" decoding="async" />
                )}
                {v.is_live && <span className="m-tag m-live"><span className="pulse" />LIVE</span>}
                <button className="m-play" onClick={() => handleWatch(v)}>
                  <div className="pb"><Play /></div>
                </button>
              </div>
              <div className="m-body">
                <div className="m-title" title={v.title}>{v.title}</div>
                <div className="m-series">{CATEGORY_LABELS[v.category] ?? v.category}</div>
                <div className="m-meta">
                  <span className="mi"><Clock />{v.duration}</span>
                  <span className="mi"><Eye />{(v.view_count ?? 0).toLocaleString()}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="row-act"><MoreHorizontal /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleWatch(v)}><Eye className="mr-2 h-4 w-4" />Regarder</DropdownMenuItem>
                      {v.is_live ? (
                        <DropdownMenuItem onClick={() => handleEndLive(v.slug)}><Pause className="mr-2 h-4 w-4" />Arrêter le direct</DropdownMenuItem>
                      ) : cameraSlugs.has(v.slug) ? (
                        <DropdownMenuItem onClick={() => handleGoLive(v, true)}><Radio className="mr-2 h-4 w-4" />Passer en direct (caméra)</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleGoLive(v, false)}><Play className="mr-2 h-4 w-4" />Diffuser la vidéo en direct</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEdit(v)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(v)}><Share2 className="mr-2 h-4 w-4" />Partager</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setComments(v)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      {v.is_live && <DropdownMenuItem onClick={() => setChatFor(v)}><MessagesSquare className="mr-2 h-4 w-4" />Chat du direct</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(v.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lecteur */}
      <Dialog open={!!watch} onOpenChange={(o) => !o && setWatch(null)}>
        <DialogContent className="max-w-3xl">
          {watch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {watch.item.is_live && <Badge className="bg-red-500 text-white">LIVE</Badge>}
                  {watch.item.title}
                </DialogTitle>
                <DialogDescription>
                  {watch.item.is_live ? "Diffusion en direct." : "Lecture de la vidéo."}
                </DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {!watch.detail ? (
                  <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (() => {
                  // Mode playout (vidéo uploadée en direct) → on joue video_url, pas le HLS.
                  const playout = playoutSlugs.has(watch.item.slug);
                  const camera = !playout && watch.detail.is_live && watch.detail.playback_hls_url;
                  const src = camera ? watch.detail.playback_hls_url! : (watch.detail.video_url ?? "");
                  if (!src || src === CAMERA_PLACEHOLDER) return <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground"><Radio className="h-8 w-8 text-muted-foreground/40" />Direct caméra — pas encore démarré.<span className="text-xs">Utilise « Passer en direct (caméra) ».</span></div>;
                  if (camera || src.includes(".m3u8")) {
                    return <HlsPlayer src={src} poster={watch.detail.thumbnail_url ?? undefined}
                      muted={watch.item.is_live}
                      emptyLabel={camera ? "Le direct n'a pas encore démarré." : "Vidéo indisponible."} />;
                  }
                  // Vidéo uploadée diffusée en direct → démarre en muet (autoplay) ;
                  // VOD normale → lecture avec son sur action de l'utilisateur.
                  return <video src={src} poster={watch.detail.thumbnail_url ?? undefined}
                    controls autoPlay muted={watch.item.is_live} playsInline
                    className="h-full w-full bg-black" />;
                })()}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleShare(watch.item)}><Share2 className="mr-2 h-4 w-4" />Partager</Button>
                <Button onClick={() => setWatch(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Création d'une vidéo */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!saving) { setCreateOpen(o); if (!o) { setForm(emptyForm); setMode("file"); setEditingSlug(null); } } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Modifier la vidéo" : "Nouvelle vidéo"}</DialogTitle>
            <DialogDescription>
              Choisis le type : une <strong>vidéo fichier</strong> (upload/URL) ou un <strong>direct caméra</strong> (OBS, sans fichier).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg border p-1">
              <Button type="button" size="sm" className="gap-2"
                variant={mode === "file" ? "default" : "ghost"} onClick={() => setMode("file")}>
                <Video className="h-4 w-4" />Fichier vidéo
              </Button>
              <Button type="button" size="sm" className="gap-2"
                variant={mode === "camera" ? "default" : "ghost"} onClick={() => setMode("camera")}>
                <Radio className="h-4 w-4" />Direct caméra
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt-title">Titre *</Label>
              <Input id="wt-title" value={form.title} onChange={(e) => setField("title", e.target.value)}
                placeholder="Titre de la vidéo" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Catégorie *</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wt-duration">Durée</Label>
                <Input id="wt-duration" value={form.duration} onChange={(e) => setField("duration", e.target.value)}
                  placeholder="12:34" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt-date">Date de publication</Label>
              <Input id="wt-date" type="datetime-local" value={form.published_at}
                onChange={(e) => setField("published_at", e.target.value)} />
              <p className="text-xs text-muted-foreground">Laissez vide pour publier maintenant.</p>
            </div>
            {mode === "file" ? (
              <>
                <MediaUpload
                  label="Fichier vidéo (upload)" context="webtv_video" variant="video" accept="video/*"
                  value={form.video_url && !form.video_url.includes(".m3u8") ? form.video_url : null}
                  onChange={(url) => setField("video_url", url ?? "")}
                  onDuration={(d) => setField("duration", d)}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="wt-url">…ou coller une URL de vidéo *</Label>
                  <Input id="wt-url" value={form.video_url} onChange={(e) => setField("video_url", e.target.value)}
                    placeholder="https://… (fichier .mp4 ou lien .m3u8)" />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                <Radio className="mr-1 inline h-4 w-4 text-primary" />
                Direct caméra : aucun fichier à fournir. Après création, utilise « Passer en direct (caméra) »
                pour obtenir les identifiants OBS.
              </p>
            )}
            <MediaUpload
              label="Miniature" context="webtv_thumbnail" aspect="video"
              value={form.thumbnail || null} onChange={(url) => setField("thumbnail", url ?? "")}
            />
            <div className="space-y-1.5">
              <Label htmlFor="wt-location">Lieu</Label>
              <Input id="wt-location" value={form.location} onChange={(e) => setField("location", e.target.value)}
                placeholder="Goma, RDC" />
            </div>
            <div className="space-y-1.5">
              <Label>Artistes associés</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border p-2">
                {allArtists.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun artiste enregistré.</p>}
                {allArtists.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                    <input type="checkbox" checked={form.artists.includes(a.id)} onChange={() => toggleVideoArtist(a.id)} />
                    {a.name}
                  </label>
                ))}
              </div>
              {form.artists.length > 0 && <p className="text-xs text-muted-foreground">{form.artists.length} artiste(s) associé(s)</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt-desc">Description</Label>
              <Textarea id="wt-desc" rows={3} value={form.description}
                onChange={(e) => setField("description", e.target.value)} placeholder="Description de la vidéo…" />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="wt-premier" className="cursor-pointer">Première</Label>
                <p className="text-xs text-muted-foreground">Mettre en avant comme première.</p>
              </div>
              <Switch id="wt-premier" checked={form.is_premier}
                onCheckedChange={(v) => setField("is_premier", v)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {editingSlug ? (
              <Button disabled={saving} onClick={handleUpdate}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled={saving} onClick={() => handleCreate(false)}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer
                </Button>
                <Button disabled={saving} onClick={() => handleCreate(true)} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                  {mode === "camera" ? "Créer et passer en direct (caméra)" : "Créer et diffuser en direct"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Identifiants de diffusion (OBS) */}
      <Dialog open={!!liveCreds} onOpenChange={(o) => !o && setLiveCreds(null)}>
        <DialogContent className="sm:max-w-[560px]">
          {liveCreds && (
            <>
              <DialogHeader>
                <DialogTitle>Prêt à diffuser « {liveCreds.title} »</DialogTitle>
                <DialogDescription>
                  Copie ces deux infos dans OBS pour lancer ton direct. <span className="font-semibold text-primary">Elles ne s&apos;affichent qu&apos;une seule fois.</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Serveur (RTMP)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={liveCreds.url} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(liveCreds.url)}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Clé de stream</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={liveCreds.key} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(liveCreds.key)}><Copy className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setLiveCreds(null)}>C&apos;est copié</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modération : commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cette vidéo."
          load={() => commentsApi.list("webtv/videos", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("webtv/videos", comments.slug, cid)}
        />
      )}

      {/* Modération : chat du direct */}
      {chatFor && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setChatFor(null)}
          title={`Chat — ${chatFor.title}`}
          description="Messages du chat en direct. Supprimez les messages inappropriés."
          emptyLabel="Aucun message pour le moment."
          load={() => chatApi.list("webtv/videos", chatFor.slug).then((r) => r.results.map(chatToMod))}
          remove={(mid) => chatApi.remove("webtv/videos", chatFor.slug, mid)}
        />
      )}
    </section>
  );
}
