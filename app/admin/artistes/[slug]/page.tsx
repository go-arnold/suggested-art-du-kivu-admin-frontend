"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Loader2, MapPin, Star, Music, Video, Image as ImageIcon,
  Instagram, Facebook, Twitter, Youtube, Play, Pause, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { artistsApi, type ArtistDetail, type ArtistVideo, type ArtistPhoto } from "@/lib/api";
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
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Lecture audio des sons (élément <audio> partagé).
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  // Vidéo / photo en plein écran.
  const [video, setVideo] = useState<ArtistVideo | null>(null);
  const [photo, setPhoto] = useState<ArtistPhoto | null>(null);

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

  const togglePlay = (id: number, url?: string | null) => {
    const audio = audioRef.current;
    if (!audio || !url) { toast.error("Aucun extrait audio disponible"); return; }
    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = url;
    audio.play().then(() => setPlayingId(id)).catch(() => {
      toast.error("Lecture impossible (source non compatible / CORS)");
      setPlayingId(null);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!artist) return null;

  const genres = artist.genres?.map((g) => g.name) ?? artist.genre_names ?? [];
  const links = (artist.social_links ?? {}) as Record<string, string | undefined>;
  const releases = artist.releases ?? [];
  const videos = artist.videos ?? [];
  const gallery = artist.gallery ?? [];

  return (
    <section className="view">
      <audio ref={audioRef} className="hidden" onEnded={() => setPlayingId(null)} />

      {/* Header */}
      <div className="page-h">
        <div className="flex items-center gap-3">
          <Link href="/admin/artistes" className="btn btn-ghost" style={{ padding: "0 10px" }} aria-label="Retour">
            <ArrowLeft />
          </Link>
          <div>
            <h1>{artist.name}</h1>
            <p className="font-mono text-xs">{artist.slug}</p>
          </div>
        </div>
        <div className="h-actions">
          <Link href={`/admin/artistes/${artist.slug}/modifier`} className="btn btn-red">
            <Pencil />Modifier
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Carte profil */}
        <div className="space-y-6">
          <div className="panel overflow-hidden">
            <div className="relative aspect-square bg-muted">
              {artist.photo_url ? (
                <img src={artist.photo_url} alt={artist.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="font-display text-5xl text-primary/30">{artist.name.charAt(0)}</span>
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
                  <MapPin className="h-4 w-4" />{artist.city}{artist.country ? `, ${artist.country}` : ""}
                </p>
              )}
              {genres.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="panel p-4 text-center">
              <Music className="mx-auto mb-1 h-5 w-5 text-primary" />
              <p className="font-display text-xl font-bold text-foreground">{artist.release_count ?? releases.length}</p>
              <p className="text-xs text-muted-foreground">Sorties</p>
            </div>
            <div className="panel p-4 text-center">
              <Video className="mx-auto mb-1 h-5 w-5 text-info" />
              <p className="font-display text-xl font-bold text-foreground">{artist.video_count ?? videos.length}</p>
              <p className="text-xs text-muted-foreground">Vidéos</p>
            </div>
          </div>
        </div>

        {/* Bio + réseaux */}
        <div className="space-y-6">
          <div className="panel p-6">
            <h3 className="mb-3 font-semibold text-foreground">Biographie</h3>
            {artist.bio ? (
              <p className="whitespace-pre-line leading-relaxed text-muted-foreground">{artist.bio}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune biographie renseignée.</p>
            )}
          </div>

          <div className="panel p-6">
            <h3 className="mb-4 font-semibold text-foreground">Réseaux sociaux</h3>
            {SOCIAL.some((s) => links[s.key]) ? (
              <div className="space-y-2">
                {SOCIAL.filter((s) => links[s.key]).map(({ key, icon: Icon, label }) => (
                  <a key={key} href={links[key]} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted">
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

      {/* ── Sons ── */}
      <div className="panel mt-6">
        <div className="panel-h">
          <div><h3>Sons &amp; sorties</h3><div className="sub">{releases.length} élément{releases.length > 1 ? "s" : ""}</div></div>
          <Link href="/admin/releases" className="link">Gérer</Link>
        </div>
        <div className="panel-b">
          {releases.length === 0 ? (
            <p className="muted" style={{ padding: "6px 0" }}>Aucun son associé à cet artiste.</p>
          ) : (
            <div className="m-grid">
              {releases.map((r) => (
                <div className="m-card" key={r.id}>
                  <div className="m-cover c3">
                    {r.cover_url && <img src={r.cover_url} alt={r.title} loading="lazy" />}
                    <div className="m-play">
                      <button className="pb" onClick={() => togglePlay(r.id, r.preview_url)} aria-label="Lecture">
                        {playingId === r.id ? <Pause /> : <Play />}
                      </button>
                    </div>
                  </div>
                  <div className="m-body">
                    <div className="m-title">{r.title}</div>
                    <div className="m-series">{r.format}{r.release_date ? ` · ${new Date(r.release_date).getFullYear()}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Vidéos ── */}
      <div className="panel mt-6">
        <div className="panel-h">
          <div><h3>Vidéos</h3><div className="sub">{videos.length} vidéo{videos.length > 1 ? "s" : ""}</div></div>
          <Link href="/admin/webtv" className="link">Web TV</Link>
        </div>
        <div className="panel-b">
          {videos.length === 0 ? (
            <p className="muted" style={{ padding: "6px 0" }}>Aucune vidéo associée à cet artiste.</p>
          ) : (
            <div className="m-grid">
              {videos.map((v) => (
                <div className="m-card" key={v.id} onClick={() => setVideo(v)} style={{ cursor: "pointer" }}>
                  <div className="m-cover c2">
                    {v.thumbnail_url && <img src={v.thumbnail_url} alt={v.title} loading="lazy" />}
                    <div className="m-play"><div className="pb"><Play /></div></div>
                  </div>
                  <div className="m-body">
                    <div className="m-title">{v.title}</div>
                    <div className="m-meta">
                      {v.duration && <span className="mi">{v.duration}</span>}
                      {typeof v.view_count === "number" && <span className="mi"><Eye />{v.view_count}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Photos ── */}
      <div className="panel mt-6">
        <div className="panel-h">
          <div><h3>Galerie photos</h3><div className="sub">{gallery.length} photo{gallery.length > 1 ? "s" : ""}</div></div>
        </div>
        <div className="panel-b">
          {gallery.length === 0 ? (
            <p className="muted" style={{ padding: "6px 0" }}>Aucune photo dans la galerie.</p>
          ) : (
            <div className="assets">
              {gallery.map((p) => (
                <div className="asset" key={p.id} onClick={() => setPhoto(p)}>
                  <div className="asset-th">
                    {p.image_url ? <img src={p.image_url} alt={p.caption || artist.name} loading="lazy" /> : <ImageIcon />}
                  </div>
                  {p.caption && <div className="asset-b"><div className="t">{p.caption}</div></div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lecteur vidéo */}
      <Dialog open={!!video} onOpenChange={(o) => !o && setVideo(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{video?.title}</DialogTitle></DialogHeader>
          {video && (
            <video src={video.video_url} controls autoPlay playsInline className="w-full rounded-lg bg-black" />
          )}
        </DialogContent>
      </Dialog>

      {/* Lightbox photo */}
      <Dialog open={!!photo} onOpenChange={(o) => !o && setPhoto(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{photo?.caption || "Photo"}</DialogTitle></DialogHeader>
          {photo && <img src={photo.image_url} alt={photo.caption || ""} className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
