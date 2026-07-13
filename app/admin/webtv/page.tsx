"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tv, Search, Filter, MoreHorizontal, Eye, Play, Radio, Pause, Share2,
  Trash2, Loader2, Video, Copy, Star, Plus, MessageSquare, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { videosApi, commentsApi, chatApi, type VideoListItem, type VideoDetail, type VideoWrite } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Catégories valides (enum backend CategoryFc0Enum) — ne rien ajouter d'autre.
const CATEGORY_LABELS: Record<string, string> = {
  freestyles: "Freestyles", studio_sessions: "Studio", docs: "Documentaires",
  interviews: "Interviews", premiers: "Premières",
};
const CATEGORY_COLORS: Record<string, string> = {
  freestyles: "bg-primary/10 text-primary", studio_sessions: "bg-success/10 text-success",
  docs: "bg-warning/10 text-warning", interviews: "bg-info/10 text-info",
  premiers: "bg-pink-100 text-pink-700",
};

export default function WebTvPage() {
  const [videos,     setVideos]     = useState<VideoListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [category,   setCategory]   = useState("all");
  const [watch,      setWatch]      = useState<{ item: VideoListItem; detail: VideoDetail | null } | null>(null);
  const [liveCreds,  setLiveCreds]  = useState<{ title: string; url: string; key: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [comments,   setComments]   = useState<VideoListItem | null>(null);
  const [chatFor,    setChatFor]    = useState<VideoListItem | null>(null);

  const emptyForm = {
    title: "", category: "freestyles", video_url: "", description: "",
    duration: "", location: "", is_premier: false, published_at: "",
  };
  const [form, setForm] = useState(emptyForm);
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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

  const handleGoLive = async (item: VideoListItem) => {
    try {
      const res = await videosApi.goLive(item.slug);
      toast.success("Direct démarré");
      if (res?.cf_rtmps_url && res?.cf_rtmps_key) {
        setLiveCreds({ title: item.title, url: res.cf_rtmps_url, key: res.cf_rtmps_key });
      }
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur au démarrage du direct");
    }
  };

  const handleEndLive = async (slug: string) => {
    try {
      await videosApi.endLive(slug);
      toast.success("Direct arrêté");
      fetchVideos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt du direct");
    }
  };

  const handleShare = async (item: VideoListItem) => {
    try {
      const d = await videosApi.get(item.slug);
      const link = (d.is_live ? d.cf_playback_hls_url : d.video_url) || d.video_url || "";
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
    if (!form.title.trim())     { toast.error("Le titre est obligatoire"); return; }
    if (!form.video_url.trim()) { toast.error("L'URL de la vidéo est obligatoire"); return; }
    setSaving(true);
    try {
      const payload: VideoWrite = {
        title: form.title.trim(),
        category: form.category,
        video_url: form.video_url.trim(),
        published_at: form.published_at
          ? new Date(form.published_at).toISOString()
          : new Date().toISOString(),
        description: form.description.trim() || undefined,
        duration: form.duration.trim() || undefined,
        location: form.location.trim() || undefined,
        is_premier: form.is_premier,
      };
      const created = await videosApi.create(payload);
      toast.success("Vidéo créée");
      setCreateOpen(false);
      setForm(emptyForm);

      if (thenGoLive) {
        const res = await videosApi.goLive(created.slug);
        toast.success("Direct démarré");
        if (res?.cf_rtmps_url && res?.cf_rtmps_key) {
          setLiveCreds({ title: created.title, url: res.cf_rtmps_url, key: res.cf_rtmps_key });
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Web TV</h1>
          <p className="mt-1 text-muted-foreground">Catalogue vidéo et diffusions en direct</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />Nouvelle vidéo
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Vidéos", value: videos.length, icon: Video, color: "text-primary" },
          { label: "En direct", value: liveCount, icon: Radio, color: "text-red-500" },
          { label: "Premières", value: premierCount, icon: Star, color: "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold font-mono">{loading ? "—" : s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher une vidéo…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Catégorie" />
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
        <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12">
          <Tv className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucune vidéo.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {videos.map((v) => (
            <div key={v.id} className="group overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg">
              <div className="relative aspect-video bg-muted">
                {v.thumbnail_url ? (
                  <img src={v.thumbnail_url} alt={v.title} loading="lazy" decoding="async"
                    className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Video className="h-10 w-10 text-muted-foreground/30" /></div>
                )}
                {v.is_live && (
                  <Badge className="absolute left-2 top-2 gap-1 bg-red-500 text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
                  </Badge>
                )}
                <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white">{v.duration}</span>
                <button onClick={() => handleWatch(v)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                  <Play className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={v.title}>{v.title}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleWatch(v)}><Eye className="mr-2 h-4 w-4" />Regarder</DropdownMenuItem>
                      {v.is_live ? (
                        <DropdownMenuItem onClick={() => handleEndLive(v.slug)}><Pause className="mr-2 h-4 w-4" />Arrêter le direct</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleGoLive(v)}><Radio className="mr-2 h-4 w-4" />Passer en direct</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleShare(v)}><Share2 className="mr-2 h-4 w-4" />Partager</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setComments(v)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      {v.is_live && <DropdownMenuItem onClick={() => setChatFor(v)}><MessagesSquare className="mr-2 h-4 w-4" />Chat du direct</DropdownMenuItem>}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(v.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className={cn("text-[10px]", CATEGORY_COLORS[v.category])}>
                    {CATEGORY_LABELS[v.category] ?? v.category}
                  </Badge>
                  <span>·</span>
                  <span>{(v.view_count ?? 0).toLocaleString()} vues</span>
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
                  const live = watch.detail.is_live && watch.detail.cf_playback_hls_url;
                  const src = live ? watch.detail.cf_playback_hls_url! : (watch.detail.video_url ?? "");
                  if (!src) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune source vidéo.</div>;
                  if (live || src.includes(".m3u8")) {
                    return <HlsPlayer src={src} poster={watch.detail.thumbnail_url ?? undefined}
                      emptyLabel={live ? "Le direct n'a pas encore démarré." : "Vidéo indisponible."} />;
                  }
                  // VOD fichier direct (mp4…)
                  return <video src={src} poster={watch.detail.thumbnail_url ?? undefined} controls autoPlay playsInline className="h-full w-full bg-black" />;
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
      <Dialog open={createOpen} onOpenChange={(o) => { if (!saving) { setCreateOpen(o); if (!o) setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle vidéo</DialogTitle>
            <DialogDescription>
              Ajoutez une vidéo au catalogue. Vous pouvez la publier telle quelle ou la lancer directement en direct.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
            <div className="space-y-1.5">
              <Label htmlFor="wt-url">URL de la vidéo *</Label>
              <Input id="wt-url" value={form.video_url} onChange={(e) => setField("video_url", e.target.value)}
                placeholder="https://… (fichier .mp4 ou lien .m3u8)" />
              <p className="text-xs text-muted-foreground">
                Lien de lecture / rediffusion. Pour un direct, indiquez le lien de rediffusion prévu.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt-location">Lieu</Label>
              <Input id="wt-location" value={form.location} onChange={(e) => setField("location", e.target.value)}
                placeholder="Goma, RDC" />
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
            <Button variant="outline" disabled={saving} onClick={() => handleCreate(false)}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Créer
            </Button>
            <Button disabled={saving} onClick={() => handleCreate(true)} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Créer et passer en direct
            </Button>
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
                  <Label>Serveur (RTMPS)</Label>
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
    </div>
  );
}
