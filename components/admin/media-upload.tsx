"use client";

import { useRef, useState, type DragEvent } from "react";
import { Upload, X, Loader2, ImageIcon, FileAudio, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "@/lib/api";
import { toast } from "sonner";

interface MediaUploadProps {
  /** URL actuelle (image/fichier déjà téléversé). */
  value: string | null;
  /** Appelé avec la nouvelle URL (ou null si retiré). */
  onChange: (url: string | null) => void;
  /** Contexte backend (ex. "artist_photo", "podcast_cover", "episode_audio"). */
  context: string;
  /** Types de fichiers acceptés. */
  accept?: string;
  /** Variante d'aperçu : image (défaut), audio ou video. */
  variant?: "image" | "audio" | "video";
  /** Ratio de l'aperçu image. */
  aspect?: "video" | "square";
  label?: string;
  disabled?: boolean;
}

/**
 * Upload de média : téléverse le fichier vers Cloudinary (signature backend)
 * et remonte l'URL via onChange. Réutilisable pour couvertures, photos, audio…
 */
export function MediaUpload({
  value, onChange, context, accept = "image/*",
  variant = "image", aspect = "video", label, disabled,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && !uploading) handleFile(e.dataTransfer.files?.[0]);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, context);
      onChange(url);
      toast.success("Fichier téléversé");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec du téléversement");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Borne la largeur : pochette carrée compacte, vidéo medium, reste pleine largeur.
  const widthClass =
    variant === "image" && aspect === "square" ? "max-w-[220px]" :
    variant === "video" ? "max-w-md" : "";

  return (
    <div className={cn("space-y-1.5", widthClass)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      <input
        ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted">
          {variant === "audio" ? (
            <div className="flex items-center gap-3 p-3">
              <FileAudio className="h-8 w-8 shrink-0 text-primary" />
              <audio src={value} controls className="h-9 w-full" />
            </div>
          ) : variant === "video" ? (
            <div className="aspect-video">
              <video src={value} controls className="h-full w-full bg-black" />
            </div>
          ) : (
            <div className={cn(aspect === "square" ? "aspect-square" : "aspect-video")}>
              <img src={value} alt={label ?? "Aperçu"} className="h-full w-full object-cover" />
            </div>
          )}
          <Button
            type="button" variant="destructive" size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            disabled={disabled || uploading}
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            type="button" variant="secondary" size="sm"
            className="absolute bottom-2 right-2"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            Remplacer
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled && !uploading) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Téléversement…</span>
            </>
          ) : (
            <>
              {variant === "audio" ? <FileAudio className="h-7 w-7 text-muted-foreground" /> : variant === "video" ? <Film className="h-7 w-7 text-muted-foreground" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" />Choisir un fichier ou glisser-déposer
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
