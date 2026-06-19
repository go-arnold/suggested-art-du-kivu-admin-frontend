"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, Send, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import dynamic from "next/dynamic";
import { articlesApi, type ArticleCategory } from "@/lib/api";

// Éditeur riche chargé à la demande (lazy) — allège le bundle initial de la page.
const RichTextEditor = dynamic(
  () => import("@/components/admin/rich-text-editor").then((m) => m.RichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[500px] items-center justify-center rounded-xl bg-card card-shadow">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

export default function ModifierArticlePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug   = params.slug;

  const [title,         setTitle]         = useState("");
  const [content,       setContent]       = useState("");
  const [categoryId,    setCategoryId]    = useState<string>("");  // stored as string ID
  const [tags,          setTags]          = useState<string[]>([]);
  const [tagInput,      setTagInput]      = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [status,        setStatus]        = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduleDate,  setScheduleDate]  = useState<Date | undefined>();
  const [isFeatured,    setIsFeatured]    = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isPreviewOpen,  setIsPreviewOpen]  = useState(false);

  const [categories,  setCategories]  = useState<ArticleCategory[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving,      setSaving]      = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load article + categories on mount
  useEffect(() => {
    Promise.all([
      articlesApi.get(slug),
      articlesApi.categories(),
    ]).then(([article, cats]) => {
      setTitle(article.title);
      setCategories(cats);

      // Resolve category → find matching ID
      const cat = article.category;
      if (typeof cat === "object" && cat !== null) {
        setCategoryId(String((cat as ArticleCategory).id));
      } else if (typeof cat === "string") {
        // Try to match by slug or name
        const found = cats.find((c) => c.slug === cat || c.name === cat);
        if (found) setCategoryId(String(found.id));
      }

      if (article.featured_image_url) setFeaturedImage(article.featured_image_url);
    }).catch(() => {
      toast.error("Impossible de charger l'article");
      router.push("/admin/articles");
    }).finally(() => setLoadingData(false));
  }, [slug, router]);

  const wordCount = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    return text.trim().split(/\s+/).filter(Boolean).length;
  }, [content]);

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addTag(); }
  };

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFeaturedImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = async (asStatus: "draft" | "published" | "scheduled") => {
    if (!title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);
    try {
      await articlesApi.update(slug, {
        title,
        content,
        category: categoryId ? Number(categoryId) : undefined,
        status:   asStatus,
        tags,
        is_featured:    isFeatured,
        allow_comments: allowComments,
        published_at:   asStatus === "scheduled" && scheduleDate
          ? scheduleDate.toISOString() : undefined,
      });
      toast.success(asStatus === "published" ? "Article publié" : "Article sauvegardé");
      router.push("/admin/articles");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategory = categories.find((c) => String(c.id) === categoryId);

  if (loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/articles"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Modifier l&apos;Article</h1>
            <p className="text-xs text-muted-foreground font-mono truncate max-w-xs">{slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />Aperçu
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleSave("draft")} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />Sauvegarder
          </Button>
          <Button size="sm" onClick={() => handleSave("published")} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />Publier
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main content */}
        <div className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <Input
              placeholder="Titre de l'article..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 bg-transparent text-2xl font-display font-bold placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0 h-auto"
            />
          </div>
          <RichTextEditor value={content} onChange={setContent} />
          <p className="text-right text-xs text-muted-foreground">
            {wordCount} mot{wordCount > 1 ? "s" : ""}
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publication */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold mb-4">Publication</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publié</SelectItem>
                    <SelectItem value="scheduled">Programmé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {status === "scheduled" && (
                <div className="space-y-2">
                  <Label>Date de publication</Label>
                  <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        {scheduleDate ? scheduleDate.toLocaleDateString("fr-FR") : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={scheduleDate}
                        onSelect={(d) => { setScheduleDate(d); setIsScheduleOpen(false); }}
                        disabled={(d) => d < new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Featured Image */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold mb-4">Image à la Une</h3>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0])} />
            {featuredImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={featuredImage} alt="Aperçu" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <Button variant="destructive" size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setFeaturedImage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Cliquez pour ajouter une image</p>
              </div>
            )}
          </div>

          {/* Category — by ID */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold mb-4">Catégorie</h3>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold mb-4">Tags</h3>
            <div className="flex gap-2">
              <Input placeholder="Ajouter un tag…" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} />
              <Button variant="secondary" onClick={addTag}>+</Button>
            </div>
            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10"
                    onClick={() => removeTag(tag)}>
                    {tag}<X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold mb-4">Options</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Article mis en avant</Label>
                  <p className="text-xs text-muted-foreground">Page d{"'"}accueil</p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label>Autoriser les commentaires</Label>
                <Switch checked={allowComments} onCheckedChange={setAllowComments} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>Prévisualisation</DialogTitle></DialogHeader>
          <article className="space-y-4">
            {featuredImage && (
              <img src={featuredImage} alt={title} loading="lazy" decoding="async" className="aspect-video w-full rounded-lg object-cover" />
            )}
            <div className="flex gap-2">
              {selectedCategory && <Badge variant="secondary">{selectedCategory.name}</Badge>}
            </div>
            <h1 className="font-display text-3xl font-bold">{title || "Titre"}</h1>
            {content.replace(/<[^>]*>/g, "").trim()
              ? <div className="rte-content" dangerouslySetInnerHTML={{ __html: content }} />
              : <p className="text-muted-foreground">Aucun contenu.</p>}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((t) => <Badge key={t} variant="outline">#{t}</Badge>)}
              </div>
            )}
          </article>
        </DialogContent>
      </Dialog>
    </div>
  );
}
