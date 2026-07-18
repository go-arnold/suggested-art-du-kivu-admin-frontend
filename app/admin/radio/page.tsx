"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio, Search, Filter, MoreHorizontal, Plus, Trash2, Loader2, Edit,
  Play, Pause, Headphones, Copy, Clock, Mic2, Users, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { HlsPlayer } from "@/components/admin/hls-player";
import { ModerationDialog, chatToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import {
  radioApi, radioChatApi, extractStreamCreds, type RadioProgram, type RadioProgramWrite, type RadioStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const STATUS_LABELS: Record<RadioStatus, string> = { live: "En direct", upcoming: "À venir", ended: "Terminé" };
const STATUS_COLORS: Record<RadioStatus, string> = {
  live: "bg-red-500 text-white", upcoming: "bg-blue-100 text-blue-700", ended: "bg-muted text-muted-foreground",
};

const EMPTY = {
  title: "", presenter: "", description: "",
  day_of_week: "0", start_time: "", end_time: "",
  status: "upcoming" as RadioStatus, stream_url: "", cover: "",
};

export default function RadioPage() {
  const [items, setItems] = useState<RadioProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [watch, setWatch] = useState<RadioProgram | null>(null);
  const [liveCreds, setLiveCreds] = useState<{ title: string; url: string; key: string } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("page_size", "100");
      if (search) p.set("search", search);
      if (status !== "all") p.set("status", status);
      const data = await radioApi.list(p.toString());
      setItems(data.results);
    } catch {
      toast.error("Erreur lors du chargement des programmes");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { fetch(); }, [fetch]);

  // Pendant l'écoute d'un direct, ré-interroge le programme toutes les 8 s
  // jusqu'à ce que le flux (playback_hls_url) apparaisse (délai MediaMTX ~15 s).
  useEffect(() => {
    if (watch?.status !== "live" || watch.playback_hls_url) return;
    const rid = watch.id;
    const t = setInterval(async () => {
      try {
        const fresh = await radioApi.get(rid);
        setWatch((w) => (w && w.id === rid ? fresh : w));
      } catch { /* retentera */ }
    }, 8000);
    return () => clearInterval(t);
  }, [watch?.id, watch?.status, watch?.playback_hls_url]);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copié"); };

  const openCreate = () => { setEditingId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r: RadioProgram) => {
    setEditingId(r.id);
    setForm({
      title: r.title ?? "", presenter: r.presenter ?? "", description: r.description ?? "",
      day_of_week: String(r.day_of_week ?? 0),
      start_time: (r.start_time ?? "").slice(0, 5), end_time: (r.end_time ?? "").slice(0, 5),
      status: r.status ?? "upcoming", stream_url: r.stream_url ?? "",
      cover: r.cover_url ?? "",
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim())  { toast.error("Le titre est obligatoire"); return; }
    if (!form.start_time || !form.end_time) { toast.error("Les heures de début et de fin sont obligatoires"); return; }
    setSaving(true);
    try {
      const payload: RadioProgramWrite = {
        title: form.title.trim(),
        start_time: form.start_time,
        end_time: form.end_time,
        presenter: form.presenter.trim() || undefined,
        description: form.description.trim() || undefined,
        day_of_week: Number(form.day_of_week),
        status: form.status,
        stream_url: form.stream_url.trim() || undefined,
        cover: form.cover || undefined,
      };
      if (editingId) {
        await radioApi.update(editingId, payload);
        toast.success("Programme mis à jour");
      } else {
        const created = await radioApi.create(payload);
        toast.success("Programme créé");
        // Créé « En direct » → lance le passage à l'antenne pour obtenir les liens RTMP.
        if (form.status === "live") {
          try {
            const res = await radioApi.goLive(created.id);
            const creds = extractStreamCreds(res);
            if (creds) setLiveCreds({ title: created.title, ...creds });
            else toast.warning("Antenne démarrée, mais identifiants RTMP non renvoyés (voir la console).");
          } catch { /* création OK ; go_live dispo via le menu */ }
        }
      }
      setOpen(false); setForm(EMPTY); setEditingId(null);
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleGoLive = async (r: RadioProgram) => {
    try {
      const res = await radioApi.goLive(r.id);
      toast.success("Passage à l'antenne démarré");
      const creds = extractStreamCreds(res);
      if (creds) setLiveCreds({ title: r.title, ...creds });
      else toast.warning("Antenne démarrée, mais les identifiants RTMPS n'ont pas été renvoyés (voir la console).");
      console.log("go_live response (radio):", res);
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur au démarrage");
    }
  };

  const handleEndLive = async (id: number) => {
    try {
      await radioApi.endLive(id);
      toast.success("Antenne arrêtée");
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce programme ?")) return;
    try {
      await radioApi.delete(id);
      toast.success("Programme supprimé");
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const liveCount = items.filter((r) => r.status === "live").length;
  const listeners = items.reduce((a, r) => a + (r.listener_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Radio</h1>
          <p className="mt-1 text-muted-foreground">Grille des programmes et passage à l'antenne</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setChatOpen(true)} className="gap-2"><MessagesSquare className="h-4 w-4" />Chat de l&apos;antenne</Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouveau programme</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Programmes", value: items.length, icon: Radio, color: "text-primary" },
          { label: "En direct", value: liveCount, icon: Mic2, color: "text-red-500" },
          { label: "Auditeurs", value: listeners, icon: Users, color: "text-info" },
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

      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un programme…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="live">En direct</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="ended">Terminé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12">
          <Radio className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucun programme.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((r) => (
            <div key={r.id} className="group overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg">
              <div className="relative aspect-video bg-muted">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Radio className="h-10 w-10 text-muted-foreground/30" /></div>
                )}
                {r.status === "live" && (
                  <Badge className="absolute left-2 top-2 gap-1 bg-red-500 text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />LIVE
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium" title={r.title}>{r.title}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {r.status === "live" ? (
                        <>
                          <DropdownMenuItem onClick={() => setWatch(r)}><Headphones className="mr-2 h-4 w-4" />Écouter le direct</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEndLive(r.id)}><Pause className="mr-2 h-4 w-4" />Arrêter l&apos;antenne</DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleGoLive(r)}><Play className="mr-2 h-4 w-4" />Passer à l&apos;antenne</DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className={cn("text-[10px]", STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                  <span>{r.day_name ?? DAYS[r.day_of_week] ?? ""}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{(r.start_time ?? "").slice(0, 5)}–{(r.end_time ?? "").slice(0, 5)}</span>
                  {r.presenter && <span className="flex items-center gap-1"><Mic2 className="h-3 w-3" />{r.presenter}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Création / édition */}
      <Dialog open={open} onOpenChange={(o) => { if (!saving) { setOpen(o); if (!o) { setForm(EMPTY); setEditingId(null); } } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le programme" : "Nouveau programme"}</DialogTitle>
            <DialogDescription>Définissez le créneau et l'animateur de l'émission radio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Ex: Matinale du Kivu" />
            </div>
            <MediaUpload
              label="Couverture" context="radio_cover" aspect="video"
              value={form.cover || null} onChange={(url) => setField("cover", url ?? "")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Animateur</Label>
                <Input value={form.presenter} onChange={(e) => setField("presenter", e.target.value)} placeholder="Nom de l'animateur" />
              </div>
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Select value={form.day_of_week} onValueChange={(v) => setField("day_of_week", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Début *</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setField("start_time", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fin *</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setField("end_time", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v as RadioStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">À venir</SelectItem>
                    <SelectItem value="live">En direct</SelectItem>
                    <SelectItem value="ended">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL de stream (optionnel)</Label>
              <Input type="url" value={form.stream_url} onChange={(e) => setField("stream_url", e.target.value)} placeholder="https://…" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Description du programme…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Écoute du direct */}
      <Dialog open={!!watch} onOpenChange={(o) => !o && setWatch(null)}>
        <DialogContent className="max-w-2xl">
          {watch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Badge className="bg-red-500 text-white">LIVE</Badge>{watch.title}</DialogTitle>
                <DialogDescription>Diffusion en direct de l'antenne radio.</DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {watch.playback_hls_url ? (
                  <HlsPlayer src={watch.playback_hls_url} muted={watch.status === "live"} emptyLabel="Le direct n'a pas encore démarré." />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Flux indisponible.</div>
                )}
              </div>
              <DialogFooter><Button onClick={() => setWatch(null)}>Fermer</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Identifiants RTMPS */}
      <Dialog open={!!liveCreds} onOpenChange={(o) => !o && setLiveCreds(null)}>
        <DialogContent className="sm:max-w-[560px]">
          {liveCreds && (
            <>
              <DialogHeader>
                <DialogTitle>Prêt à diffuser « {liveCreds.title} »</DialogTitle>
                <DialogDescription>Copie ces deux infos dans OBS pour lancer ton direct. <span className="font-semibold text-primary">Elles ne s&apos;affichent qu&apos;une seule fois.</span></DialogDescription>
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
              <DialogFooter><Button onClick={() => setLiveCreds(null)}>C&apos;est copié</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modération : chat de l'antenne (global) */}
      <ModerationDialog
        open={chatOpen} onOpenChange={setChatOpen}
        title="Chat de l'antenne"
        description="Messages du chat radio. Supprimez les messages inappropriés."
        emptyLabel="Aucun message pour le moment."
        load={() => radioChatApi.list().then((r) => r.results.map(chatToMod))}
        remove={(mid) => radioChatApi.remove(mid)}
      />
    </div>
  );
}
