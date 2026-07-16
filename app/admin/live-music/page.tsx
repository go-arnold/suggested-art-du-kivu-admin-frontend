"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Music, Search, MoreHorizontal, Plus, Trash2, Loader2, Edit,
  Play, Pause, Eye, Share2, Copy, Radio, Clock, CalendarDays, Users,
  MessageSquare, MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HlsPlayer } from "@/components/admin/hls-player";
import { ModerationDialog, commentToMod, chatToMod } from "@/components/admin/moderation-dialog";
import { MediaUpload } from "@/components/admin/media-upload";
import {
  liveMusicApi, artistsApi, commentsApi, chatApi,
  type MusicLiveSession, type MusicLiveSessionWrite, type MusicSessionStatus,
  type MusicLiveSlot, type MusicLiveSlotWrite, type ArtistList,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const S_LABELS: Record<MusicSessionStatus, string> = { live: "En direct", scheduled: "Programmée", ended: "Terminée" };
const S_COLORS: Record<MusicSessionStatus, string> = {
  live: "bg-red-500 text-white", scheduled: "bg-blue-100 text-blue-700", ended: "bg-muted text-muted-foreground",
};

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

  // ── Sessions handlers ──
  const openCreateS = () => { setEditS(null); setSForm({ title: "", status: "scheduled", artists: [], cover: "" }); setSOpen(true); };
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
      else { await liveMusicApi.sessions.create(payload); toast.success("Session créée"); }
      setSOpen(false); fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally { setSavingS(false); }
  };

  const goLive = async (s: MusicLiveSession) => {
    try {
      const res = await liveMusicApi.sessions.goLive(s.slug);
      toast.success("Session en direct");
      if (res?.cf_rtmps_url && res?.cf_rtmps_key) setLiveCreds({ title: s.title, url: res.cf_rtmps_url, key: res.cf_rtmps_key });
      fetchSessions();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur au démarrage"); }
  };
  const endLive = async (slug: string) => {
    try { await liveMusicApi.sessions.endLive(slug); toast.success("Direct arrêté"); fetchSessions(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur à l'arrêt"); }
  };
  const shareSession = async (s: MusicLiveSession) => {
    const link = s.cf_playback_hls_url || "";
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Live Music</h1>
          <p className="mt-1 text-muted-foreground">Sessions musicales en direct et grille de programme</p>
        </div>
        {tab === "sessions"
          ? <Button onClick={openCreateS} className="gap-2"><Plus className="h-4 w-4" />Nouvelle session</Button>
          : <Button onClick={openCreateP} className="gap-2"><Plus className="h-4 w-4" />Nouveau créneau</Button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Sessions", value: sessions.length, icon: Music, color: "text-primary" },
          { label: "En direct", value: liveCount, icon: Radio, color: "text-red-500" },
          { label: "Créneaux", value: slots.length, icon: CalendarDays, color: "text-info" },
        ].map((s) => (
          <Card key={s.label} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold font-mono">{s.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="programme">Programme</TabsTrigger>
        </TabsList>

        {/* Sessions */}
        <TabsContent value="sessions" className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Rechercher une session…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {loadingS ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : sessions.length === 0 ? (
            <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12">
              <Music className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-sm text-muted-foreground">Aucune session.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {sessions.map((s) => (
                <Card key={s.id} className="card-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Music className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px]", S_COLORS[s.status])}>{S_LABELS[s.status]}</Badge>
                        {s.online_followers && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{s.online_followers}</span>}
                      </div>
                      <h3 className="mt-1 truncate font-semibold text-foreground">{s.title}</h3>
                      {s.artist_names && <p className="truncate text-xs text-muted-foreground">{s.artist_names}</p>}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
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
                        {s.status === "ended" && s.cf_playback_hls_url && (
                          <DropdownMenuItem onClick={() => setWatch(s)}><Eye className="mr-2 h-4 w-4" />Voir la rediffusion</DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => shareSession(s)}><Share2 className="mr-2 h-4 w-4" />Partager</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setComments(s)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                        {s.status === "live" && <DropdownMenuItem onClick={() => setChatFor(s)}><MessagesSquare className="mr-2 h-4 w-4" />Chat du direct</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => delSession(s.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Programme */}
        <TabsContent value="programme" className="mt-6 space-y-4">
          {loadingP ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : slots.length === 0 ? (
            <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-sm text-muted-foreground">Aucun créneau.</p>
            </CardContent></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {slots.map((s) => (
                <Card key={s.id} className="card-shadow">
                  <CardContent className="flex items-start justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground">{s.day_name ?? DAYS[s.day_of_week] ?? ""}</span>
                      <h3 className="truncate font-semibold text-foreground">{s.title}</h3>
                      {s.artist_name && <p className="truncate text-xs text-muted-foreground">{s.artist_name}</p>}
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{(s.start_time ?? "").slice(0, 5)}–{(s.end_time ?? "").slice(0, 5)}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditP(s)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => delSlot(s.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
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
                  {watch.status === "live" && <Badge className="bg-red-500 text-white">LIVE</Badge>}{watch.title}
                </DialogTitle>
                <DialogDescription>{watch.status === "live" ? "Diffusion en direct." : "Lecture de la rediffusion."}</DialogDescription>
              </DialogHeader>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
                {watch.cf_playback_hls_url ? (
                  <HlsPlayer src={watch.cf_playback_hls_url} emptyLabel={watch.status === "live" ? "Le direct n'a pas encore démarré." : "Rediffusion indisponible."} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune source vidéo.</div>
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
    </div>
  );
}
