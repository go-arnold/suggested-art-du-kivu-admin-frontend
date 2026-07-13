"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Disc3, Search, Filter, MoreHorizontal, Plus, Trash2, Loader2, Star, Music2, Edit, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  releasesApi, artistsApi, commentsApi,
  type ReleaseList, type ReleaseWrite, type ReleaseFormat, type ArtistList,
} from "@/lib/api";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FORMAT_LABELS: Record<string, string> = {
  album: "Album", single: "Single", clip: "Clip",
  documentaire: "Documentaire", expo: "Exposition",
};
const FORMAT_COLORS: Record<string, string> = {
  album: "bg-primary/10 text-primary", single: "bg-info/10 text-info",
  clip: "bg-purple-100 text-purple-700", documentaire: "bg-warning/10 text-warning",
  expo: "bg-pink-100 text-pink-700",
};
const FORMATS = Object.keys(FORMAT_LABELS) as ReleaseFormat[];

const EMPTY = {
  artist: "", title: "", format: "single" as ReleaseFormat,
  release_date: "", description: "", preview_url: "",
  is_featured: false, is_premiere: false,
};

export default function ReleasesPage() {
  const [items, setItems] = useState<ReleaseList[]>([]);
  const [artists, setArtists] = useState<ArtistList[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [comments, setComments] = useState<ReleaseList | null>(null);
  const [form, setForm] = useState(EMPTY);
  const setField = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-release_date");
      p.set("page_size", "60");
      if (search) p.set("search", search);
      if (format !== "all") p.set("format", format);
      const data = await releasesApi.list(p.toString());
      setItems(data.results);
    } catch {
      toast.error("Erreur lors du chargement des sorties");
    } finally {
      setLoading(false);
    }
  }, [search, format]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    artistsApi.list("page_size=200&ordering=name")
      .then((d) => setArtists(d.results))
      .catch(() => { /* non bloquant */ });
  }, []);

  const openCreate = () => { setEditingSlug(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r: ReleaseList) => {
    setEditingSlug(r.slug);
    const a = artists.find((x) => x.slug === r.artist_slug);
    setForm({
      artist: a ? String(a.id) : "",
      title: r.title ?? "",
      format: (r.format as ReleaseFormat) ?? "single",
      release_date: r.release_date ?? "",
      description: "", preview_url: "",
      is_featured: !!r.is_featured, is_premiere: !!r.is_premiere,
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.artist)            { toast.error("L'artiste est obligatoire"); return; }
    if (!form.title.trim())      { toast.error("Le titre est obligatoire"); return; }
    if (!form.release_date)      { toast.error("La date de sortie est obligatoire"); return; }
    setSaving(true);
    try {
      const payload: ReleaseWrite = {
        artist: Number(form.artist),
        title: form.title.trim(),
        format: form.format,
        release_date: form.release_date,
        description: form.description.trim() || undefined,
        preview_url: form.preview_url.trim() || undefined,
        is_featured: form.is_featured,
        is_premiere: form.is_premiere,
      };
      if (editingSlug) {
        await releasesApi.update(editingSlug, payload);
        toast.success("Sortie mise à jour");
      } else {
        await releasesApi.create(payload);
        toast.success("Sortie créée");
      }
      setOpen(false); setForm(EMPTY); setEditingSlug(null);
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cette sortie ?")) return;
    try {
      await releasesApi.delete(slug);
      toast.success("Sortie supprimée");
      fetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  };

  const featuredCount = items.filter((r) => r.is_featured).length;
  const premiereCount = items.filter((r) => r.is_premiere).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Sorties</h1>
          <p className="mt-1 text-muted-foreground">Albums, singles, clips et projets</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Nouvelle sortie</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Sorties", value: items.length, icon: Disc3, color: "text-primary" },
          { label: "À la une", value: featuredCount, icon: Star, color: "text-warning" },
          { label: "Premières", value: premiereCount, icon: Music2, color: "text-pink-500" },
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
          <Input placeholder="Rechercher une sortie…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="w-[180px]"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les formats</SelectItem>
            {FORMATS.map((f) => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card className="card-shadow"><CardContent className="flex flex-col items-center py-12">
          <Disc3 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-sm text-muted-foreground">Aucune sortie.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {items.map((r) => (
            <div key={r.id} className="group overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg">
              <div className="relative aspect-square bg-muted">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center"><Disc3 className="h-10 w-10 text-muted-foreground/30" /></div>
                )}
                {r.is_featured && <Badge className="absolute left-2 top-2 gap-1 bg-warning text-white"><Star className="h-3 w-3" />À la une</Badge>}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={r.title}>{r.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.artist_name}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setComments(r)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className={cn("text-[10px]", FORMAT_COLORS[r.format])}>{FORMAT_LABELS[r.format] ?? r.format}</Badge>
                  <span>·</span>
                  <span>{r.release_date ? new Date(r.release_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { if (!saving) { setOpen(o); if (!o) { setForm(EMPTY); setEditingSlug(null); } } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSlug ? "Modifier la sortie" : "Nouvelle sortie"}</DialogTitle>
            <DialogDescription>Ajoutez un album, single, clip ou projet au catalogue.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Titre de la sortie" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Artiste *</Label>
                <Select value={form.artist} onValueChange={(v) => setField("artist", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {artists.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Format *</Label>
                <Select value={form.format} onValueChange={(v) => setField("format", v as ReleaseFormat)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date de sortie *</Label>
                <Input type="date" value={form.release_date} onChange={(e) => setField("release_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Aperçu (URL)</Label>
                <Input type="url" value={form.preview_url} onChange={(e) => setField("preview_url", e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Description de la sortie…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">À la une</Label>
                <Switch checked={form.is_featured} onCheckedChange={(v) => setField("is_featured", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Première</Label>
                <Switch checked={form.is_premiere} onCheckedChange={(v) => setField("is_premiere", v)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Annuler</Button>
            <Button disabled={saving} onClick={handleSubmit}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingSlug ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modération des commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cette sortie."
          load={() => commentsApi.list("releases", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("releases", comments.slug, cid)}
        />
      )}
    </div>
  );
}
