"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Disc3, Search, MoreVertical, Plus, Trash2, Loader2, Star, Music2, Edit, MessageSquare, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { MediaUpload } from "@/components/admin/media-upload";
import { toast } from "sonner";

const FORMAT_LABELS: Record<string, string> = {
  album: "Album", single: "Single", clip: "Clip",
  documentaire: "Documentaire", expo: "Exposition",
};
const FORMATS = Object.keys(FORMAT_LABELS) as ReleaseFormat[];

const COVER_GRADIENTS = ["", "c2", "c3"];

const EMPTY = {
  artist: "", title: "", format: "single" as ReleaseFormat,
  release_date: "", description: "", preview_url: "", cover: "",
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
      description: "", preview_url: "", cover: r.cover_url ?? "",
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
        cover: form.cover || undefined,
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

  const kpis = [
    { label: "Sorties", value: items.length, icon: Disc3, bg: "var(--red-soft)", color: "var(--red)" },
    { label: "À la une", value: featuredCount, icon: Star, bg: "var(--gold-soft)", color: "var(--gold)" },
    { label: "Premières", value: premiereCount, icon: Music2, bg: "var(--purple-soft)", color: "var(--purple)" },
  ];

  return (
    <section className="view">
      <div className="page-h">
        <div>
          <h1>Sorties</h1>
          <p>Albums, singles, clips et projets</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-red" onClick={openCreate}><Plus strokeWidth={2.2} />Nouvelle sortie</button>
        </div>
      </div>

      <div className="kpis">
        {kpis.map((s) => (
          <div className="kpi" key={s.label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: s.bg, color: s.color }}><s.icon /></div>
              <div><div className="kpi-lb">{s.label}</div></div>
            </div>
            <div className="kpi-v">{loading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher une sortie…" value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger className="filter w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les formats</SelectItem>
            {FORMATS.map((f) => <SelectItem key={f} value={f}>{FORMAT_LABELS[f]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
        </div>
      ) : items.length === 0 ? (
        <div className="ph">
          <div className="ph-ic"><Disc3 /></div>
          <h3>Aucune sortie</h3>
          <p>Ajoutez un album, single, clip ou projet au catalogue.</p>
          <button className="btn btn-red" onClick={openCreate}><Plus strokeWidth={2.2} />Nouvelle sortie</button>
        </div>
      ) : (
        <div className="m-grid">
          {items.map((r, i) => (
            <div className="m-card" key={r.id}>
              <div className={`m-cover ${r.cover_url ? "" : COVER_GRADIENTS[i % COVER_GRADIENTS.length]}`}>
                {r.cover_url && <img src={r.cover_url} alt={r.title} loading="lazy" decoding="async" />}
                {r.is_featured && <span className="m-tag m-sched">À la une</span>}
              </div>
              <div className="m-body">
                <div className="m-title" title={r.title}>{r.title}</div>
                <div className="m-series">{r.artist_name}</div>
                <div className="m-meta">
                  <span className="mi"><Disc3 />{FORMAT_LABELS[r.format] ?? r.format}</span>
                  <span className="mi"><Calendar />{r.release_date ? new Date(r.release_date).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : "—"}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="row-act" aria-label="Actions"><MoreVertical /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(r)}><Edit className="mr-2 h-4 w-4" />Modifier</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setComments(r)}><MessageSquare className="mr-2 h-4 w-4" />Commentaires</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(r.slug)}><Trash2 className="mr-2 h-4 w-4" />Supprimer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
            <MediaUpload
              label="Pochette" context="release_cover" aspect="square"
              value={form.cover || null} onChange={(url) => setField("cover", url ?? "")}
            />
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
    </section>
  );
}
