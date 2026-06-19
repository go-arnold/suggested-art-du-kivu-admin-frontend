"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Loader2, MapPin, Star, Music, Video,
  Instagram, Facebook, Twitter, Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { artistsApi, type ArtistList } from "@/lib/api";
import { toast } from "sonner";

const SOCIAL = [
  { key: "instagram", icon: Instagram, label: "Instagram" },
  { key: "facebook", icon: Facebook, label: "Facebook" },
  { key: "twitter", icon: Twitter, label: "Twitter / X" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
] as const;

export default function ArtistDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    artistsApi
      .get(params.slug)
      .then(setArtist)
      .catch(() => {
        toast.error("Artiste introuvable");
        router.push("/admin/artistes");
      })
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!artist) return null;

  const genres = artist.genre_names ?? [];
  const links = (artist.social_links ?? {}) as Record<string, string | undefined>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/artistes"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Profil de l{"'"}artiste</h1>
            <p className="max-w-xs truncate font-mono text-xs text-muted-foreground">{artist.slug}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/artistes/${artist.slug}/modifier`}>
            <Pencil className="mr-2 h-4 w-4" />Modifier
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Carte profil */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card card-shadow overflow-hidden">
            <div className="relative aspect-square bg-muted">
              {artist.photo_url ? (
                <img
                  src={artist.photo_url}
                  alt={artist.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-display text-5xl text-primary/30">
                    {artist.name.charAt(0)}
                  </span>
                </div>
              )}
              {artist.is_featured && (
                <Badge className="absolute left-3 top-3 gap-1 bg-primary text-primary-foreground">
                  <Star className="h-3 w-3 fill-current" />Artiste du mois
                </Badge>
              )}
            </div>
            <div className="p-6">
              <h2 className="font-display text-2xl font-bold text-foreground">{artist.name}</h2>
              {artist.city && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {artist.city}
                  {artist.country ? `, ${artist.country}` : ""}
                </p>
              )}
              {genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <Badge key={g} variant="secondary">{g}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card p-4 text-center card-shadow">
              <Music className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="font-display text-xl font-bold text-foreground">
                {artist.release_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Sorties</p>
            </div>
            <div className="rounded-2xl bg-card p-4 text-center card-shadow">
              <Video className="mx-auto mb-1 h-5 w-5 text-info" />
              <p className="font-display text-xl font-bold text-foreground">
                {artist.video_count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Vidéos</p>
            </div>
          </div>
        </div>

        {/* Bio + réseaux */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card p-6 card-shadow">
            <h3 className="mb-3 font-semibold text-foreground">Biographie</h3>
            {artist.bio ? (
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                {artist.bio}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune biographie renseignée.</p>
            )}
          </div>

          <div className="rounded-2xl bg-card p-6 card-shadow">
            <h3 className="mb-4 font-semibold text-foreground">Réseaux sociaux</h3>
            {SOCIAL.some((s) => links[s.key]) ? (
              <div className="space-y-2">
                {SOCIAL.filter((s) => links[s.key]).map(({ key, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={links[key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="truncate text-xs text-muted-foreground">{links[key]}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun réseau social renseigné.</p>
            )}
            <Separator className="my-4" />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/admin/artistes/${artist.slug}/modifier`}>
                <Pencil className="mr-2 h-4 w-4" />Modifier le profil
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
