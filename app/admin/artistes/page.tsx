"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search, Plus, Filter, LayoutGrid, List, MoreHorizontal,
  Eye, Pencil, Star, Trash2, Music, Loader2, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { artistsApi, type ArtistList } from "@/lib/api";
import { toast } from "sonner";

export default function ArtistesPage() {
  const [artists, setArtists] = useState<ArtistList[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [featuredFilter, setFeaturedFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const fetchArtists = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "-created_at"); // plus récents en premier
      if (searchQuery) params.set("search", searchQuery);
      if (featuredFilter === "featured") params.set("is_featured", "true");
      if (featuredFilter === "regular") params.set("is_featured", "false");
      // genre filter via search since API may not have a genre param
      const data = await artistsApi.list(params.toString());
      // client-side genre filter
      const results =
        genreFilter === "all"
          ? data.results
          : data.results.filter((a) => a.genre_names.includes(genreFilter));
      setArtists(results);
    } catch {
      toast.error("Erreur lors du chargement des artistes");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, genreFilter, featuredFilter]);

  useEffect(() => { fetchArtists(); }, [fetchArtists]);

  useEffect(() => {
    artistsApi
      .genres()
      .then((g) => setGenres(g.map((x) => x.name)))
      .catch(() => {});
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cet artiste ?")) return;
    try {
      await artistsApi.delete(slug);
      toast.success("Artiste supprimé");
      fetchArtists();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleToggleFeatured = async (artist: ArtistList) => {
    try {
      await artistsApi.update(artist.slug, { is_featured: !artist.is_featured });
      toast.success(artist.is_featured ? "Mise en avant retirée" : "Artiste mis en avant");
      fetchArtists();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Artistes</h1>
          <p className="mt-1 text-muted-foreground">Gérez les profils d{"'"}artistes sur la plateforme</p>
        </div>
        <Button asChild>
          <Link href="/admin/artistes/nouveau">
            <Plus className="mr-2 h-4 w-4" />Nouvel Artiste
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
              {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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
              size="icon" className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon" className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Grid view */}
      {!loading && viewMode === "grid" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => (
            <div key={artist.id} className="group relative overflow-hidden rounded-xl bg-card card-shadow transition-all duration-300 hover:shadow-lg">
              {artist.is_featured && (
                <div className="absolute left-3 top-3 z-10">
                  <Badge className="bg-primary text-primary-foreground gap-1">
                    <Star className="h-3 w-3 fill-current" />Artiste du mois
                  </Badge>
                </div>
              )}
              <div className="absolute right-3 top-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link href={`/admin/artistes/${artist.slug}`}><Eye className="mr-2 h-4 w-4" />Voir le profil</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link href={`/admin/artistes/${artist.slug}/modifier`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleFeatured(artist)}>
                      <Star className="mr-2 h-4 w-4" />
                      {artist.is_featured ? "Retirer la mise en avant" : "Mettre en avant"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(artist.slug)}>
                      <Trash2 className="mr-2 h-4 w-4" />Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="relative aspect-square overflow-hidden bg-muted">
                <Image
                  src={artist.photo_url || "/placeholder.svg"}
                  alt={artist.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4">
                {artist.genre_names.length > 0 && (
                  <Badge variant="secondary" className="mb-2 bg-background/20 text-background backdrop-blur-sm">
                    {artist.genre_names[0]}
                  </Badge>
                )}
                <h3 className="font-display text-xl font-bold text-background">{artist.name}</h3>
                {artist.city && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-background/80">
                    <MapPin className="h-3 w-3" />{artist.city}
                  </p>
                )}
                {artist.bio && (
                  <p className="mt-1 text-sm text-background/70 line-clamp-2">{artist.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && viewMode === "list" && (
        <div className="space-y-4">
          {artists.map((artist) => (
            <div key={artist.id} className="group flex items-center gap-4 rounded-xl bg-card p-4 card-shadow transition-all hover:shadow-lg">
              <Avatar className="h-16 w-16 border-2 border-border">
                <AvatarImage src={artist.photo_url || "/placeholder.svg"} alt={artist.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-display text-lg">
                  {artist.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground truncate">{artist.name}</h3>
                  {artist.is_featured && (
                    <Badge className="bg-primary text-primary-foreground gap-1">
                      <Star className="h-3 w-3 fill-current" />Featured
                    </Badge>
                  )}
                </div>
                {artist.genre_names.length > 0 && (
                  <Badge variant="secondary" className="mt-1">{artist.genre_names.join(", ")}</Badge>
                )}
                {artist.city && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />{artist.city}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href={`/admin/artistes/${artist.slug}`}><Eye className="mr-2 h-4 w-4" />Voir le profil</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href={`/admin/artistes/${artist.slug}/modifier`}><Pencil className="mr-2 h-4 w-4" />Modifier</Link></DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleToggleFeatured(artist)}>
                    <Star className="mr-2 h-4 w-4" />
                    {artist.is_featured ? "Retirer" : "Mettre en avant"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(artist.slug)}>
                    <Trash2 className="mr-2 h-4 w-4" />Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && artists.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-card p-12 card-shadow text-center">
          <Music className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold">Aucun artiste trouvé</h3>
          <p className="mt-1 text-muted-foreground">Essayez de modifier vos filtres ou ajoutez un nouvel artiste.</p>
          <Button asChild className="mt-4">
            <Link href="/admin/artistes/nouveau">
              <Plus className="mr-2 h-4 w-4" />Ajouter un artiste
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
