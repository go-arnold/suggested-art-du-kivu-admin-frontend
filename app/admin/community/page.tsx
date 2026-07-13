"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Trash2, Loader2, MoreHorizontal, Heart, MessageCircle,
  BarChart3, Trophy, X, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  communityApi, commentsApi,
  type CommunityPost, type PostType, type Poll, type Challenge,
} from "@/lib/api";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const POST_LABELS: Record<PostType, string> = { talent: "Talent", art: "Art", news: "Actu" };
const POST_COLORS: Record<PostType, string> = {
  talent: "bg-primary/10 text-primary", art: "bg-purple-100 text-purple-700", news: "bg-info/10 text-info",
};

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
  const [poForm, setPoForm] = useState<{ content: string; post_type: PostType }>({ content: "", post_type: "news" });
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
    setSavingPo(true);
    try {
      await communityApi.posts.create({ content: poForm.content.trim(), post_type: poForm.post_type });
      toast.success("Post créé"); setPoOpen(false); setPoForm({ content: "", post_type: "news" }); fetchPosts();
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Communauté</h1>
          <p className="mt-1 text-muted-foreground">Posts, sondages et défis</p>
        </div>
        {tab === "posts" && <Button onClick={() => setPoOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nouveau post</Button>}
        {tab === "polls" && <Button onClick={() => setPlOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nouveau sondage</Button>}
        {tab === "challenges" && <Button onClick={() => setChOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Nouveau défi</Button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Posts", value: posts.length, icon: Users, color: "text-primary" },
          { label: "Sondages", value: polls.length, icon: BarChart3, color: "text-info" },
          { label: "Défis", value: challenges.length, icon: Trophy, color: "text-warning" },
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
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="polls">Sondages</TabsTrigger>
          <TabsTrigger value="challenges">Défis</TabsTrigger>
        </TabsList>

        {/* Posts */}
        <TabsContent value="posts" className="mt-6">
          {loadingPo ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12"><Users className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-sm text-muted-foreground">Aucun post.</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <Card key={p.id} className="card-shadow">
                  <CardContent className="flex gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.author_name ?? "Anonyme"}</span>
                        <Badge variant="secondary" className={cn("text-[10px]", POST_COLORS[p.post_type])}>{POST_LABELS[p.post_type] ?? p.post_type}</Badge>
                        {p.created_at && <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground line-clamp-3">{p.content}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.like_count ?? 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{p.comment_count ?? 0}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setComments(p)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => delPost(p.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Polls */}
        <TabsContent value="polls" className="mt-6">
          {loadingPl ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : polls.length === 0 ? (
            <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12"><BarChart3 className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-sm text-muted-foreground">Aucun sondage.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {polls.map((p) => (
                <Card key={p.id} className="card-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={p.is_active ? "bg-success text-white" : "bg-muted text-muted-foreground"}>{p.is_active ? "Actif" : "Clos"}</Badge>
                          <span className="text-xs text-muted-foreground">{p.vote_count ?? 0} votes</span>
                        </div>
                        <h3 className="mt-1 font-semibold text-foreground">{p.question}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => delPoll(p.id)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {p.options && p.options.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {p.options.map((o, i) => (
                          <li key={i} className="flex items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs">
                            <span>{o.text ?? o.label ?? `Option ${i + 1}`}</span>
                            <span className="text-muted-foreground">{o.vote_count ?? 0}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Challenges */}
        <TabsContent value="challenges" className="mt-6">
          {loadingCh ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : challenges.length === 0 ? (
            <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12"><Trophy className="h-12 w-12 text-muted-foreground/50" /><p className="mt-4 text-sm text-muted-foreground">Aucun défi.</p></CardContent></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {challenges.map((c) => (
                <Card key={c.id} className="card-shadow overflow-hidden">
                  {c.cover_url && <div className="h-32 bg-muted"><img src={c.cover_url} alt={c.title} loading="lazy" className="h-full w-full object-cover" /></div>}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge className={c.is_active ? "bg-success text-white" : "bg-muted text-muted-foreground"}>{c.is_active ? "Actif" : "Terminé"}</Badge>
                        <h3 className="mt-1 truncate font-semibold text-foreground">{c.title}</h3>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => delChallenge(c.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      {c.prize && <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{c.prize}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.participant_count ?? 0}</span>
                      {c.deadline && <span>{new Date(c.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
              <Label>Contenu * <span className="text-xs text-muted-foreground">({poForm.content.length}/2000)</span></Label>
              <Textarea rows={5} maxLength={2000} value={poForm.content} onChange={(e) => setPoForm({ ...poForm, content: e.target.value })} placeholder="Que voulez-vous partager ?" />
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
    </div>
  );
}
