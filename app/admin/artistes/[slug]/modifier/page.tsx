"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Upload, X, Loader2, Instagram, Facebook, Twitter, Youtube, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { artistsApi, type Genre } from "@/lib/api";
import { toast } from "sonner";

export default function ModifierArtistePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [name,       setName]       = useState("");
  const [bio,        setBio]        = useState("");
  const [city,       setCity]       = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [instagram,  setInstagram]  = useState("");
  const [facebook,   setFacebook]   = useState("");
  const [twitter,    setTwitter]    = useState("");
  const [youtube,    setYoutube]    = useState("");
  const [photo,      setPhoto]      = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Genres (Rap, Gospel, RnB, …)
  const [allGenres, setAllGenres] = useState<Genre[]>([]);
  const [genres, setGenres] = useState<number[]>([]);
  useEffect(() => { artistsApi.genres().then(setAllGenres).catch(() => {}); }, []);
  const toggleGenre = (id: number) =>
    setGenres((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const fileRef = useRef<HTMLInputElement>(null);

  // Charge l'artiste à éditer
  useEffect(() => {
    artistsApi.get(slug).then((a) => {
      setName(a.name ?? "");
      setBio(a.bio ?? "");
      setCity(a.city ?? "");
      setIsFeatured(a.is_featured);
      setPhoto(a.photo_url ?? null);
      setGenres(a.genres?.map((g) => g.id) ?? []);
      const links = (a.social_links ?? {}) as Record<string, string | undefined>;
      setInstagram(links.instagram ?? "");
      setFacebook(links.facebook ?? "");
      setTwitter(links.twitter ?? "");
      setYoutube(links.youtube ?? "");
    }).catch(() => {
      toast.error("Artiste introuvable");
      router.push("/admin/artistes");
    }).finally(() => setLoadingData(false));
  }, [slug, router]);

  const handleImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Le nom est requis"); return; }

    setSubmitting(true);
    try {
      const social_links: Record<string, string> = {};
      if (instagram.trim()) social_links.instagram = instagram.trim();
      if (facebook.trim())  social_links.facebook  = facebook.trim();
      if (twitter.trim())   social_links.twitter   = twitter.trim();
      if (youtube.trim())   social_links.youtube   = youtube.trim();

      await artistsApi.update(slug, {
        name:        name.trim(),
        bio:         bio.trim() || undefined,
        city:        city.trim() || undefined,
        is_featured: isFeatured,
        genres:      genres,
        social_links: Object.keys(social_links).length ? social_links : undefined,
      });

      toast.success("Artiste mis à jour");
      router.push(`/admin/artistes/${slug}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div className="flex items-center gap-3">
          <Link href={`/admin/artistes/${slug}`} className="btn btn-ghost" style={{ padding: "0 10px" }} aria-label="Retour">
            <ArrowLeft />
          </Link>
          <div>
            <h1>Modifier l&apos;artiste</h1>
            <p>Mettez à jour les informations de l&apos;artiste</p>
          </div>
        </div>
        <div className="h-actions">
          <button className="btn btn-red" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="edit-grid">
        {/* Main */}
        <div className="edit-col">
          <div className="panel">
            <div className="panel-h"><div><h3>Informations</h3></div></div>
            <div className="panel-b space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;artiste *</Label>
                <Input id="name" placeholder="Ex: Fally Ipupa" value={name}
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Biographie</Label>
                <Textarea id="bio" placeholder="Décrivez cet artiste..." rows={5}
                  value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" placeholder="Ex: Goma" value={city}
                  onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Social links */}
          <div className="panel">
            <div className="panel-h"><div><h3>Réseaux sociaux</h3></div></div>
            <div className="panel-b space-y-4">
              {[
                { label: "Instagram", value: instagram, set: setInstagram, icon: Instagram, placeholder: "https://instagram.com/..." },
                { label: "Facebook",  value: facebook,  set: setFacebook,  icon: Facebook,  placeholder: "https://facebook.com/..." },
                { label: "Twitter / X", value: twitter, set: setTwitter,   icon: Twitter,   placeholder: "https://x.com/..." },
                { label: "YouTube",   value: youtube,   set: setYoutube,   icon: Youtube,   placeholder: "https://youtube.com/..." },
              ].map(({ label, value, set, icon: Icon, placeholder }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input placeholder={placeholder} value={value}
                      onChange={(e) => set(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="edit-col">
          {/* Photo */}
          <div className="panel">
            <div className="panel-h"><div><h3>Photo</h3></div></div>
            <div className="panel-b space-y-4">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])} />
              {photo ? (
                <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={photo} alt="Preview" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  <Button variant="destructive" size="icon"
                    className="absolute right-2 top-2 h-8 w-8"
                    onClick={() => setPhoto(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Ajouter une photo</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG — max 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="panel">
            <div className="panel-h"><div><h3>Options</h3></div></div>
            <div className="panel-b">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" />
                    Artiste du mois
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Mettre en avant sur la page d&apos;accueil</p>
                </div>
                <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
            </div>
          </div>

          {/* Genres */}
          <div className="panel">
            <div className="panel-h"><div><h3>Genres</h3></div></div>
            <div className="panel-b">
              {allGenres.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun genre disponible.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allGenres.map((g) => {
                    const on = genres.includes(g.id);
                    return (
                      <button type="button" key={g.id} onClick={() => toggleGenre(g.id)}
                        className={`badge ${on ? "b-red" : "b-gray"}`} style={{ cursor: "pointer" }}>
                        {g.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
