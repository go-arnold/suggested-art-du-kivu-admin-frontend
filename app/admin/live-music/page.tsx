"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Music, Search, MoreHorizontal, Plus, Trash2, Loader2, Edit,
  Play, Pause, Eye, Share2, Copy, Radio, CalendarDays, Users,
  MessageSquare, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HlsPlayer } from "@/components/admin/hls-player";
import { ModerationDialog, commentToMod, chatToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import {
  liveMusicApi, artistsApi, commentsApi, chatApi, extractStreamCreds,
  type MusicLiveSession, type MusicLiveSessionWrite, type MusicSessionStatus,
  type MusicLiveSlot, type MusicLiveSlotWrite, type ArtistList,
} from "@/lib/api";
import { toast } from "sonner";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const S_LABELS: Record<MusicSessionStatus, string> = { live: "En direct", scheduled: "Programmée", ended: "Terminée" };
const S_BADGE: Record<MusicSessionStatus, string> = { live: "b-red", scheduled: "b-blue", ended: "b-gray" };

export default function LiveMusicPage() {
  const [tab, setTab] = useState("sessions");
  const [artists, setArtists] = useState<ArtistList[]>([]);

  // Sessions
  const [sessions, setSessions] = useState<MusicLiveSession[]>([]);
  const [loadingS, setLoadingS] = useState(true);
  const [search, setSearch] = useState("");
  const [sOpen, setSOpen] = useState(false);
  const [savingS, setSavingS] = useState(false);
  const [editS, setEditS] = useState<string | null>(null);
  const [sForm, setSForm] = useState<{ title: string; status: MusicSessionStatus; artists: number[]; cover: string }>({
    title: "", status: "scheduled", artists: [], cover: "",
  });
  const [watch, setWatch] = useState<MusicLiveSession | null>(null);
  const [liveCreds, setLiveCreds] = useState<{ title: string; url: string; key: string } | null>(null);
  const [comments, setComments] = useState<MusicLiveSession | null>(null);
  const [chatFor, setChatFor] = useState<MusicLiveSession | null>(null);

  // Programme
  const [slots, setSlots] = useState<MusicLiveSlot[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [pOpen, setPOpen] = useState(false);
  const [savingP, setSavingP] = useState(false);
  const [editP, setEditP] = useState<number | null>(null);
  const EMPTY_SLOT = { title: "", artist: "", day_of_week: "0", start_time: "", end_time: "", duration_minutes: "" };
  const [pForm, setPForm] = useState(EMPTY_SLOT);

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copié"); };

  useEffect(() => {
    artistsApi.list("page_size=200&ordering=name").then((d) => setArtists(d.results)).catch(() => {});
  }, []);

  const fetchSessions = useCallback(async () => {
    setLoadingS(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-created_at"); p.set("page_size", "60");
      if (search) p.set("search", search);
      const data = await liveMusicApi.sessions.list(p.toString());
      setSessions(data.results);
    } catch { toast.error("Erreur chargement sessions"); }
    finally { setLoadingS(false); }
  }, [search]);

  const fetchSlots = useCallback(async () => {
    setLoadingP(true);
    try {
      const data = await liveMusicApi.programme.list("page_size=100");
      setSlots(data.results);
    } catch { toast.error("Erreur chargement programme"); }
    finally { setLoadingP(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Pendant qu'on regarde un direct, ré-interroge la session toutes les 8 s
  // jusqu'à ce que le flux (playback_hls_url) apparaisse (délai MediaMTX ~15 s).
  useEffect(() => {
    if (watch?.status !== "live" || watch.playback_hls_url) return;
    const slug = watch.slug;
    const id = setInterval(async () => {
      try {
        const fresh = await liveMusicApi.sessions.get(slug);
        setWatch((w) => (w && w.slug === slug ? fresh : w));
      } catch { /* retentera */ }
    }, 8000);
    return () => clearInterval(id);
  }, [watch?.slug, watch?.status, watch?.playback_hls_url]);

  // ── Sessions handlers ──
  const openCreateS = () => { setEditS(null); setSForm({ title: "", status: "scheduled", artists: [], cover: "" }); setSOpen(true); };
  const openEditS = (s: MusicLiveSession) => { setEditS(s.slug); setSForm({ title: s.title ?? "", status: s.status, artists: [], cover: "" }); setSOpen(true); };
  const toggleArtist = (id: number) =>
    setSForm((f) => ({ ...f, artists: f.artists.includes(id) ? f.artists.filter((x) => x !== id) : [...f.artists, id] }));

  const submitSession = async () => {
    if (!sForm.title.trim()) { toast.error("Le titre est obligatoire"); return; }
    setSavingS(true);
    try {
      const payload: MusicLiveSessionWrite = {
        title: sForm.title.trim(), status: sForm.status,
        artists: sForm.artists.length ? sForm.artists : undefined,
        cover: sForm.cover || undefined,
      };
      if (editS) { await liveMusicApi.sessions.update(editS, payload); toast.success("Session mise à jour"); }
      else {
        const created = await liveMusicApi.sessions.create(payload);
        toast.success("Session créée");
        // Créée « En direct » → lance la diffusion pour obtenir les liens RTMP.
        if (sForm.status === "live") {
          try {
            const res = await liveMusicApi.sessions.goLive(created.slug);
            const creds = extractStreamCreds(res);
            if (creds) setLiveCreds({ title: created.title, ...creds });
            else toast.warning("Session en direct, mais identifiants RTMP non renvoyés (voir la console).");
          } catch { /* création OK ; go_live dispo via le menu */ }
        }
      }
      setSOpen(false); fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally { setSavingS(false); }
  };

  const goLive = async (s: MusicLiveSession) => {
    try {
      const res = await liveMusicApi.sessions.goLive(s.slug);
      toast.success("Session en direct");
      const creds = extractStreamCreds(res);
      if (creds) setLiveCreds({ title: s.title, ...creds });
      else toast.warning("Direct démarré, mais les identifiants RTMP n'ont pas été renvoyés (voir la console).");
      console.log("go_live response (live-music):", res);
      fetchSessions();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur au démarrage"); }
  };
  const endLive = async (slug: string) => {
    try { await liveMusicApi.sessions.endLive(slug); toast.success("Direct arrêté"); fetchSessions(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt"); }
  };
  const shareSession = async (s: MusicLiveSession) => {
    const link = s.playback_hls_url || "";
    if (!link) { toast.error("Aucun lien de lecture"); return; }
    await navigator.clipboard.writeText(link); toast.success("Lien copié");
  };
  const delSession = async (slug: string) => {
    if (!confirm("Supprimer cette session ?")) return;
    try { await liveMusicApi.sessions.delete(slug); toast.success("Session supprimée"); fetchSessions(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur suppression"); }
  };

  // ── Programme handlers ──
  const openCreateP = () => { setEditP(null); setPForm(EMPTY_SLOT); setPOpen(true); };
  const openEditP = (s: MusicLiveSlot) => {
    setEditP(s.id);
    const a = artists.find((x) => x.name === s.artist_name);
    setPForm({
      title: s.title ?? "", artist: a ? String(a.id) : "",
      day_of_week: String(s.day_of_week ?? 0),
      start_time: (s.start_time ?? "").slice(0, 5), end_time: (s.end_time ?? "").slice(0, 5),
      duration_minutes: s.duration_minutes ? String(s.duration_minutes) : "",
    });
    setPOpen(true);
  };
  const submitSlot = async () => {
    if (!pForm.title.trim()) { toast.error("Le titre est obligatoire"); return; }
    if (!pForm.start_time || !pForm.end_time) { toast.error("Heures de début et fin obligatoires"); return; }
    setSavingP(true);
    try {
      const payload: MusicLiveSlotWrite = {
        title: pForm.title.trim(), start_time: pForm.start_time, end_time: pForm.end_time,
        artist: pForm.artist ? Number(pForm.artist) : null,
        day_of_week: Number(pForm.day_of_week),
        duration_minutes: pForm.duration_minutes ? Number(pForm.duration_minutes) : undefined,
      };
      if (editP) { await liveMusicApi.programme.update(editP, payload); toast.success("Créneau mis à jour"); }
      else { await liveMusicApi.programme.create(payload); toast.success("Créneau créé"); }
      setPOpen(false); fetchSlots();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally { setSavingP(false); }
  };
  const delSlot = async (id: number) => {
    if (!confirm("Supprimer ce créneau ?")) return;
    try { await liveMusicApi.programme.delete(id); toast.success("Créneau supprimé"); fetchSlots(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur suppression"); }
  };

  const liveCount = sessions.filter((s) => s.status === "live").length;

  return (
    <section className="view">
      <div className="page-h">
        <div>
          <h1>Live Music</h1>
          <p>Sessions musicales en direct et grille de programme</p>
        </div>
        <div className="h-actions">
          {tab === "sessions"
            ? <button className="btn btn-red" onClick={openCreateS}><Plus strokeWidth={2.2} />Nouvelle session</button>
            : <button className="btn btn-red" onClick={openCreateP}><Plus strokeWidth={2.2} />Nouveau créneau</button>}
        </div>
      </div>

      <div className="kpis">
        {[
          { label: "Sessions", value: sessions.length, icon: Music, bg: "var(--red-soft)", fg: "var(--red)" },
          { label: "En direct", value: liveCount, icon: Radio, bg: "var(--red-soft)", fg: "var(--red)" },
          { label: "Créneaux", value: slots.length, icon: CalendarDays, bg: "var(--blue-soft)", fg: "var(--blue)" },
        ].map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: s.bg, color: s.fg }}><s.icon /></div>
              <div><div className="kpi-lb">{s.label}</div></div>
            </div>
            <div className="kpi-v">{s.value}</div>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="programme">Programme</TabsTrigger>
        </TabsList>

        {/* Sessions */}
        <TabsContent value="sessions" className="mt-6 space-y-4">
          <div className="toolbar">
            <div className="tb-search">
              <Search />
              <input placeholder="Rechercher une session…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loadingS ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <div className="ph">
              <div className="ph-ic"><Music /></div>
              <h3>Aucune session</h3>
              <p>Créez une session musicale live pour commencer à diffuser.</p>
              <button className="btn btn-red" onClick={openCreateS}><Plus strokeWidth={2.2} />Nouvelle session</button>
            </div>
          ) : (
            <div className="m-grid">
              {sessions.map((s) => (
                <div key={s.id} className="m-card">
                  <div className="m-cover">
                    {s.status === "live" && <span className="m-tag m-live"><span className="pulse" />LIVE</span>}
                    {s.status === "scheduled" && <span className="m-tag m-sched">Programmée</span>}
                    {(s.status === "live" || (s.status === "ended" && s.playback_hls_url)) && (
                      <button className="m-play" onClick={() => setWatch(s)}>
                        <div className="pb"><Play /></div>
                      </button>
                    )}
                  </div>
                  <div className="m-body">
                    <div className="m-title" title={s.title}>{s.title}</div>
                    <div className="m-series">{s.artist_names || S_LABELS[s.status]}</div>
                    <div className="m-meta">
                      <span className={`badge ${S_BADGE[s.status]}`}><span className="bd" />{S_LABELS[s.status]}</span>
                      {s.online_followers && <span className="mi"><Users />{s.online_followers}</span>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="row-act"><MoreHorizontal /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {s.status === "live" ? (
                            <>
                              <DropdownMenuItem onClick={() => setWatch(s)}><Eye className="mr-2 h-4 w-4" />Regarder</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => endLive(s.slug)}><Pause className="mr-2 h-4 w-4" />Arrêter le direct</DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => goLive(s)}><Play className="mr-2 h-4 w-4" />Passer en direct</DropdownMenuItem>
                          )}
                          {s.status === "ended" && s.playback_hls_url && (
                            <DropdownMenuItem onClick={() => setWatch(s)}><Eye className="mr-2 h-4 w-4" />Voir la rediffusion</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => shareSession(s)}><Share2 className="mr-2 h-4 w-4" />Partager</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setComments(s)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                          {s.status === "live" && <DropdownMenuItem onClick={() => setChatFor(s)}><MessagesSquare className="mr-2 h-4 w-4" />Chat du direct</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => openEditS(s)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => delSession(s.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Programme */}
        <TabsContent value="programme" className="mt-6 space-y-4">
          {loadingP ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : slots.length === 0 ? (
            <div className="ph">
              <div className="ph-ic"><CalendarDays /></div>
              <h3>Aucun créneau</h3>
              <p>Ajoutez un créneau à la grille de programme.</p>
              <button className="btn btn-red" onClick={openCreateP}><Plus strokeWidth={2.2} />Nouveau créneau</button>
            </div>
          ) : (
            <div className="panel">
              <div className="sched">
                {slots.map((s) => (
                  <div className="sched-i" key={s.id}>
                    <span className="sched-t">{(s.start_time ?? "").slice(0, 5)}–{(s.end_time ?? "").slice(0, 5)}</span>
                    <div className="sched-m">
                      <div className="t">{s.title}</div>
                      <div className="s">
                        {s.day_name ?? DAYS[s.day_of_week] ?? ""}
                        {s.artist_name ? ` · ${s.artist_name}` : ""}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="row-act"><MoreHorizontal /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditP(s)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => delSlot(s.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog session */}
      <Dialog open={sOpen} onOpenChange={(o) => { if (!savingS) setSOpen(o); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editS ? "Modifier la session" : "Nouvelle session"}</DialogTitle>
            <DialogDescription>Créez une session musicale live. Lancez ensuite la diffusion via « Passer en direct ».</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={sForm.title} onChange={(e) => setSForm({ ...sForm, title: e.target.value })} placeholder="Ex: Session acoustique" />
            </div>
            <MediaUpload
              label="Couverture" context="emission_cover" aspect="video"
              value={sForm.cover || null} onChange={(url) => setSForm({ ...sForm, cover: url ?? "" })}
            />
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={sForm.status} onValueChange={(v) => setSForm({ ...sForm, status: v as MusicSessionStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programmée</SelectItem>
                  <SelectItem value="live">En direct</SelectItem>
                  <SelectItem value="ended">Terminée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Artistes</Label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                {artists.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun artiste.</p>}
                {artists.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                    <input type="checkbox" checked={sForm.artists.includes(a.id)} onChange={() => toggleArtist(a.id)} />
                    {a.name}
                  </label>
                ))}
              </div>
              {sForm.artists.length > 0 && <p className="text-xs text-muted-foreground">{sForm.artists.length} sélectionné(s)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingS} onClick={() => setSOpen(false)}>Annuler</Button>
            <Button disabled={savingS} onClick={submitSession}>{savingS && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editS ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog créneau */}
      <Dialog open={pOpen} onOpenChange={(o) => { if (!savingP) setPOpen(o); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editP ? "Modifier le créneau" : "Nouveau créneau"}</DialogTitle>
            <DialogDescription>Ajoutez un créneau à la grille de programme.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} placeholder="Titre du créneau" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Artiste</Label>
                <Select value={pForm.artist || "none"} onValueChange={(v) => setPForm({ ...pForm, artist: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {artists.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Select value={pForm.day_of_week} onValueChange={(v) => setPForm({ ...pForm, day_of_week: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Début *</Label>
                <Input type="time" value={pForm.start_time} onChange={(e) => setPForm({ ...pForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fin *</Label>
                <Input type="time" value={pForm.end_time} onChange={(e) => setPForm({ ...pForm, end_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Durée (min)</Label>
                <Input type="number" min={0} value={pForm.duration_minutes} onChange={(e) => setPForm({ ...pForm, duration_minutes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingP} onClick={() => setPOpen(false)}>Annuler</Button>
            <Button disabled={savingP} onClick={submitSlot}>{savingP && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editP ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lecteur */}
      <Dialog open={!!watch} onOpenChange={(o) => !o && setWatch(null)}>
        <DialogContent className="max-w-3xl">
          {watch && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {watch.status === "live" && <span className="badge b-red"><span className="bd" />LIVE</span>}{watch.title}
                </DialogTitle>
                <DialogDescription>{watch.status === "live" ? "Diffusion en direct." : "Lecture de la rediffusion."}</DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {watch.playback_hls_url ? (
                  <HlsPlayer src={watch.playback_hls_url} muted={watch.status === "live"} emptyLabel={watch.status === "live" ? "Le direct n'a pas encore démarré." : "Rediffusion indisponible."} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune source vidéo.</div>
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

      {/* Modération : commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cette session."
          load={() => commentsApi.list("live_music/sessions", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("live_music/sessions", comments.slug, cid)}
        />
      )}

      {/* Modération : chat du direct */}
      {chatFor && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setChatFor(null)}
          title={`Chat — ${chatFor.title}`}
          description="Messages du chat en direct. Supprimez les messages inappropriés."
          emptyLabel="Aucun message pour le moment."
          load={() => chatApi.list("live_music/sessions", chatFor.slug).then((r) => r.results.map(chatToMod))}
          remove={(mid) => chatApi.remove("live_music/sessions", chatFor.slug, mid)}
        />
      )}
    </section>
  );
}
