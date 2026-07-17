"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { WifiOff, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HlsPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  /** Message affiché si le flux ne démarre pas (ex. direct pas encore lancé). */
  emptyLabel?: string;
  /** Démarrer en muet (autorise la lecture auto par le navigateur). */
  muted?: boolean;
}

/**
 * Lecteur HLS (Cloudflare Stream) cross-navigateur.
 * Utilise hls.js quand disponible, sinon la lecture native (Safari).
 * Affiche un message clair si le flux est indisponible plutôt que de tourner
 * indéfiniment (cas d'un direct sans diffusion active / enregistrement absent).
 */
export function HlsPlayer({ src, poster, className, emptyLabel, muted }: HlsPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "playing" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    setStatus("loading");

    const onPlaying = () => setStatus("playing");
    video.addEventListener("playing", onPlaying);

    // Si rien ne démarre au bout de 20 s, on considère le flux indisponible.
    const timer = setTimeout(() => {
      setStatus((s) => (s === "loading" ? "error" : s));
    }, 20000);

    let hls: Hls | undefined;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) setStatus("error");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("error", () => setStatus("error"));
    } else {
      setStatus("error");
    }

    return () => {
      clearTimeout(timer);
      video.removeEventListener("playing", onPlaying);
      hls?.destroy();
      // Stoppe COMPLÈTEMENT la balise vidéo, sinon l'audio continue après
      // fermeture / se superpose à la réouverture (effet d'écho/répétition).
      try {
        video.pause();
        video.removeAttribute("src");
        video.load();
      } catch { /* élément déjà démonté */ }
    };
  }, [src, retry]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={ref}
        controls
        autoPlay
        muted={muted}
        playsInline
        poster={poster}
        className={cn("h-full w-full bg-black", className)}
      />

      {status === "loading" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 text-center text-sm text-white">
          <WifiOff className="h-8 w-8" />
          <p>{emptyLabel ?? "Flux indisponible pour le moment."}</p>
          <p className="text-xs text-white/60">Réessayez une fois la diffusion réellement démarrée.</p>
          <Button size="sm" variant="secondary" onClick={() => setRetry((r) => r + 1)}>
            <RotateCw className="mr-2 h-4 w-4" />Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
