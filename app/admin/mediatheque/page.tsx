"use client"

import React from "react"

import { useState } from "react"
import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Search,
  Upload,
  Filter,
  LayoutGrid,
  List,
  Video,
  Music,
  FileText,
  MoreHorizontal,
  Eye,
  Download,
  Copy,
  Trash2,
  X,
  Check,
  FolderOpen,
  Calendar,
  HardDrive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MediaFile {
  id: string
  name: string
  type: "image" | "video" | "audio" | "document"
  url: string
  thumbnail: string
  size: string
  dimensions?: string
  duration?: string
  uploadDate: string
  folder?: string
}

const mediaFiles: MediaFile[] = [
  {
    id: "1",
    name: "concert-goma-2026.jpg",
    type: "image",
    url: "/placeholder.svg?height=600&width=800",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "2.4 MB",
    dimensions: "1920x1080",
    uploadDate: "2026-01-28",
    folder: "Événements",
  },
  {
    id: "2",
    name: "artiste-marie-portrait.jpg",
    type: "image",
    url: "/placeholder.svg?height=600&width=600",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "1.8 MB",
    dimensions: "1200x1200",
    uploadDate: "2026-01-25",
    folder: "Artistes",
  },
  {
    id: "3",
    name: "podcast-culture-ep12.mp3",
    type: "audio",
    url: "#",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "45 MB",
    duration: "48:32",
    uploadDate: "2026-01-24",
    folder: "Podcasts",
  },
  {
    id: "4",
    name: "festival-amani-promo.mp4",
    type: "video",
    url: "#",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "128 MB",
    dimensions: "1920x1080",
    duration: "2:45",
    uploadDate: "2026-01-22",
    folder: "Événements",
  },
  {
    id: "5",
    name: "programme-festival.pdf",
    type: "document",
    url: "#",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "3.2 MB",
    uploadDate: "2026-01-20",
    folder: "Documents",
  },
  {
    id: "6",
    name: "galerie-art-bukavu.jpg",
    type: "image",
    url: "/placeholder.svg?height=800&width=600",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "3.1 MB",
    dimensions: "2400x1800",
    uploadDate: "2026-01-18",
    folder: "Galeries",
  },
  {
    id: "7",
    name: "interview-peintre.mp3",
    type: "audio",
    url: "#",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "32 MB",
    duration: "35:12",
    uploadDate: "2026-01-15",
    folder: "Interviews",
  },
  {
    id: "8",
    name: "danse-traditionnelle.mp4",
    type: "video",
    url: "#",
    thumbnail: "/placeholder.svg?height=200&width=200",
    size: "256 MB",
    dimensions: "1920x1080",
    duration: "5:30",
    uploadDate: "2026-01-12",
    folder: "Culture",
  },
]

const typeIcons = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
}

const typeColors = {
  image: "bg-info/10 text-info",
  video: "bg-destructive/10 text-destructive",
  audio: "bg-success/10 text-success",
  document: "bg-warning/10 text-warning",
}

export default function MediathequePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [folderFilter, setFolderFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const folders = [...new Set(mediaFiles.map((f) => f.folder).filter(Boolean))]

  const filteredFiles = mediaFiles.filter((file) => {
    const matchesSearch = file.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === "all" || file.type === typeFilter
    const matchesFolder = folderFilter === "all" || file.folder === folderFilter
    return matchesSearch && matchesType && matchesFolder
  })

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map((f) => f.id))
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    // Handle file upload
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Médiathèque
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gérez vos fichiers médias
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Uploader
        </Button>
      </div>

      {/* Upload Zone */}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload
          className={cn(
            "mx-auto h-12 w-12 transition-colors",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />
        <p className="mt-4 text-sm font-medium">
          Glissez-déposez vos fichiers ici
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ou cliquez sur le bouton Uploader
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          PNG, JPG, GIF, MP4, MP3, PDF jusqu{"'"}à 100MB
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fichier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Vidéos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger className="w-[140px]">
              <FolderOpen className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Dossier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder} value={folder || ""}>
                  {folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-input">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedFiles.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
          <Checkbox
            checked={selectedFiles.length === filteredFiles.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedFiles.length} fichier
            {selectedFiles.length > 1 ? "s" : ""} sélectionné
            {selectedFiles.length > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button size="sm" variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Files Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredFiles.map((file) => {
            const TypeIcon = typeIcons[file.type]
            const isSelected = selectedFiles.includes(file.id)

            return (
              <div
                key={file.id}
                className={cn(
                  "group relative overflow-hidden rounded-xl bg-card card-shadow transition-all hover:shadow-lg cursor-pointer",
                  isSelected && "ring-2 ring-primary"
                )}
                onClick={() => setPreviewFile(file)}
              >
                {/* Selection */}
                <div
                  className={cn(
                    "absolute left-2 top-2 z-10 transition-opacity",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSelect(file.id)
                  }}
                >
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-background bg-background/80"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </div>
                </div>

                {/* Type Badge */}
                <div className="absolute right-2 top-2 z-10">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      typeColors[file.type]
                    )}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {file.type === "image" ? (
                    <ImageIcon src={file.thumbnail || "/placeholder.svg"} alt={file.name} className="object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <TypeIcon className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium" title={file.name}>
                    {file.name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{file.size}</span>
                    {file.dimensions && (
                      <>
                        <span>·</span>
                        <span>{file.dimensions}</span>
                      </>
                    )}
                    {file.duration && (
                      <>
                        <span>·</span>
                        <span>{file.duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl bg-card card-shadow overflow-hidden">
          <div className="divide-y divide-border">
            {filteredFiles.map((file) => {
              const TypeIcon = typeIcons[file.type]
              const isSelected = selectedFiles.includes(file.id)

              return (
                <div
                  key={file.id}
                  className={cn(
                    "group flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                    isSelected && "bg-primary/5"
                  )}
                  onClick={() => setPreviewFile(file)}
                >
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSelect(file.id)
                    }}
                  >
                    <Checkbox checked={isSelected} />
                  </div>

                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-muted shrink-0">
                    {file.type === "image" ? (
                      <ImageIcon src={file.thumbnail || "/placeholder.svg"} alt={file.name} className="object-cover" />
                    ) : (
                      <div
                        className={cn(
                          "flex h-full items-center justify-center",
                          typeColors[file.type]
                        )}
                      >
                        <TypeIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.folder && (
                        <span className="inline-flex items-center gap-1 mr-2">
                          <FolderOpen className="h-3 w-3" />
                          {file.folder}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 w-20">
                      <HardDrive className="h-4 w-4" />
                      {file.size}
                    </span>
                    <span className="flex items-center gap-1 w-24">
                      <Calendar className="h-4 w-4" />
                      {new Date(file.uploadDate).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        Prévisualiser
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Copier l{"'"}URL
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewFile?.name}</DialogTitle>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              {previewFile.type === "image" && (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <ImageIcon src={previewFile.url || "/placeholder.svg"} alt={previewFile.name} className="object-contain" />
                </div>
              )}
              {previewFile.type !== "image" && (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                  {(() => {
                    const TypeIcon = typeIcons[previewFile.type]
                    return <TypeIcon className="h-24 w-24 text-muted-foreground/30" />
                  })()}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Taille</p>
                  <p className="font-medium">{previewFile.size}</p>
                </div>
                {previewFile.dimensions && (
                  <div>
                    <p className="text-muted-foreground">Dimensions</p>
                    <p className="font-medium">{previewFile.dimensions}</p>
                  </div>
                )}
                {previewFile.duration && (
                  <div>
                    <p className="text-muted-foreground">Durée</p>
                    <p className="font-medium">{previewFile.duration}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Date d{"'"}upload</p>
                  <p className="font-medium">
                    {new Date(previewFile.uploadDate).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {previewFile.folder && (
                  <div>
                    <p className="text-muted-foreground">Dossier</p>
                    <p className="font-medium">{previewFile.folder}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent">
                  <Copy className="mr-2 h-4 w-4" />
                  Copier l{"'"}URL
                </Button>
                <Button className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
