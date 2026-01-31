"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Search,
  Plus,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  Eye,
  Pencil,
  Star,
  Trash2,
  Music,
  Heart,
  Play,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Artist {
  id: string
  name: string
  genre: string
  bio: string
  photo: string
  featured: boolean
  views: number
  likes: number
  videos: number
  socials: {
    instagram?: string
    facebook?: string
    twitter?: string
    youtube?: string
  }
}

const artists: Artist[] = [
  {
    id: "1",
    name: "Marie Kalume",
    genre: "Musique Traditionnelle",
    bio: "Chanteuse et compositrice originaire de Bukavu, Marie perpétue les traditions musicales du Kivu.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: true,
    views: 15420,
    likes: 1234,
    videos: 8,
    socials: { instagram: "#", facebook: "#", youtube: "#" },
  },
  {
    id: "2",
    name: "Patrick Mwamba",
    genre: "Peinture Contemporaine",
    bio: "Artiste peintre reconnu pour ses œuvres mêlant tradition et modernité.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: false,
    views: 8756,
    likes: 892,
    videos: 3,
    socials: { instagram: "#", facebook: "#" },
  },
  {
    id: "3",
    name: "Les Tambours du Kivu",
    genre: "Percussion",
    bio: "Groupe de percussionnistes préservant l'art ancestral des tambours.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: true,
    views: 22341,
    likes: 2156,
    videos: 12,
    socials: { youtube: "#", facebook: "#" },
  },
  {
    id: "4",
    name: "Amani Collective",
    genre: "Art Visuel",
    bio: "Collectif d'artistes visuels engagés pour la paix à travers l'art.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: false,
    views: 6234,
    likes: 567,
    videos: 5,
    socials: { instagram: "#", twitter: "#" },
  },
  {
    id: "5",
    name: "Sophie Bashige",
    genre: "Danse Contemporaine",
    bio: "Danseuse et chorégraphe fusionnant danses traditionnelles et contemporaines.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: false,
    views: 9876,
    likes: 1023,
    videos: 7,
    socials: { instagram: "#", youtube: "#" },
  },
  {
    id: "6",
    name: "Jean-Paul Mukendi",
    genre: "Sculpture",
    bio: "Sculpteur travaillant le bois et la pierre, inspiré par la nature du Kivu.",
    photo: "/placeholder.svg?height=400&width=400",
    featured: true,
    views: 5432,
    likes: 456,
    videos: 2,
    socials: { facebook: "#" },
  },
]

const genres = [...new Set(artists.map((a) => a.genre))]

export default function ArtistesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [genreFilter, setGenreFilter] = useState<string>("all")
  const [featuredFilter, setFeaturedFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredArtists = artists.filter((artist) => {
    const matchesSearch = artist.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
    const matchesGenre = genreFilter === "all" || artist.genre === genreFilter
    const matchesFeatured =
      featuredFilter === "all" ||
      (featuredFilter === "featured" && artist.featured) ||
      (featuredFilter === "regular" && !artist.featured)
    return matchesSearch && matchesGenre && matchesFeatured
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Artistes
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gérez les profils d{"'"}artistes sur la plateforme
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/artistes/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Artiste
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un artiste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={genreFilter} onValueChange={setGenreFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="featured">Mis en avant</SelectItem>
              <SelectItem value="regular">Standard</SelectItem>
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

      {/* Artists Grid */}
      {viewMode === "grid" ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="group relative overflow-hidden rounded-xl bg-card card-shadow transition-all duration-300 hover:shadow-lg"
            >
              {/* Featured Badge */}
              {artist.featured && (
                <div className="absolute left-3 top-3 z-10">
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Artiste du mois
                  </Badge>
                </div>
              )}

              {/* Actions */}
              <div className="absolute right-3 top-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir le profil
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Pencil className="mr-2 h-4 w-4" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Star className="mr-2 h-4 w-4" />
                      {artist.featured ? "Retirer la mise en avant" : "Mettre en avant"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Photo */}
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={artist.photo || "/placeholder.svg"}
                  alt={artist.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-card">
                <Badge
                  variant="secondary"
                  className="mb-2 bg-background/20 text-background backdrop-blur-sm"
                >
                  {artist.genre}
                </Badge>
                <h3 className="font-display text-xl font-bold text-background">
                  {artist.name}
                </h3>
                <p className="mt-1 text-sm text-background/80 line-clamp-2">
                  {artist.bio}
                </p>

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-sm text-background/70">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {artist.views.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {artist.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    {artist.videos}
                  </span>
                </div>

                {/* Social Links */}
                <div className="mt-3 flex items-center gap-2">
                  {artist.socials.instagram && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-background/70 hover:text-background hover:bg-background/20"
                    >
                      <Instagram className="h-4 w-4" />
                    </Button>
                  )}
                  {artist.socials.facebook && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-background/70 hover:text-background hover:bg-background/20"
                    >
                      <Facebook className="h-4 w-4" />
                    </Button>
                  )}
                  {artist.socials.twitter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-background/70 hover:text-background hover:bg-background/20"
                    >
                      <Twitter className="h-4 w-4" />
                    </Button>
                  )}
                  {artist.socials.youtube && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-background/70 hover:text-background hover:bg-background/20"
                    >
                      <Youtube className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArtists.map((artist) => (
            <div
              key={artist.id}
              className="group flex items-center gap-4 rounded-xl bg-card p-4 card-shadow transition-all hover:shadow-lg"
            >
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={artist.photo || "/placeholder.svg"} alt={artist.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-display text-lg">
                  {artist.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground truncate">
                    {artist.name}
                  </h3>
                  {artist.featured && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="mt-1">
                  {artist.genre}
                </Badge>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                  {artist.bio}
                </p>
              </div>

              <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {artist.views.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-4 w-4" />
                  {artist.likes.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Play className="h-4 w-4" />
                  {artist.videos}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Eye className="mr-2 h-4 w-4" />
                    Voir le profil
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Star className="mr-2 h-4 w-4" />
                    {artist.featured ? "Retirer" : "Mettre en avant"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredArtists.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card p-12 card-shadow text-center">
          <Music className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold">
            Aucun artiste trouvé
          </h3>
          <p className="mt-1 text-muted-foreground">
            Essayez de modifier vos filtres ou ajoutez un nouvel artiste.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/artistes/nouveau">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un artiste
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
