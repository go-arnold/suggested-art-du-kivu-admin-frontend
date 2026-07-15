"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X, Loader2, Instagram, Facebook, Twitter, Youtube, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { artistsApi, uploadToCloudinary } from "@/lib/api";
import { MediaUpload } from "@/components/admin/media-upload";
import { toast } from "sonner";

export default function NouvelArtistePage() {
  const router = useRouter();

  const [name,       setName]       = useState("");
  const [bio,        setBio]        = useState("");
  const [city,       setCity]       = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [instagram,  setInstagram]  = useState("");
  const [facebook,   setFacebook]   = useState("");
  const [twitter,    setTwitter]    = useState("");
  const [youtube,    setYoutube]    = useState("");
  const [photo,      setPhoto]      = useState<string | null>(null);
  const [cover,      setCover]      = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Téléverse la photo vers Cloudinary (via signature backend) et garde l'URL.
  const handleImage = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      setPhoto(await uploadToCloudinary(file, "artist_photo"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Le nom est requis"); return; }

    setSubmitting(true);
    try {
      // Build social_links object — only include non-empty values
      const social_links: Record<string, string> = {};
      if (instagram.trim()) social_links.instagram = instagram.trim();
      if (facebook.trim())  social_links.facebook  = facebook.trim();
      if (twitter.trim())   social_links.twitter   = twitter.trim();
      if (youtube.trim())   social_links.youtube   = youtube.trim();

      await artistsApi.create({
        name:        name.trim(),
        bio:         bio.trim() || undefined,
        city:        city.trim() || undefined,
        photo:       photo || undefined,
        cover_image: cover || undefined,
        is_featured: isFeatured,
        social_links: Object.keys(social_links).length ? social_links : undefined,
      });

      toast.success("Artiste créé avec succès");
      router.push("/admin/artistes");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/artistes"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Nouvel Artiste</h1>
          <p className="text-sm text-muted-foreground">Ajouter un artiste à la plateforme</p>
        </div>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer l&apos;artiste
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div className="space-y-6">
          {/* Identity */}
          <div className="rounded-xl bg-card p-6 card-shadow space-y-5">
            <h3 className="font-semibold text-foreground">Informations</h3>

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

          {/* Social links */}
          <div className="rounded-xl bg-card p-6 card-shadow space-y-4">
            <h3 className="font-semibold text-foreground">Réseaux sociaux</h3>
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Photo */}
          <div className="rounded-xl bg-card p-6 card-shadow space-y-4">
            <h3 className="font-semibold text-foreground">Photo</h3>
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
                onClick={() => !uploadingPhoto && fileRef.current?.click()}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Téléversement…</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Ajouter une photo</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG — max 5MB</p>
                  </>
                )}
              </div>
            )}

            <MediaUpload
              label="Bannière" context="artist_cover" aspect="video"
              value={cover} onChange={setCover}
            />
          </div>

          {/* Options */}
          <div className="rounded-xl bg-card p-6 card-shadow space-y-4">
            <h3 className="font-semibold text-foreground">Options</h3>
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

          {/* Live preview */}
          {name && (
            <div className="rounded-xl bg-card p-4 card-shadow">
              <p className="text-xs text-muted-foreground mb-3">Aperçu de la carte</p>
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="relative h-32 bg-muted flex items-center justify-center">
                  {photo
                    ? <img src={photo} alt={name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    : <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display text-xl">
                        {name.charAt(0)}
                      </div>}
                  {isFeatured && (
                    <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground gap-1 text-xs">
                      <Star className="h-3 w-3 fill-current" />Artiste du mois
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-semibold text-sm">{name}</p>
                  {city && <p className="text-xs text-muted-foreground">{city}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
