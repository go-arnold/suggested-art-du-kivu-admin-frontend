"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Users, Search, Send, Loader2, CheckCircle, XCircle, MailCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  newsletterApi, type NewsletterSubscriber, type NewsletterCampaign,
} from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [campaigns,   setCampaigns]   = useState<NewsletterCampaign[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page,        setPage]        = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject,    setSubject]    = useState("");
  const [body,       setBody]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [sendingId,  setSendingId]  = useState<number | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-subscribed_at");
      p.set("page_size", String(PAGE_SIZE));
      p.set("page", String(page));
      if (searchQuery) p.set("search", searchQuery);
      const data = await newsletterApi.subscribers(p.toString());
      setSubscribers(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Erreur lors du chargement des abonnés");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await newsletterApi.campaigns.list("ordering=-created_at&page_size=10");
      setCampaigns(data.results);
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Crée une campagne puis l'envoie.
  const handleCreateAndSend = async () => {
    if (!subject.trim()) { toast.error("L'objet est requis"); return; }
    if (!body.trim())    { toast.error("Le contenu est requis"); return; }
    setSending(true);
    try {
      const campaign = await newsletterApi.campaigns.create({ subject, body_html: body });
      await newsletterApi.campaigns.send(campaign.id);
      toast.success("Newsletter créée et envoyée");
      setDialogOpen(false);
      setSubject(""); setBody("");
      fetchCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleSendExisting = async (id: number) => {
    setSendingId(id);
    try {
      await newsletterApi.campaigns.send(id);
      toast.success("Campagne envoyée");
      fetchCampaigns();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setSendingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const confirmed = subscribers.filter((s) => s.is_confirmed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Newsletter</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos abonnés et vos campagnes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Send className="mr-2 h-4 w-4" />Nouvelle campagne</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle>Créer et envoyer une campagne</DialogTitle>
              <DialogDescription>
                Envoyée à <strong>{totalCount.toLocaleString()} abonné(s)</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Objet</Label>
                <Input placeholder="Ex: Les nouveautés d'Art-du-Kivu" value={subject}
                  onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contenu (HTML autorisé)</Label>
                <Textarea placeholder="Rédigez votre message…" rows={8} value={body}
                  onChange={(e) => setBody(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateAndSend} disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer et envoyer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abonnés</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold font-mono">{loading ? "—" : totalCount.toLocaleString()}</div></CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmés (page)</CardTitle>
            <MailCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold font-mono">{loading ? "—" : confirmed}</div></CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Campagnes</CardTitle>
            <Mail className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold font-mono">{campaigns.length}</div></CardContent>
        </Card>
      </div>

      {/* Campagnes */}
      <Card className="card-shadow">
        <CardHeader><CardTitle className="text-lg">Campagnes récentes</CardTitle></CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune campagne pour le moment.</p>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((c) => {
                const sent = !!c.sent_at || c.status === "sent";
                return (
                  <div key={c.id} className="flex items-center gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.created_by_name ? `${c.created_by_name} · ` : ""}
                        {c.recipient_count != null ? `${c.recipient_count} destinataires` : ""}
                        {c.sent_at ? ` · envoyée le ${new Date(c.sent_at).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    {sent ? (
                      <Badge variant="secondary" className="bg-success/10 text-success">Envoyée</Badge>
                    ) : (
                      <Button size="sm" variant="secondary" disabled={sendingId === c.id}
                        onClick={() => handleSendExisting(c.id)}>
                        {sendingId === c.id
                          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          : <Send className="mr-2 h-4 w-4" />}
                        Envoyer
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recherche abonnés */}
      <div className="rounded-xl bg-card p-4 card-shadow">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un abonné (email)…" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      {/* Table abonnés */}
      <Card className="card-shadow">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Confirmé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Aucun abonné.</TableCell></TableRow>
              ) : subscribers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.email}</TableCell>
                  <TableCell>
                    {s.is_confirmed
                      ? <span className="flex items-center gap-1 text-xs text-success"><CheckCircle className="h-3.5 w-3.5" />Confirmé</span>
                      : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />En attente</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={s.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                      {s.is_active ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">Page {page} / {totalPages} · {totalCount.toLocaleString()} abonnés</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
