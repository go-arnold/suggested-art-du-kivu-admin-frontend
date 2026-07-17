"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio, Calendar, Clock, Eye, MoreHorizontal, Plus, Search, Filter,
  Wifi, WifiOff, Video, Loader2, Play, Pause, Edit, Share2, Headphones, Copy,
  MessageSquare, Trash2,
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
import { emissionsApi, commentsApi, extractStreamCreds, type EmissionList, type EmissionWrite, type EmissionDetail, type EmissionStatus } from "@/lib/api";
import { HlsPlayer } from "@/components/admin/hls-player";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
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
  status: "scheduled",
  scheduled_at: "",
  duration_minutes: 60,
  cover: "",
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
  const [watch,       setWatch]       = useState<{ show: EmissionList; detail: EmissionDetail | null } | null>(null);
  const [liveCreds,   setLiveCreds]   = useState<{ title: string; url: string; key: string } | null>(null);
  const [comments,    setComments]    = useState<EmissionList | null>(null);

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

  // Pendant qu'on regarde un direct, ré-interroge le détail toutes les 8 s
  // jusqu'à ce que le flux (playback_hls_url) apparaisse (délai MediaMTX ~15 s).
  useEffect(() => {
    if (watch?.show.status !== "live" || watch.detail?.playback_hls_url) return;
    const slug = watch.show.slug;
    const id = setInterval(async () => {
      try {
        const d = await emissionsApi.get(slug);
        setWatch((w) => (w && w.show.slug === slug ? { ...w, detail: d } : w));
      } catch { /* retentera */ }
    }, 8000);
    return () => clearInterval(id);
  }, [watch?.show.slug, watch?.show.status, watch?.detail?.playback_hls_url]);

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
      status: show.status,
      scheduled_at: show.scheduled_at ? show.scheduled_at.slice(0, 16) : "",
      duration_minutes: show.duration_minutes ?? 0,
      stream_url: show.stream_url || undefined,
      cover: show.cover_url ?? "",
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
    if (!form.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    // La date n'est obligatoire que pour une émission programmée.
    if (form.status === "scheduled" && !form.scheduled_at) {
      toast.error("La date / heure est requise pour une émission programmée");
      return;
    }
    setSubmitting(true);
    try {
      const payload: EmissionWrite = {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        status: form.status,
        // vide → null (le champ est nullable côté backend), sinon ISO complet
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        duration_minutes: form.duration_minutes || undefined,
        stream_url: form.stream_url?.trim() || undefined,
        cover: form.cover || undefined,
      };
      if (editingSlug) {
        await emissionsApi.update(editingSlug, payload);
        toast.success("Émission mise à jour");
      } else {
        await emissionsApi.create(payload);
        toast.success("Émission enregistrée");
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

  // Démarrer / arrêter une diffusion via les actions dédiées (Cloudflare Stream).
  const handleGoLive = async (show: EmissionList) => {
    try {
      const res = await emissionsApi.goLive(show.slug);
      toast.success("Émission démarrée — en direct");
      const creds = extractStreamCreds(res);
      if (creds) setLiveCreds({ title: show.title, ...creds });
      else toast.warning("Direct démarré, mais le backend n'a pas renvoyé les identifiants RTMPS (voir la console / la réponse go_live).");
      // Diagnostic : trace la réponse pour identifier les champs si besoin.
      console.log("go_live response (emissions):", res);
      fetchShows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur au démarrage de la diffusion");
    }
  };

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copié"); };

  const handleEndLive = async (slug: string) => {
    try {
      await emissionsApi.endLive(slug);
      toast.success("Diffusion arrêtée");
      fetchShows();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt de la diffusion");
    }
  };

  // Regarder le direct / réécouter : charge le détail (URL de lecture HLS).
  const handleWatch = async (show: EmissionList) => {
    setWatch({ show, detail: null });
    try {
      const detail = await emissionsApi.get(show.slug);
      setWatch({ show, detail });
    } catch (err: unknown) {
      setWatch(null);
      toast.error(err instanceof Error ? err.message : "Impossible de charger la lecture");
    }
  };

  // Partager le lien de lecture (direct ou replay) + enregistre le partage.
  const handleShare = async (show: EmissionList) => {
    try {
      const detail = await emissionsApi.get(show.slug);
      const link = detail.playback_hls_url || detail.stream_url || "";
      if (!link) { toast.error("Aucun lien de lecture disponible"); return; }
      await navigator.clipboard.writeText(link);
      toast.success("Lien copié dans le presse-papier");
      emissionsApi.share(show.slug).catch(() => {}); // comptabilise le partage
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Impossible de récupérer le lien");
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
              <MediaUpload
                label="Couverture" context="emission_cover" aspect="video"
                value={form.cover || null} onChange={(url) => setForm({ ...form, cover: url ?? "" })}
              />
              <div className="grid gap-2">
                <Label>Statut</Label>
                <Select value={form.status ?? "scheduled"}
                  onValueChange={(v) => setForm({ ...form, status: v as EmissionStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Programmée</SelectItem>
                    <SelectItem value="live">En direct</SelectItem>
                    <SelectItem value="recorded">Enregistrée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date et heure{form.status === "scheduled" ? " *" : ""}</Label>
                  <Input type="datetime-local" value={form.scheduled_at ?? ""}
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
      {!loading && shows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {shows.map((show) => (
            <div key={show.id} className="group overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg">
              <div className="relative aspect-video bg-muted">
                {show.cover_url ? (
                  <img src={show.cover_url} alt={show.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Video className="h-10 w-10 text-muted-foreground/30" /></div>
                )}
                {show.status === "live" && (
                  <Badge className="absolute left-2 top-2 gap-1 bg-red-500 text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
                  </Badge>
                )}
                {(show.status === "live" || show.status === "recorded") && (
                  <button onClick={() => handleWatch(show)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                    <Play className="h-10 w-10 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={show.title}>{show.title}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {show.status === "scheduled" && (
                        <DropdownMenuItem onClick={() => handleGoLive(show)}><Play className="mr-2 h-4 w-4" />Démarrer maintenant</DropdownMenuItem>
                      )}
                      {show.status === "live" && (
                        <DropdownMenuItem onClick={() => handleEndLive(show.slug)}><Pause className="mr-2 h-4 w-4" />Arrêter la diffusion</DropdownMenuItem>
                      )}
                      {show.status === "live" && (
                        <DropdownMenuItem onClick={() => handleWatch(show)}><Eye className="mr-2 h-4 w-4" />Regarder le direct</DropdownMenuItem>
                      )}
                      {show.status === "recorded" && (
                        <DropdownMenuItem onClick={() => handleGoLive(show)}><Radio className="mr-2 h-4 w-4" />Rediffuser en direct</DropdownMenuItem>
                      )}
                      {show.status === "recorded" && (
                        <DropdownMenuItem onClick={() => handleWatch(show)}><Headphones className="mr-2 h-4 w-4" />Voir la rediffusion</DropdownMenuItem>
                      )}
                      {(show.status === "live" || show.status === "recorded") && (
                        <DropdownMenuItem onClick={() => handleShare(show)}><Share2 className="mr-2 h-4 w-4" />Partager le lien</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setComments(show)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(show)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(show.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {getStatusBadge(show.status)}
                  {show.scheduled_at && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                      {new Date(show.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  )}
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(show.total_views ?? 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
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

      {/* Lecteur : direct ou replay */}
      <Dialog open={!!watch} onOpenChange={(o) => !o && setWatch(null)}>
        <DialogContent className="max-w-3xl">
          {watch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {watch.show.status === "live" && (
                    <Badge className="bg-red-500 text-white">
                      <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-white" />EN DIRECT
                    </Badge>
                  )}
                  {watch.show.title}
                </DialogTitle>
                <DialogDescription>
                  {watch.show.status === "live"
                    ? "Lecture du flux en direct."
                    : "Lecture de la rediffusion."}
                </DialogDescription>
              </DialogHeader>

              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {!watch.detail ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : watch.detail.playback_hls_url ? (
                  <HlsPlayer
                    src={watch.detail.playback_hls_url}
                    poster={watch.detail.cover_url ?? undefined}
                    muted={watch.show.status === "live"}
                    emptyLabel={watch.show.status === "live"
                      ? "Le direct n'a pas encore démarré (aucune diffusion active)."
                      : "Enregistrement indisponible pour cette émission."}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <WifiOff className="h-8 w-8" />
                    {watch.show.status === "live"
                      ? "Le flux en direct n'est pas encore disponible."
                      : "Aucun enregistrement disponible pour cette émission."}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => handleShare(watch.show)}>
                  <Share2 className="mr-2 h-4 w-4" />Partager le lien
                </Button>
                <Button onClick={() => setWatch(null)}>Fermer</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Identifiants de diffusion (OBS) — affichés une seule fois au démarrage */}
      <Dialog open={!!liveCreds} onOpenChange={(o) => !o && setLiveCreds(null)}>
        <DialogContent className="sm:max-w-[560px]">
          {liveCreds && (
            <>
              <DialogHeader>
                <DialogTitle>Prêt à diffuser « {liveCreds.title} »</DialogTitle>
                <DialogDescription>
                  Copie ces deux infos dans OBS pour lancer ton direct.{" "}
                  <span className="font-semibold text-primary">Elles ne s&apos;affichent qu&apos;une seule fois.</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label>Serveur (RTMP)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={liveCreds.url} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(liveCreds.url)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Clé de stream</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={liveCreds.key} className="font-mono text-xs" />
                    <Button variant="outline" size="icon" onClick={() => copy(liveCreds.key)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                  Dans OBS, ouvre <span className="font-semibold text-primary">Paramètres</span> puis{" "}
                  <span className="font-semibold text-primary">Flux</span>. Choisis le service{" "}
                  <span className="font-semibold text-primary">Personnalisé</span>, colle le serveur et la clé
                  puis clique sur <span className="font-semibold text-primary">Démarrer le streaming</span>.
                  Ton direct apparaît dans <span className="font-semibold text-primary">Regarder le direct</span>,
                  la rediffusion une fois que tu as coupé.
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setLiveCreds(null)}>C&apos;est copié</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modération des commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cette émission."
          load={() => commentsApi.list("emissions", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("emissions", comments.slug, cid)}
        />
      )}
    </div>
  );
}
