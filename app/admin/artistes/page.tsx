"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Plus, LayoutGrid, List, MoreVertical,
  Eye, Pencil, Star, Trash2, Music, Loader2, MapPin, ShieldCheck,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { artistsApi, type ArtistList } from "@/lib/api";
import { toast } from "sonner";

// Dégradés riches (clair → sombre) façon maquette pour les cartes sans photo.
const GRADIENTS = [
  "linear-gradient(160deg,#f0a88f,#c14f5a 55%,#6e2340)",
  "linear-gradient(160deg,#c3cfe2,#8ea6d4 48%,#4a5f9e)",
  "linear-gradient(160deg,#f0d29a,#c99a4f 52%,#6e4e22)",
  "linear-gradient(160deg,#a6d9c6,#3f9c81 52%,#12503c)",
  "linear-gradient(160deg,#c9b6ea,#7c63c9 52%,#332a63)",
];

export default function ArtistesPage() {
  const router = useRouter();
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
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Artistes</h1>
          <p>Gérez les profils d{"'"}artistes sur la plateforme</p>
        </div>
        <div className="h-actions">
          <Link href="/admin/artistes/nouveau" className="btn btn-red">
            <Plus strokeWidth={2.2} />Nouvel Artiste
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input
            placeholder="Rechercher un artiste..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="filter w-[180px]">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les genres</SelectItem>
            {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={featuredFilter} onValueChange={setFeaturedFilter}>
          <SelectTrigger className="filter w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="featured">Mis en avant</SelectItem>
            <SelectItem value="regular">Standard</SelectItem>
          </SelectContent>
        </Select>
        <div className="view-tog">
          <button
            className={viewMode === "grid" ? "on" : ""}
            onClick={() => setViewMode("grid")}
            aria-label="Vue grille"
          >
            <LayoutGrid />
          </button>
          <button
            className={viewMode === "list" ? "on" : ""}
            onClick={() => setViewMode("list")}
            aria-label="Vue liste"
          >
            <List />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
          <Loader2 className="animate-spin" style={{ width: 32, height: 32, color: "var(--t3)" }} />
        </div>
      )}

      {/* Grid view */}
      {!loading && artists.length > 0 && viewMode === "grid" && (
        <div className="cards">
          {artists.map((artist, i) => (
            <div
              className="a-card"
              key={artist.id}
              onClick={() => router.push(`/admin/artistes/${artist.slug}`)}
            >
              <div
                className="a-photo"
                style={
                  artist.photo_url
                    ? { backgroundImage: `url(${artist.photo_url})` }
                    : { background: GRADIENTS[i % GRADIENTS.length] }
                }
              />
              <div className="a-scrim" />
              <div className="a-top">
                {artist.is_featured ? (
                  <span className="a-badge"><Star />En vedette</span>
                ) : (
                  <span className="a-badge"><span className="bd" style={{ background: "#3ddc97" }} />Actif</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="a-menu" onClick={(e) => e.stopPropagation()} aria-label="Actions">
                      <MoreVertical />
                    </button>
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
              <div className="a-info">
                <div className="a-name">
                  {artist.name}
                  {artist.is_featured && <ShieldCheck />}
                </div>
                {artist.genre_names.length > 0 && (
                  <div className="a-genre"><Music />{artist.genre_names.join(" · ")}</div>
                )}
                {(artist.city || artist.country) && (
                  <div className="a-genre">
                    <MapPin />{[artist.city, artist.country].filter(Boolean).join(", ")}
                  </div>
                )}
                <div className="a-stats">
                  <div className="a-st"><b>{artist.release_count ?? 0}</b><span>sorties</span></div>
                  <div className="a-st"><b>{artist.video_count ?? 0}</b><span>vidéos</span></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && artists.length > 0 && viewMode === "list" && (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Artiste</th>
                <th>Genres</th>
                <th>Statut</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => (
                <tr key={artist.id}>
                  <td>
                    <div className="art-cell">
                      <div className="art-thumb">
                        {artist.photo_url ? <img src={artist.photo_url} alt={artist.name} /> : <Music />}
                      </div>
                      <div>
                        <div className="art-t">{artist.name}</div>
                        {artist.city && <div className="art-s">{artist.city}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {artist.genre_names.length > 0
                      ? <span className="cat">{artist.genre_names.join(", ")}</span>
                      : <span className="muted">—</span>}
                  </td>
                  <td>
                    {artist.is_featured
                      ? <span className="badge b-gold"><span className="bd" />À la une</span>
                      : <span className="badge b-gray"><span className="bd" />Standard</span>}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="row-act" aria-label="Actions"><MoreVertical /></button>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!loading && artists.length === 0 && (
        <div className="ph">
          <div className="ph-ic"><Music /></div>
          <h3>Aucun artiste trouvé</h3>
          <p>Essayez de modifier vos filtres ou ajoutez un nouvel artiste.</p>
          <Link href="/admin/artistes/nouveau" className="btn btn-red">
            <Plus strokeWidth={2.2} />Ajouter un artiste
          </Link>
        </div>
      )}
    </section>
  );
}
