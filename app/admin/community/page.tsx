"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Loader2, MoreHorizontal, Heart, MessageCircle,
  BarChart3, Trophy, X, MessageSquare, Pin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  communityApi, commentsApi,
  type CommunityPost, type PostType, type Poll, type Challenge, type MediaItem,
} from "@/lib/api";
import { MediaUpload } from "@/components/admin/media-upload";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { toast } from "sonner";

const POST_LABELS: Record<PostType, string> = { talent: "Talent", art: "Art", news: "Actu", challenge_response: "Défi" };
const POST_BADGE: Record<PostType, string> = { talent: "b-red", art: "b-purple", news: "b-blue", challenge_response: "b-gold" };

// Contexte d'upload Cloudinary selon le type de média communauté.
const MEDIA_CTX: Record<MediaItem["type"], { context: string; accept: string }> = {
  song: { context: "community_song", accept: "audio/*" },
  video: { context: "community_video", accept: "video/*" },
  image: { context: "community_image", accept: "image/*" },
};

const AV_COLORS = ["var(--red)", "var(--blue)", "var(--gold)", "var(--emerald)", "var(--purple)", "var(--ink)"];
const initials = (name?: string | null) =>
  ((name ?? "?").trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?");

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export default function CommunityPage() {
  const [tab, setTab] = useState("posts");

  // Posts
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPo, setLoadingPo] = useState(true);
  const [poOpen, setPoOpen] = useState(false);
  const [savingPo, setSavingPo] = useState(false);
  const [poForm, setPoForm] = useState<{ title: string; content: string; post_type: PostType; mediaType: MediaItem["type"]; mediaUrl: string }>({ title: "", content: "", post_type: "news", mediaType: "image", mediaUrl: "" });
  const [comments, setComments] = useState<CommunityPost | null>(null);

  // Polls
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loadingPl, setLoadingPl] = useState(true);
  const [plOpen, setPlOpen] = useState(false);
  const [savingPl, setSavingPl] = useState(false);
  const [plForm, setPlForm] = useState<{ question: string; options: string[]; expires_at: string; is_active: boolean }>({
    question: "", options: ["", ""], expires_at: "", is_active: true,
  });

  // Challenges
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingCh, setLoadingCh] = useState(true);
  const [chOpen, setChOpen] = useState(false);
  const [savingCh, setSavingCh] = useState(false);
  const [chForm, setChForm] = useState({ title: "", description: "", prize: "", deadline: "", is_active: true });

  // Résultat épinglé d'un défi (POST .../publish_result/, réservé au staff).
  const [resultFor, setResultFor] = useState<Challenge | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [resultForm, setResultForm] = useState<{ title: string; content: string; mediaType: MediaItem["type"]; mediaUrl: string }>({
    title: "", content: "", mediaType: "image", mediaUrl: "",
  });

  const fetchPosts = useCallback(async () => {
    setLoadingPo(true);
    try { const d = await communityApi.posts.list("ordering=-created_at&page_size=60"); setPosts(d.results); }
    catch { toast.error("Erreur chargement posts"); } finally { setLoadingPo(false); }
  }, []);
  const fetchPolls = useCallback(async () => {
    setLoadingPl(true);
    try { const d = await communityApi.polls.list("page_size=60"); setPolls(d.results); }
    catch { toast.error("Erreur chargement sondages"); } finally { setLoadingPl(false); }
  }, []);
  const fetchChallenges = useCallback(async () => {
    setLoadingCh(true);
    try { const d = await communityApi.challenges.list("page_size=60"); setChallenges(d.results); }
    catch { toast.error("Erreur chargement défis"); } finally { setLoadingCh(false); }
  }, []);

  useEffect(() => { fetchPosts(); fetchPolls(); fetchChallenges(); }, [fetchPosts, fetchPolls, fetchChallenges]);

  // ── Posts ──
  const submitPost = async () => {
    if (!poForm.content.trim()) { toast.error("Le contenu est obligatoire"); return; }
    if ((poForm.post_type === "talent" || poForm.post_type === "art") && !poForm.title.trim()) {
      toast.error("Le titre est obligatoire pour ce type de post"); return;
    }
    setSavingPo(true);
    try {
      await communityApi.posts.create({
        content: poForm.content.trim(),
        post_type: poForm.post_type,
        title: poForm.title.trim() || undefined,
        media: poForm.mediaUrl ? [{ type: poForm.mediaType, url: poForm.mediaUrl }] : undefined,
      });
      toast.success("Post créé");
      setPoOpen(false);
      setPoForm({ title: "", content: "", post_type: "news", mediaType: "image", mediaUrl: "" });
      fetchPosts();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSavingPo(false); }
  };
  const delPost = async (id: number) => {
    if (!confirm("Supprimer ce post ?")) return;
    try { await communityApi.posts.delete(id); toast.success("Post supprimé"); fetchPosts(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
  };

  // ── Polls ──
  const setOpt = (i: number, v: string) => setPlForm((f) => ({ ...f, options: f.options.map((o, k) => k === i ? v : o) }));
  const addOpt = () => setPlForm((f) => ({ ...f, options: [...f.options, ""] }));
  const rmOpt = (i: number) => setPlForm((f) => ({ ...f, options: f.options.filter((_, k) => k !== i) }));
  const submitPoll = async () => {
    if (!plForm.question.trim()) { toast.error("La question est obligatoire"); return; }
    const opts = plForm.options.map((o) => o.trim()).filter(Boolean);
    setSavingPl(true);
    try {
      await communityApi.polls.create({
        question: plForm.question.trim(),
        options: opts.length ? opts : undefined,
        expires_at: plForm.expires_at ? new Date(plForm.expires_at).toISOString() : null,
        is_active: plForm.is_active,
      });
      toast.success("Sondage créé"); setPlOpen(false);
      setPlForm({ question: "", options: ["", ""], expires_at: "", is_active: true }); fetchPolls();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSavingPl(false); }
  };
  const delPoll = async (id: number) => {
    if (!confirm("Supprimer ce sondage ?")) return;
    try { await communityApi.polls.delete(id); toast.success("Sondage supprimé"); fetchPolls(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
  };

  // ── Challenges ──
  const submitChallenge = async () => {
    if (!chForm.title.trim())       { toast.error("Le titre est obligatoire"); return; }
    if (!chForm.description.trim()) { toast.error("La description est obligatoire"); return; }
    if (!chForm.deadline)           { toast.error("La date limite est obligatoire"); return; }
    setSavingCh(true);
    try {
      await communityApi.challenges.create({
        title: chForm.title.trim(),
        slug: slugify(chForm.title),
        description: chForm.description.trim(),
        deadline: new Date(chForm.deadline).toISOString(),
        prize: chForm.prize.trim() || undefined,
        is_active: chForm.is_active,
      });
      toast.success("Défi créé"); setChOpen(false);
      setChForm({ title: "", description: "", prize: "", deadline: "", is_active: true }); fetchChallenges();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSavingCh(false); }
  };
  const delChallenge = async (slug: string) => {
    if (!confirm("Supprimer ce défi ?")) return;
    try { await communityApi.challenges.delete(slug); toast.success("Défi supprimé"); fetchChallenges(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
  };

  const openPublishResult = (c: Challenge) => {
    setResultFor(c);
    setResultForm({ title: "", content: "", mediaType: "image", mediaUrl: "" });
  };
  const submitResult = async () => {
    if (!resultFor) return;
    if (!resultForm.title.trim() || !resultForm.content.trim()) { toast.error("Titre et contenu sont obligatoires"); return; }
    setSavingResult(true);
    try {
      await communityApi.challenges.publishResult(resultFor.slug, {
        title: resultForm.title.trim(),
        content: resultForm.content.trim(),
        media: resultForm.mediaUrl ? [{ type: resultForm.mediaType, url: resultForm.mediaUrl }] : undefined,
      });
      toast.success("Résultat publié et épinglé en tête des participations");
      setResultFor(null);
      fetchPosts();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Erreur"); }
    finally { setSavingResult(false); }
  };

  return (
    <section className="view">
      {/* En-tête */}
      <div className="page-h">
        <div>
          <h1>Communauté</h1>
          <p>Posts, sondages et défis</p>
        </div>
        <div className="h-actions">
          <div className="seg">
            <button className={tab === "posts" ? "on" : ""} onClick={() => setTab("posts")}>Posts</button>
            <button className={tab === "polls" ? "on" : ""} onClick={() => setTab("polls")}>Sondages</button>
            <button className={tab === "challenges" ? "on" : ""} onClick={() => setTab("challenges")}>Défis</button>
          </div>
          {tab === "posts" && <button className="btn btn-red" onClick={() => setPoOpen(true)}><Plus strokeWidth={2.2} />Nouveau post</button>}
          {tab === "polls" && <button className="btn btn-red" onClick={() => setPlOpen(true)}><Plus strokeWidth={2.2} />Nouveau sondage</button>}
          {tab === "challenges" && <button className="btn btn-red" onClick={() => setChOpen(true)}><Plus strokeWidth={2.2} />Nouveau défi</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}><Users /></div>
            <div><div className="kpi-lb">Posts</div></div>
          </div>
          <div className="kpi-v">{posts.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><BarChart3 /></div>
            <div><div className="kpi-lb">Sondages</div></div>
          </div>
          <div className="kpi-v">{polls.length}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Trophy /></div>
            <div><div className="kpi-lb">Défis</div></div>
          </div>
          <div className="kpi-v">{challenges.length}</div>
        </div>
      </div>

      {/* Posts */}
      {tab === "posts" && (
        loadingPo ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><Users /></div>
            <h3>Aucun post</h3>
            <p>Aucun post dans la communauté pour le moment.</p>
          </div>
        ) : (
          <div className="panel">
            <div className="panel-h">
              <div><h3>Posts</h3><div className="sub">Publications de la communauté</div></div>
            </div>
            <div className="panel-b">
              {posts.map((p, i) => (
                <div className="post" key={p.id}>
                  <span className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>{initials(p.author_name)}</span>
                  <div className="post-m">
                    <div className="post-h">
                      <b>{p.author_name ?? "Anonyme"}</b>
                      <span className={`badge ${POST_BADGE[p.post_type] ?? "b-gray"}`}>{POST_LABELS[p.post_type] ?? p.post_type}</span>
                      {p.created_at && <span className="time">{new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                    </div>
                    <div className="post-txt" style={{ whiteSpace: "pre-wrap" }}>{p.content}</div>
                    <div className="post-act">
                      <span><Heart />{p.like_count ?? 0}</span>
                      <span><MessageCircle />{p.comment_count ?? 0}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="row-act"><MoreHorizontal /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setComments(p)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => delPost(p.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Sondages */}
      {tab === "polls" && (
        loadingPl ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
          </div>
        ) : polls.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><BarChart3 /></div>
            <h3>Aucun sondage</h3>
            <p>Aucun sondage n&apos;a encore été créé.</p>
          </div>
        ) : (
          <div className="grid-2b">
            {polls.map((p) => (
              <div className="panel" key={p.id}>
                <div className="panel-b" style={{ paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className={`badge ${p.is_active ? "b-green" : "b-gray"}`}><span className="bd" />{p.is_active ? "Actif" : "Clos"}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{p.vote_count ?? 0} votes</span>
                      </div>
                      <h3 style={{ marginTop: 6, fontFamily: "var(--disp)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px" }}>{p.question}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="row-act"><MoreHorizontal /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => delPoll(p.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {p.options && p.options.length > 0 && (
                    <ul style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                      {p.options.map((o, i) => (
                        <li key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-2)", borderRadius: 8, padding: "7px 11px", fontSize: 13 }}>
                          <span>{o.text ?? o.label ?? `Option ${i + 1}`}</span>
                          <span className="muted">{o.vote_count ?? 0}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Défis */}
      {tab === "challenges" && (
        loadingCh ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
            <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
          </div>
        ) : challenges.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><Trophy /></div>
            <h3>Aucun défi</h3>
            <p>Lancez un premier défi à la communauté.</p>
          </div>
        ) : (
          <div className="ev-grid">
            {challenges.map((c) => (
              <div className="panel" key={c.id} style={{ overflow: "hidden" }}>
                {c.cover_url && (
                  <div style={{ height: 132, background: "var(--surface-2)" }}>
                    <img src={c.cover_url} alt={c.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
                <div className="panel-b" style={{ paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <span className={`badge ${c.is_active ? "b-green" : "b-gray"}`}><span className="bd" />{c.is_active ? "Actif" : "Terminé"}</span>
                      <h3 style={{ marginTop: 6, fontFamily: "var(--disp)", fontWeight: 700, fontSize: 16, letterSpacing: "-0.3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="row-act"><MoreHorizontal /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPublishResult(c)}><Pin className="mr-2 h-4 w-4" />Publier le résultat</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => delChallenge(c.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="post-txt" style={{ margin: "8px 0 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</p>
                  <div className="post-act" style={{ marginTop: 10 }}>
                    {c.prize && <span><Trophy />{c.prize}</span>}
                    <span><Users />{c.participant_count ?? 0}</span>
                    {c.deadline && <span>{new Date(c.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Dialog post */}
      <Dialog open={poOpen} onOpenChange={(o) => { if (!savingPo) setPoOpen(o); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Nouveau post</DialogTitle><DialogDescription>Publiez un post dans la communauté.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={poForm.post_type} onValueChange={(v) => setPoForm({ ...poForm, post_type: v as PostType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">Actu</SelectItem>
                  <SelectItem value="talent">Talent</SelectItem>
                  <SelectItem value="art">Art</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Titre {(poForm.post_type === "talent" || poForm.post_type === "art") ? "*" : "(optionnel)"}</Label>
              <Input value={poForm.title} onChange={(e) => setPoForm({ ...poForm, title: e.target.value })} placeholder="Titre du post" />
            </div>
            <div className="space-y-1.5">
              <Label>Contenu * <span className="text-xs text-muted-foreground">({poForm.content.length}/2000)</span></Label>
              <Textarea rows={5} maxLength={2000} value={poForm.content} onChange={(e) => setPoForm({ ...poForm, content: e.target.value })} placeholder="Que voulez-vous partager ?" />
            </div>
            <div className="space-y-1.5">
              <Label>Média (optionnel)</Label>
              <Select value={poForm.mediaType} onValueChange={(v) => setPoForm({ ...poForm, mediaType: v as MediaItem["type"], mediaUrl: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="song">Audio</SelectItem>
                </SelectContent>
              </Select>
              <MediaUpload
                label=""
                context={MEDIA_CTX[poForm.mediaType].context}
                accept={MEDIA_CTX[poForm.mediaType].accept}
                variant={poForm.mediaType === "song" ? "audio" : undefined}
                aspect={poForm.mediaType === "image" ? "square" : "video"}
                value={poForm.mediaUrl || null}
                onChange={(url) => setPoForm({ ...poForm, mediaUrl: url ?? "" })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingPo} onClick={() => setPoOpen(false)}>Annuler</Button>
            <Button disabled={savingPo} onClick={submitPost}>{savingPo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog sondage */}
      <Dialog open={plOpen} onOpenChange={(o) => { if (!savingPl) setPlOpen(o); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau sondage</DialogTitle><DialogDescription>Posez une question à la communauté.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Question *</Label>
              <Input maxLength={300} value={plForm.question} onChange={(e) => setPlForm({ ...plForm, question: e.target.value })} placeholder="Votre question…" />
            </div>
            <div className="space-y-1.5">
              <Label>Options</Label>
              <div className="space-y-2">
                {plForm.options.map((o, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    {plForm.options.length > 2 && (
                      <Button variant="outline" size="icon" onClick={() => rmOpt(i)}><X className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOpt} className="gap-1"><Plus className="h-3 w-3" />Ajouter une option</Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Expire le</Label>
                <Input type="datetime-local" value={plForm.expires_at} onChange={(e) => setPlForm({ ...plForm, expires_at: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Actif</Label>
                <Switch checked={plForm.is_active} onCheckedChange={(v) => setPlForm({ ...plForm, is_active: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingPl} onClick={() => setPlOpen(false)}>Annuler</Button>
            <Button disabled={savingPl} onClick={submitPoll}>{savingPl && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog défi */}
      <Dialog open={chOpen} onOpenChange={(o) => { if (!savingCh) setChOpen(o); }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nouveau défi</DialogTitle><DialogDescription>Lancez un défi à la communauté.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={chForm.title} onChange={(e) => setChForm({ ...chForm, title: e.target.value })} placeholder="Ex: Freestyle du mois" />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={chForm.description} onChange={(e) => setChForm({ ...chForm, description: e.target.value })} placeholder="Règles du défi…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Récompense</Label>
                <Input maxLength={100} value={chForm.prize} onChange={(e) => setChForm({ ...chForm, prize: e.target.value })} placeholder="Ex: 100 $" />
              </div>
              <div className="space-y-1.5">
                <Label>Date limite *</Label>
                <Input type="datetime-local" value={chForm.deadline} onChange={(e) => setChForm({ ...chForm, deadline: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="cursor-pointer">Actif</Label>
              <Switch checked={chForm.is_active} onCheckedChange={(v) => setChForm({ ...chForm, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingCh} onClick={() => setChOpen(false)}>Annuler</Button>
            <Button disabled={savingCh} onClick={submitChallenge}>{savingCh && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog résultat épinglé d'un défi */}
      <Dialog open={!!resultFor} onOpenChange={(o) => { if (!savingResult && !o) setResultFor(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Publier le résultat — {resultFor?.title}</DialogTitle>
            <DialogDescription>
              Ce post sera épinglé en tête des participations de ce défi (<code>is_pinned_result</code>).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={resultForm.title} onChange={(e) => setResultForm({ ...resultForm, title: e.target.value })} placeholder="Ex: Le gagnant est..." />
            </div>
            <div className="space-y-1.5">
              <Label>Contenu * <span className="text-xs text-muted-foreground">({resultForm.content.length}/2000)</span></Label>
              <Textarea rows={4} maxLength={2000} value={resultForm.content} onChange={(e) => setResultForm({ ...resultForm, content: e.target.value })} placeholder="Annonce du résultat…" />
            </div>
            <div className="space-y-1.5">
              <Label>Média (optionnel)</Label>
              <Select value={resultForm.mediaType} onValueChange={(v) => setResultForm({ ...resultForm, mediaType: v as MediaItem["type"], mediaUrl: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="song">Audio</SelectItem>
                </SelectContent>
              </Select>
              <MediaUpload
                label=""
                context={MEDIA_CTX[resultForm.mediaType].context}
                accept={MEDIA_CTX[resultForm.mediaType].accept}
                variant={resultForm.mediaType === "song" ? "audio" : undefined}
                aspect={resultForm.mediaType === "image" ? "square" : "video"}
                value={resultForm.mediaUrl || null}
                onChange={(url) => setResultForm({ ...resultForm, mediaUrl: url ?? "" })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingResult} onClick={() => setResultFor(null)}>Annuler</Button>
            <Button disabled={savingResult} onClick={submitResult}>{savingResult && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publier et épingler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modération des commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title="Commentaires du post"
          emptyLabel="Aucun commentaire sur ce post."
          load={() => commentsApi.list("community/posts", comments.id).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("community/posts", comments.id, cid)}
        />
      )}
    </section>
  );
}
