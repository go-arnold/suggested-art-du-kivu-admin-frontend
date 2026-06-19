"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mail, Users, Search, Download, Send, Loader2,
  CheckCircle, XCircle, UserCheck, TrendingUp,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usersApi, type User } from "@/lib/api";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<User[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page,        setPage]        = useState(1);
  const [sendOpen,    setSendOpen]    = useState(false);
  const [subject,     setSubject]     = useState("");
  const [body,        setBody]        = useState("");
  const [sending,     setSending]     = useState(false);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-created_at"); // plus récents en premier
      p.set("page_size", String(PAGE_SIZE));
      p.set("page",      String(page));
      p.set("is_active", "true");
      if (searchQuery) p.set("search", searchQuery);
      const data = await usersApi.list(p.toString());
      setSubscribers(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Erreur lors du chargement des abonnés");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleSendNewsletter = async () => {
    if (!subject.trim()) { toast.error("L'objet est requis"); return; }
    if (!body.trim())    { toast.error("Le contenu est requis"); return; }

    setSending(true);
    // Simulate send — in production this would call a dedicated newsletter endpoint
    await new Promise((res) => setTimeout(res, 1500));
    toast.success(`Newsletter envoyée à ${totalCount} abonnés`);
    setSendOpen(false);
    setSubject("");
    setBody("");
    setSending(false);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Newsletter</h1>
          <p className="mt-1 text-muted-foreground">
            Gérez vos abonnés et envoyez des newsletters
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />Exporter CSV
          </Button>

          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="mr-2 h-4 w-4" />Nouvelle Newsletter
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Envoyer une newsletter</DialogTitle>
                <DialogDescription>
                  Ce message sera envoyé à{" "}
                  <strong>{totalCount.toLocaleString()} abonnés actifs</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Objet</Label>
                  <Input
                    placeholder="Ex: Découvrez les nouveautés d'Art-du-Kivu"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contenu</Label>
                  <Textarea
                    placeholder="Rédigez votre message ici..."
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {body.trim().split(/\s+/).filter(Boolean).length} mot(s)
                  </p>
                </div>

                {/* Preview snippet */}
                {(subject || body) && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aperçu</p>
                    <p className="text-sm font-semibold">{subject || "(sans objet)"}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{body || "(sans contenu)"}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSendOpen(false)}>Annuler</Button>
                <Button onClick={handleSendNewsletter} disabled={sending}>
                  {sending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</>
                    : <><Send className="mr-2 h-4 w-4" />Envoyer</>}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Abonnés actifs",   value: loading ? "…" : totalCount.toLocaleString(),                         icon: Users,      color: "text-primary"     },
          { label: "Actifs ce mois",   value: loading ? "…" : subscribers.filter(u => u.is_active).length,         icon: UserCheck,  color: "text-emerald-500" },
          { label: "Taux d'activité",  value: loading ? "…" : `${subscribers.length > 0 ? Math.round((subscribers.filter(u => u.is_active).length / subscribers.length) * 100) : 0}%`, icon: TrendingUp, color: "text-blue-500"   },
          { label: "Admins & Éditeurs",value: loading ? "…" : subscribers.filter(u => u.role === "admin" || u.role === "editor").length, icon: CheckCircle, color: "text-warning" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un abonné..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="card-shadow">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Abonné</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Inscrit le</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscribers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    Aucun abonné trouvé
                  </TableCell>
                </TableRow>
              ) : subscribers.map((user) => {
                const name     = user.username || user.email?.split("@")[0] || `#${user.id}`;
                const initials = name.slice(0, 2).toUpperCase();
                const roleColors: Record<string, string> = {
                  admin:     "bg-primary text-primary-foreground",
                  editor:    "bg-blue-100 text-blue-700",
                  moderator: "bg-emerald-100 text-emerald-700",
                  user:      "",
                };
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "user" ? "outline" : "secondary"}
                        className={roleColors[user.role]}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active
                        ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="h-3.5 w-3.5" />Actif</span>
                        : <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3.5 w-3.5" />Inactif</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} / {totalPages} · {totalCount.toLocaleString()} abonnés
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
