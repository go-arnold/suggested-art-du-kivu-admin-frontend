"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Users, Search, Send, Loader2, CheckCircle, XCircle, MailCheck,
  ChevronLeft, ChevronRight, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Newsletter</h1>
          <p>Gérez vos abonnés et vos campagnes</p>
        </div>
        <div className="h-actions">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-red"><Send strokeWidth={2.2} />Nouvelle campagne</button>
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
      </div>

      {/* Stats */}
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><Users /></div>
            <div><div className="kpi-lb">Abonnés</div></div>
          </div>
          <div className="kpi-v">{loading ? "—" : totalCount.toLocaleString()}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--emerald-soft)", color: "var(--emerald)" }}><MailCheck /></div>
            <div><div className="kpi-lb">Confirmés (page)</div></div>
          </div>
          <div className="kpi-v">{loading ? "—" : confirmed}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Mail /></div>
            <div><div className="kpi-lb">Campagnes</div></div>
          </div>
          <div className="kpi-v">{campaigns.length}</div>
        </div>
      </div>

      {/* Campagnes */}
      <div className="panel">
        <div className="panel-h">
          <div><h3>Campagnes récentes</h3></div>
        </div>
        <div className="panel-b">
          {campaigns.length === 0 ? (
            <p className="muted" style={{ padding: "6px 0" }}>Aucune campagne pour le moment.</p>
          ) : (
            <div>
              {campaigns.map((c, idx) => {
                const sent = !!c.sent_at || c.status === "sent";
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 16,
                      padding: "12px 0",
                      borderTop: idx ? "1px solid var(--line-2)" : "none",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="art-t" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</div>
                      <div className="art-s">
                        {c.created_by_name ? `${c.created_by_name} · ` : ""}
                        {c.recipient_count != null ? `${c.recipient_count} destinataires` : ""}
                        {c.sent_at ? ` · envoyée le ${new Date(c.sent_at).toLocaleDateString("fr-FR")}` : ""}
                      </div>
                    </div>
                    {sent ? (
                      <span className="badge b-green"><span className="bd" />Envoyée</span>
                    ) : (
                      <button className="btn btn-ghost" disabled={sendingId === c.id}
                        onClick={() => handleSendExisting(c.id)}>
                        {sendingId === c.id
                          ? <Loader2 className="animate-spin" />
                          : <Send />}
                        Envoyer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recherche abonnés */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher un abonné (email)…" value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
        </div>
      </div>

      {/* Table abonnés */}
      <div className="tbl-wrap">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--t3)" }} />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><Inbox /></div>
            <h3>Aucun abonné</h3>
            <p>Aucun abonné ne correspond à votre recherche.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Email</th>
                <th>Confirmé</th>
                <th>Statut</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td><span className="art-t">{s.email}</span></td>
                  <td>
                    {s.is_confirmed
                      ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--emerald)" }}><CheckCircle style={{ width: 14, height: 14 }} />Confirmé</span>
                      : <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5 }}><XCircle style={{ width: 14, height: 14 }} />En attente</span>}
                  </td>
                  <td>
                    {s.is_active
                      ? <span className="badge b-green"><span className="bd" />Actif</span>
                      : <span className="badge b-gray"><span className="bd" />Inactif</span>}
                  </td>
                  <td>
                    <span className="muted">
                      {s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && totalPages > 1 && (
          <div className="tbl-foot">
            <span className="info">Page {page} sur {totalPages} · {totalCount.toLocaleString()} abonnés</span>
            <div className="pager">
              <button className="pg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
              </button>
              <button className="pg" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
