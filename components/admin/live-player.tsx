"use client";

import {
  createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode, type CSSProperties,
} from "react";
import Hls from "hls.js";
import { Radio, Play, Pause, Eye, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";

export interface LiveInfo {
  title: string;
  location?: string;
  hlsUrl?: string | null;
  viewers?: number;
  messages?: number;
}

interface LivePlayerCtx {
  live: LiveInfo | null;
  startLive: (info: LiveInfo) => void;
  stopLive: () => void;
}

const Ctx = createContext<LivePlayerCtx | null>(null);

export function useLivePlayer(): LivePlayerCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLivePlayer doit être utilisé dans <LivePlayerProvider>");
  return c;
}

export function LivePlayerProvider({ children }: { children: ReactNode }) {
  const [live, setLive] = useState<LiveInfo | null>(null);

  const startLive = useCallback((info: LiveInfo) => {
    setLive(info);
    toast.success(`${info.title} est en direct`);
  }, []);

  const stopLive = useCallback(() => setLive(null), []);

  return (
    <Ctx.Provider value={{ live, startLive, stopLive }}>
      {children}
      {live && <LivePlayerBar live={live} onClose={stopLive} />}
    </Ctx.Provider>
  );
}

/* ── Styles inline (indépendants de globals.css pour être fiables en dev) ── */
const INK = "#14162b";
const RED = "#e8433f";

const S: Record<string, CSSProperties> = {
  bar: {
    position: "fixed",
    left: "var(--sb, 256px)",
    right: 0,
    bottom: 0,
    height: 66,
    background: INK,
    color: "#fff",
    zIndex: 60,
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 22px",
    boxShadow: "0 -8px 30px rgba(20,22,43,.18)",
    animation: "akvPlayerIn .35s cubic-bezier(.16,1,.3,1)",
  },
  thumb: {
    width: 44, height: 44, borderRadius: 10, flexShrink: 0, position: "relative",
    background: "linear-gradient(135deg,#3a2f4f,#5a3f4f)", display: "grid", placeItems: "center",
  },
  liveb: {
    position: "absolute", top: 3, left: 3, fontSize: 8, fontWeight: 700,
    background: RED, padding: "1px 5px", borderRadius: 4, letterSpacing: ".3px",
  },
  info: { minWidth: 150 },
  title: {
    fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden",
    textOverflow: "ellipsis", maxWidth: 220,
  },
  sub: { fontSize: 11.5, color: "#8e92ae", display: "flex", alignItems: "center", gap: 6, marginTop: 2 },
  pulse: { width: 6, height: 6, borderRadius: "50%", background: RED, animation: "akvPulse 1.4s infinite" },
  mainBtn: {
    width: 42, height: 42, borderRadius: "50%", background: "#fff", color: INK,
    display: "grid", placeItems: "center", flexShrink: 0, cursor: "pointer", border: "none",
  },
  wave: { flex: 1, display: "flex", alignItems: "center", gap: 3, height: 32, minWidth: 0, margin: "0 6px" },
  meta: { display: "flex", alignItems: "center", gap: 16, flexShrink: 0 },
  metaItem: { fontSize: 12, color: "#b9bcd4", display: "flex", alignItems: "center", gap: 6 },
  close: {
    color: "#7e82a0", padding: 6, borderRadius: 8, cursor: "pointer",
    background: "none", border: "none", display: "grid", placeItems: "center",
  },
};

const KEYFRAMES = `
@keyframes akvPlayerIn { from { transform: translateY(100%); } to { transform: none; } }
@keyframes akvPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes akvWv { 0%,100% { height: 22%; } 50% { height: 88%; } }
`;

function LivePlayerBar({ live, onClose }: { live: LiveInfo; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // Décale le contenu pour qu'il ne passe pas sous la barre fixe (66px).
  useEffect(() => {
    const canvas = document.querySelector<HTMLElement>(".canvas");
    const prev = canvas?.style.paddingBottom ?? "";
    if (canvas) canvas.style.paddingBottom = "90px";
    return () => { if (canvas) canvas.style.paddingBottom = prev; };
  }, []);

  // Charge le flux HLS du direct (audio) lorsqu'il est disponible.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !live.hlsUrl) return;
    let hls: Hls | null = null;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = live.hlsUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(live.hlsUrl);
      hls.attachMedia(video);
    }
    return () => { hls?.destroy(); };
  }, [live.hlsUrl]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video || !live.hlsUrl) { setPlaying((p) => !p); return; }
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div style={S.bar}>
        <video ref={videoRef} style={{ display: "none" }} playsInline />

        <div style={S.thumb}>
          <span style={S.liveb}>LIVE</span>
          <Radio style={{ width: 20, height: 20, color: "#fff" }} />
        </div>

        <div style={S.info}>
          <div style={S.title}>{live.title}</div>
          <div style={S.sub}>
            <span style={S.pulse} />En direct{live.location ? ` · ${live.location}` : ""}
          </div>
        </div>

        <button style={S.mainBtn} onClick={toggle} aria-label={playing ? "Pause" : "Lecture"}>
          {playing ? <Pause style={{ width: 20, height: 20 }} /> : <Play style={{ width: 20, height: 20 }} />}
        </button>

        <div style={S.wave} aria-hidden="true">
          {Array.from({ length: 40 }).map((_, i) => (
            <i
              key={i}
              style={{
                flex: 1,
                maxWidth: 4,
                borderRadius: 3,
                background: i % 3 === 0 && playing ? RED : "#3a3d5c",
                height: `${20 + ((i * 41) % 70)}%`,
                animation: "akvWv 1.1s ease-in-out infinite",
                animationDelay: `${i * 0.05}s`,
                animationPlayState: playing ? "running" : "paused",
              }}
            />
          ))}
        </div>

        <div style={S.meta}>
          {typeof live.viewers === "number" && (
            <span style={S.metaItem}><Eye style={{ width: 14, height: 14 }} />{live.viewers.toLocaleString("fr-FR")}</span>
          )}
          {typeof live.messages === "number" && (
            <span style={S.metaItem}><MessageSquare style={{ width: 14, height: 14 }} />{live.messages.toLocaleString("fr-FR")}</span>
          )}
        </div>

        <button style={S.close} onClick={onClose} aria-label="Fermer le lecteur">
          <X style={{ width: 17, height: 17 }} />
        </button>
      </div>
    </>
  );
}
