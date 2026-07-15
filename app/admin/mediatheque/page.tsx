"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Filter, LayoutGrid, List, Video,
  MoreHorizontal, Eye, Copy, Trash2,
  Check, Calendar, Loader2, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { videosApi, type VideoWrite } from "@/lib/api";
import { MediaUpload } from "@/components/admin/media-upload";

// ── Types ────────────────────────────────────────────────────────────────────

interface VideoItem {
  id: number;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  duration: string;
  category: string;
  is_premier: boolean;
  is_live: boolean;
  location: string;
  artist_names: string;   // le backend renvoie une chaîne, pas un tableau
  view_count: number;
  published_at: string | null;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  total_pages: number;
  current_page: number;
  results: T[];
}

// Proxy same-origin (voir rewrites dans next.config.mjs) — évite le CORS.
const BASE = "/api/v1";

async function fetchVideos(params: string): Promise<PaginatedResponse<VideoItem>> {
  const res = await fetch(`${BASE}/webtv/videos/${params ? `?${params}` : ""}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Category config ───────────────────────────────────────────────────────────

// Catégories valides (enum backend) — pas de "clips".
const CATEGORY_LABELS: Record<string, string> = {
  freestyles: "Freestyles",
  interviews: "Interviews",
  premiers: "Premières",
  docs: "Documentaires",
  studio_sessions: "Studio",
};

const TYPE_COLORS: Record<string, string> = {
  freestyles: "bg-primary/10 text-primary",
  interviews: "bg-blue-100 text-blue-700",
  premiers: "bg-pink-100 text-pink-700",
  docs: "bg-amber-100 text-amber-700",
  studio_sessions: "bg-emerald-100 text-emerald-700",
};

export default function MediathequePage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [page, setPage] = useState(1);

  // Ajout d'une vidéo (par URL — le backend ne gère pas l'upload de fichier)
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const EMPTY = { title: "", video_url: "", category: "freestyles", duration: "", location: "", thumbnail: "" };
  const [form, setForm] = useState(EMPTY);
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const PAGE_SIZE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "-created_at"); // plus récents en premier
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      const data = await fetchVideos(params.toString());
      setVideos(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Erreur lors du chargement des vidéos");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categories = Object.keys(CATEGORY_LABELS);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === videos.length ? [] : videos.map((v) => v.id));

  const handleAdd = async () => {
    if (!form.title.trim())     { toast.error("Le titre est obligatoire"); return; }
    if (!form.video_url.trim()) { toast.error("L'URL de la vidéo est obligatoire"); return; }
    setSaving(true);
    try {
      const payload: VideoWrite = {
        title: form.title.trim(),
        video_url: form.video_url.trim(),
        category: form.category,
        published_at: new Date().toISOString(),
        duration: form.duration.trim() || undefined,
        location: form.location.trim() || undefined,
        thumbnail: form.thumbnail || undefined,
      };
      await videosApi.create(payload);
      toast.success("Vidéo ajoutée");
      setAddOpen(false);
      setForm(EMPTY);
      setPage(1);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`https://artdukivu.com/webtv/${slug}`);
    toast.success("URL copiée");
  };

  // Ouvre la vidéo dans un nouvel onglet (récupère video_url depuis le détail).
  const watchVideo = async (slug: string) => {
    try {
      const d = await videosApi.get(slug);
      if (d.video_url) {
        window.open(d.video_url, "_blank", "noopener,noreferrer");
      } else {
        toast.error("Aucune URL de lecture pour cette vidéo");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible d'ouvrir la vidéo");
    }
  };

  const handleDeleteVideo = async (slug: string) => {
    if (!confirm("Supprimer cette vidéo ?")) return;
    try {
      await videosApi.delete(slug);
      toast.success("Vidéo supprimée");
      setPreviewVideo(null);
      setSelectedIds([]);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Supprimer ${selectedIds.length} vidéo(s) ?`)) return;
    try {
      // Suppression groupée en un seul appel (bulk_delete)
      await videosApi.bulkDelete(selectedIds);
      toast.success("Vidéos supprimées");
      setSelectedIds([]);
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Médiathèque</h1>
          <p className="mt-1 text-muted-foreground">
            {totalCount.toLocaleString()} vidéos · WebTV Art-du-Kivu
          </p>
        </div>
        <Button onClick={() => { setForm(EMPTY); setAddOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Ajouter une vidéo
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une vidéo..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-input">
            <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="rounded-r-none" onClick={() => setViewMode("grid")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="rounded-l-none" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
          <Checkbox checked={selectedIds.length === videos.length} onCheckedChange={toggleSelectAll} />
          <span className="text-sm font-medium">
            {selectedIds.length} vidéo{selectedIds.length > 1 ? "s" : ""} sélectionnée{selectedIds.length > 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-4 w-4" />Supprimer
          </Button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Grid View */}
      {!loading && viewMode === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {videos.map((video) => {
            const isSelected = selectedIds.includes(video.id);
            return (
              <div
                key={video.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg cursor-pointer",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => setPreviewVideo(video)}
              >
                {/* Selection */}
                <div
                  className={cn("absolute left-2 top-2 z-10 transition-opacity", isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(video.id); }}
                >
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors", isSelected ? "border-primary bg-primary text-primary-foreground" : "border-background bg-background/80")}>
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </div>

                {/* Category Badge */}
                <div className="absolute right-2 top-2 z-10">
                  <Badge className={cn("text-xs", TYPE_COLORS[video.category] ?? "bg-muted text-muted-foreground")}>
                    {CATEGORY_LABELS[video.category] ?? video.category}
                  </Badge>
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Video className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                    <Play className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Duration */}
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white font-mono">
                    {video.duration}
                  </span>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium" title={video.title}>{video.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{video.view_count.toLocaleString()} vues</span>
                    {video.location && <><span>·</span><span>{video.location}</span></>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {!loading && viewMode === "list" && (
        <div className="rounded-xl bg-card card-shadow overflow-hidden">
          <div className="divide-y divide-border">
            {videos.map((video) => {
              const isSelected = selectedIds.includes(video.id);
              return (
                <div
                  key={video.id}
                  className={cn("group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer", isSelected && "bg-primary/5")}
                  onClick={() => setPreviewVideo(video)}
                >
                  <div onClick={(e) => { e.stopPropagation(); toggleSelect(video.id); }}>
                    <Checkbox checked={isSelected} />
                  </div>

                  <div className="relative h-14 w-24 overflow-hidden rounded-lg bg-muted shrink-0">
                    {video.thumbnail_url ? (
                      <img src={video.thumbnail_url} alt={video.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <Video className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white font-mono">{video.duration}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{video.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge className={cn("text-xs", TYPE_COLORS[video.category] ?? "bg-muted text-muted-foreground")}>
                        {CATEGORY_LABELS[video.category] ?? video.category}
                      </Badge>
                      {video.artist_names && (
                        <span className="text-xs text-muted-foreground">{video.artist_names}</span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 w-28">
                      <Eye className="h-4 w-4" />{video.view_count.toLocaleString()}
                    </span>
                    {video.published_at && (
                      <span className="flex items-center gap-1 w-24">
                        <Calendar className="h-4 w-4" />
                        {new Date(video.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPreviewVideo(video)}>
                        <Eye className="mr-2 h-4 w-4" />Prévisualiser
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => watchVideo(video.slug)}>
                        <Play className="mr-2 h-4 w-4" />Regarder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyUrl(video.slug)}>
                        <Copy className="mr-2 h-4 w-4" />Copier l'URL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteVideo(video.slug)}>
                        <Trash2 className="mr-2 h-4 w-4" />Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card p-12 card-shadow text-center">
          <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="font-display text-lg font-semibold">Aucune vidéo trouvée</h3>
          <p className="mt-1 text-muted-foreground">Ajuste tes filtres, ou ajoute une vidéo avec le bouton en haut à droite.</p>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} sur {totalPages} · {totalCount.toLocaleString()} vidéos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
          </div>
        </div>
      )}

      {/* Ajout d'une vidéo (par URL) */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!saving) { setAddOpen(o); if (!o) setForm(EMPTY); } }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Ajouter une vidéo</DialogTitle>
            <DialogDescription>
              Téléverse un fichier vidéo, ou colle un lien (.mp4 / .m3u8). Ajoute une miniature si tu veux.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Titre de la vidéo" />
            </div>
            <MediaUpload
              label="Fichier vidéo (upload)" context="webtv_video" variant="video" accept="video/*"
              value={form.video_url && !form.video_url.includes(".m3u8") ? form.video_url : null}
              onChange={(url) => setField("video_url", url ?? "")}
            />
            <div className="space-y-1.5">
              <Label>…ou coller une URL de vidéo *</Label>
              <Input type="url" value={form.video_url} onChange={(e) => setField("video_url", e.target.value)} placeholder="https://… .mp4 ou .m3u8" />
            </div>
            <MediaUpload
              label="Miniature" context="webtv_thumbnail" aspect="video"
              value={form.thumbnail || null} onChange={(url) => setField("thumbnail", url ?? "")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Durée</Label>
                <Input value={form.duration} onChange={(e) => setField("duration", e.target.value)} placeholder="12:34" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Lieu</Label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Goma, RDC" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button disabled={saving} onClick={handleAdd}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="line-clamp-2">{previewVideo?.title}</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                {previewVideo.thumbnail_url ? (
                  <img src={previewVideo.thumbnail_url} alt={previewVideo.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Catégorie</p><p className="font-medium">{CATEGORY_LABELS[previewVideo.category] ?? previewVideo.category}</p></div>
                <div><p className="text-muted-foreground">Durée</p><p className="font-medium font-mono">{previewVideo.duration}</p></div>
                <div><p className="text-muted-foreground">Vues</p><p className="font-medium">{previewVideo.view_count.toLocaleString()}</p></div>
                {previewVideo.location && <div><p className="text-muted-foreground">Lieu</p><p className="font-medium">{previewVideo.location}</p></div>}
                {previewVideo.artist_names && (
                  <div className="col-span-2"><p className="text-muted-foreground">Artistes</p><p className="font-medium">{previewVideo.artist_names}</p></div>
                )}
                {previewVideo.published_at && (
                  <div><p className="text-muted-foreground">Publié le</p><p className="font-medium">{new Date(previewVideo.published_at).toLocaleDateString("fr-FR")}</p></div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => copyUrl(previewVideo.slug)}>
                    <Copy className="mr-2 h-4 w-4" />Copier l'URL
                  </Button>
                  <Button className="flex-1" onClick={() => watchVideo(previewVideo.slug)}>
                    <Play className="mr-2 h-4 w-4" />Regarder
                  </Button>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeleteVideo(previewVideo.slug)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
