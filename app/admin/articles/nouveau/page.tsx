"use client"

import React, { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { RichTextEditor } from "@/components/admin/rich-text-editor"

const categories = ["Culture", "Événements", "Artistes", "Guides", "Musique", "Art"]
const authors = ["Jean Dupont", "Marie K.", "Sophie M.", "Admin"]

export default function NewArticlePage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("")
  const [author, setAuthor] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft")
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>()
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Nombre de mots à partir du HTML de l'éditeur (balises retirées).
  const wordCount = useMemo(() => {
    const text = content.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
    const words = text.trim().split(/\s+/).filter(Boolean)
    return words.length
  }, [content])

  const addTag = () => {
    const value = tagInput.trim()
    if (value && !tags.includes(value)) {
      setTags([...tags, value])
    }
    setTagInput("")
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  const handleImageUpload = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setFeaturedImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  // Validation commune avant sauvegarde / publication.
  const validate = (requireForPublish: boolean) => {
    if (!title.trim()) {
      toast.error("Le titre est requis")
      return false
    }
    if (requireForPublish) {
      if (!content.replace(/<[^>]*>/g, "").trim()) {
        toast.error("Le contenu de l'article est vide")
        return false
      }
      if (!category) {
        toast.error("Veuillez sélectionner une catégorie")
        return false
      }
      if (!author) {
        toast.error("Veuillez sélectionner un auteur")
        return false
      }
      if (status === "scheduled" && !scheduleDate) {
        toast.error("Veuillez choisir une date de publication")
        return false
      }
    }
    return true
  }

  const buildArticle = () => ({
    title,
    content,
    category,
    author,
    tags,
    featuredImage,
    status,
    scheduleDate,
  })

  const handleSaveDraft = () => {
    if (!validate(false)) return
    console.log("[article] brouillon enregistré", buildArticle())
    toast.success("Brouillon enregistré")
  }

  const handlePublish = () => {
    if (!validate(true)) return
    console.log("[article] publication", buildArticle())
    toast.success(
      status === "scheduled"
        ? `Article programmé pour le ${scheduleDate?.toLocaleDateString("fr-FR")}`
        : "Article publié avec succès"
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/articles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Nouvel Article
            </h1>
            <p className="text-sm text-muted-foreground">
              Créez un nouveau contenu pour Art-du-Kivu
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Prévisualiser
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Sauvegarder
          </Button>
          <Button size="sm" onClick={handlePublish}>
            <Send className="mr-2 h-4 w-4" />
            {status === "scheduled" ? "Programmer" : "Publier"}
          </Button>
        </div>
      </div>

      {/* Editor Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <Input
              placeholder="Titre de l'article..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 bg-transparent text-2xl font-display font-bold placeholder:text-muted-foreground/50 focus-visible:ring-0 p-0 h-auto"
            />
          </div>

          {/* Editor */}
          <RichTextEditor value={content} onChange={setContent} />

          <p className="text-right text-xs text-muted-foreground">
            {wordCount} mot{wordCount > 1 ? "s" : ""}
          </p>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Publication</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="published">Publier immédiatement</SelectItem>
                    <SelectItem value="scheduled">Programmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {status === "scheduled" && (
                <div className="space-y-2">
                  <Label>Date de publication</Label>
                  <Popover open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start bg-transparent">
                        {scheduleDate
                          ? scheduleDate.toLocaleDateString("fr-FR")
                          : "Sélectionner une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduleDate}
                        onSelect={(date) => {
                          setScheduleDate(date)
                          setIsScheduleOpen(false)
                        }}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="space-y-2">
                <Label>Auteur</Label>
                <Select value={author} onValueChange={setAuthor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un auteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Image à la Une</h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files?.[0])}
            />

            {featuredImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={featuredImage}
                  alt="Aperçu de l'image à la une"
                  className="h-full w-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => setFeaturedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Cliquez pour ajouter une image
                </p>
              </div>
            )}
          </div>

          {/* Category */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Catégorie</h3>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Tags</h3>

            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <Button variant="secondary" onClick={addTag}>
                Ajouter
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* SEO Options */}
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-semibold text-foreground mb-4">Options SEO</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Article mis en avant</Label>
                  <p className="text-xs text-muted-foreground">
                    Afficher sur la page d{"'"}accueil
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Autoriser les commentaires</Label>
                  <p className="text-xs text-muted-foreground">
                    Les lecteurs peuvent commenter
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévisualisation</DialogTitle>
          </DialogHeader>

          <article className="space-y-4">
            {featuredImage && (
              <img
                src={featuredImage}
                alt={title || "Image à la une"}
                className="aspect-video w-full rounded-lg object-cover"
              />
            )}
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {category && <Badge variant="secondary">{category}</Badge>}
              {author && <span>Par {author}</span>}
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {title || "Titre de l'article"}
            </h1>
            {content.replace(/<[^>]*>/g, "").trim() ? (
              <div
                className="rte-content"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            ) : (
              <p className="text-muted-foreground">
                Aucun contenu à prévisualiser pour le moment.
              </p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </article>
        </DialogContent>
      </Dialog>
    </div>
  )
}
