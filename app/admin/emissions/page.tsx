"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio, Calendar, Eye, MoreHorizontal, Plus, Search, Filter,
  WifiOff, Loader2, Play, Pause, Edit, Share2, Headphones, Copy,
  MessageSquare, Trash2,
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
import { emissionsApi, commentsApi, extractStreamCreds, type EmissionList, type EmissionWrite, type EmissionDetail, type EmissionStatus } from "@/lib/api";
import { HlsPlayer } from "@/components/admin/hls-player";
import { useLivePlayer } from "@/components/admin/live-player";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────────────────────────

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
  const { startLive, stopLive } = useLivePlayer();
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
        const created = await emissionsApi.create(payload);
        toast.success("Émission enregistrée");
        // Créée « En direct » → on lance la diffusion pour obtenir les liens RTMP.
        if (form.status === "live") {
          try {
            const res = await emissionsApi.goLive(created.slug);
            const creds = extractStreamCreds(res);
            if (creds) setLiveCreds({ title: created.title, ...creds });
            else toast.warning("Émission en direct, mais identifiants RTMP non renvoyés (voir la console).");
            console.log("go_live response (emissions create):", res);
            // Barre de lecture live globale.
            let hlsUrl: string | null = null;
            try { hlsUrl = (await emissionsApi.get(created.slug)).playback_hls_url ?? null; } catch { /* flux pas encore prêt */ }
            startLive({ title: created.title, hlsUrl });
          } catch { /* la création a réussi ; le go_live reste dispo via le menu */ }
        }
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

  // Démarrer / arrêter une diffusion via les actions dédiées (MediaMTX).
  const handleGoLive = async (show: EmissionList) => {
    try {
      const res = await emissionsApi.goLive(show.slug);
      const creds = extractStreamCreds(res);
      if (creds) setLiveCreds({ title: show.title, ...creds });
      else toast.warning("Direct démarré, mais le backend n'a pas renvoyé les identifiants RTMP (voir la console / la réponse go_live).");
      // Diagnostic : trace la réponse pour identifier les champs si besoin.
      console.log("go_live response (emissions):", res);
      // Barre de lecture live globale (avec le flux HLS dès qu'il est disponible).
      let hlsUrl: string | null = null;
      try { hlsUrl = (await emissionsApi.get(show.slug)).playback_hls_url ?? null; } catch { /* flux pas encore prêt */ }
      startLive({ title: show.title, hlsUrl });
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
      stopLive();
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
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Émissions Live</h1>
          <p>Gérez vos diffusions en direct et programmées</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button className="btn btn-red" onClick={openCreate}>
              <Plus strokeWidth={2.2} />Nouvelle Émission
            </button>
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
      <div className="kpis">
        {[
          { label: "En Direct",        value: liveNow.length,          icon: Radio,    bg: "var(--red-soft)",     fg: "var(--red)"     },
          { label: "Programmées",      value: scheduled.length,        icon: Calendar, bg: "var(--blue-soft)",    fg: "var(--blue)"    },
          { label: "Spectateurs live", value: liveNow.reduce((a, s) => a + (s.viewer_count ?? 0), 0).toLocaleString(), icon: Eye, bg: "var(--red-soft)", fg: "var(--red)" },
          { label: "Total vues",       value: totalViews.toLocaleString(), icon: Eye, bg: "var(--emerald-soft)", fg: "var(--emerald)" },
        ].map(({ label, value, icon: Icon, bg, fg }) => (
          <div className="kpi" key={label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: bg, color: fg }}><Icon /></div>
              <div><div className="kpi-lb">{label}</div></div>
            </div>
            <div className="kpi-v">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher une émission..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="filter">
            <Filter /><SelectValue placeholder="Statut" />
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
        <div className="m-grid">
          {shows.map((show) => (
            <div key={show.id} className="m-card">
              <div className="m-cover">
                {show.cover_url && (
                  <img src={show.cover_url} alt={show.title} loading="lazy" decoding="async" />
                )}
                {show.status === "live" && <span className="m-tag m-live"><span className="pulse" />LIVE</span>}
                {show.status === "scheduled" && <span className="m-tag m-sched">Programmé</span>}
                {(show.status === "live" || show.status === "recorded") && (
                  <button className="m-play" onClick={() => handleWatch(show)}>
                    <div className="pb"><Play /></div>
                  </button>
                )}
              </div>
              <div className="m-body">
                <div className="m-title" title={show.title}>{show.title}</div>
                <div className="m-series">{formatDuration(show.duration_minutes ?? 0)}</div>
                <div className="m-meta">
                  {show.scheduled_at && (
                    <span className="mi"><Calendar />
                      {new Date(show.scheduled_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  )}
                  <span className="mi"><Eye />{(show.total_views ?? 0).toLocaleString()}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="row-act"><MoreHorizontal /></button>
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
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && shows.length === 0 && (
        <div className="ph">
          <div className="ph-ic"><Radio /></div>
          <h3>Aucune émission trouvée</h3>
          <p>Modifiez vos filtres ou créez une nouvelle émission.</p>
          <button className="btn btn-red" onClick={() => setDialogOpen(true)}>
            <Plus strokeWidth={2.2} />Créer une émission
          </button>
        </div>
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
    </section>
  );
}
