"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio, Search, Filter, MoreHorizontal, Plus, Trash2, Loader2, Edit,
  Play, Pause, Headphones, Copy, Mic2, Users, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const STATUS_LABELS: Record<RadioStatus, string> = { live: "En direct", upcoming: "À venir", ended: "Terminé" };
const STATUS_BADGE: Record<RadioStatus, string> = { live: "b-red", upcoming: "b-blue", ended: "b-gray" };

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
      else toast.warning("Antenne démarrée, mais les identifiants RTMP n'ont pas été renvoyés (voir la console).");
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
    <section className="view">
      {/* En-tête */}
      <div className="page-h">
        <div>
          <h1>Radio</h1>
          <p>Grille des programmes et passage à l&apos;antenne</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-ghost" onClick={() => setChatOpen(true)}><MessagesSquare />Chat de l&apos;antenne</button>
          <button className="btn btn-red" onClick={openCreate}><Plus strokeWidth={2.2} />Nouveau programme</button>
        </div>
      </div>

      {/* Stats */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Radio /></div>
            <div><div className="kpi-lb">Programmes</div></div>
          </div>
          <div className="kpi-v">{loading ? "—" : items.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Mic2 /></div>
            <div><div className="kpi-lb">En direct</div></div>
          </div>
          <div className="kpi-v">{loading ? "—" : liveCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><Users /></div>
            <div><div className="kpi-lb">Auditeurs</div></div>
          </div>
          <div className="kpi-v">{loading ? "—" : listeners}</div>
        </div>
      </div>

      {/* Barre d'outils */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher un programme…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="filter"><Filter /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="live">En direct</SelectItem>
            <SelectItem value="upcoming">À venir</SelectItem>
            <SelectItem value="ended">Terminé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="ph">
          <div className="ph-ic"><Radio /></div>
          <h3>Aucun programme</h3>
          <p>Ajoutez un premier programme à la grille radio.</p>
          <button className="btn btn-red" onClick={openCreate}><Plus strokeWidth={2.2} />Nouveau programme</button>
        </div>
      ) : (
        <div className="panel">
          <div className="panel-h">
            <div><h3>Grille des programmes</h3><div className="sub">Créneaux et passage à l&apos;antenne</div></div>
          </div>
          <div className="sched">
            {items.map((r) => (
              <div className={`sched-i${r.status === "live" ? " now" : ""}`} key={r.id}>
                <div className="sched-t">{(r.start_time ?? "").slice(0, 5)}–{(r.end_time ?? "").slice(0, 5)}</div>
                <div className="sched-m">
                  <div className="t">{r.title}</div>
                  <div className="s">
                    {r.day_name ?? DAYS[r.day_of_week] ?? ""}
                    {r.presenter ? ` · ${r.presenter}` : ""}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[r.status]}`}>
                  {r.status === "live" && <span className="bd" />}{STATUS_LABELS[r.status]}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="row-act"><MoreHorizontal /></button>
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
            ))}
          </div>
        </div>
      )}

      {/* Création / édition */}
      <Dialog open={open} onOpenChange={(o) => { if (!saving) { setOpen(o); if (!o) { setForm(EMPTY); setEditingId(null); } } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le programme" : "Nouveau programme"}</DialogTitle>
            <DialogDescription>Définissez le créneau et l&apos;animateur de l&apos;émission radio.</DialogDescription>
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
                <DialogDescription>Diffusion en direct de l&apos;antenne radio.</DialogDescription>
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

      {/* Identifiants RTMP */}
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
    </section>
  );
}
