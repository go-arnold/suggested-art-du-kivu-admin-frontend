"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Eye, FileText, Music, Calendar,
  Headphones, Video, Loader2, Heart, Disc3, Play,
} from "lucide-react";
import { analyticsApi, type DashboardStats } from "@/lib/api";

// ── Tons (icônes KPI) ───────────────────────────────────────────────────────────

const TONES: Record<string, { bg: string; fg: string }> = {
  primary:     { bg: "var(--red-soft)",     fg: "var(--red)" },
  warning:     { bg: "var(--gold-soft)",    fg: "var(--gold)" },
  info:        { bg: "var(--blue-soft)",    fg: "var(--blue)" },
  success:     { bg: "var(--emerald-soft)", fg: "var(--emerald)" },
  destructive: { bg: "var(--red-soft)",     fg: "var(--red)" },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, subtitle, icon: Icon, tone = "primary", loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: string;
  loading?: boolean;
}) {
  const c = TONES[tone] ?? TONES.primary;
  return (
    <div className="kpi">
      <div className="kpi-top">
        <div className="kpi-ic" style={{ background: c.bg, color: c.fg }}>
          <Icon />
        </div>
        <div><div className="kpi-lb">{title}</div></div>
      </div>
      <div className="kpi-v">
        {loading ? <Loader2 className="animate-spin" style={{ width: 24, height: 24 }} /> : value}
      </div>
      {subtitle && (
        <div className="kpi-foot"><span className="muted">{subtitle}</span></div>
      )}
    </div>
  );
}

// ── Top list générique (classement) ─────────────────────────────────────────────

function TopList<T extends { id: number; title: string; slug: string }>({
  title, icon: Icon, sub, items, value, href,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
  items: T[];
  value: (it: T) => number;
  href: (it: T) => string;
}) {
  return (
    <div className="panel">
      <div className="panel-h">
        <div>
          <h3><Icon />{title}</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="panel-b">
          <p className="muted" style={{ padding: "10px 0" }}>Aucune donnée.</p>
        </div>
      ) : (
        <div className="rank">
          {items.map((it, i) => (
            <Link className="rank-i" key={it.id} href={href(it)}>
              <span className={`rank-n${i === 0 ? " top" : ""}`}>{i + 1}</span>
              <div className="rank-m">
                <div className="t">{it.title}</div>
                <div className="s">{sub}</div>
              </div>
              <span className="rank-v">{value(it).toLocaleString()}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatistiquesPage() {
  const [data,    setData]    = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    setLoading(true);
    analyticsApi.dashboard()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const c = data?.counts ?? {};
  const t = data?.totals ?? {};
  const n = (v?: number) => (loading ? "—" : (v ?? 0).toLocaleString());

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Statistiques</h1>
          <p>Vue d&apos;ensemble de la plateforme Art-du-Kivu</p>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ borderColor: "var(--red)", marginBottom: 18 }}>
          <div className="panel-b" style={{ paddingTop: 16, color: "var(--red-ink)" }}>
            Impossible de charger les statistiques (accès administrateur requis ou service indisponible).
          </div>
        </div>
      )}

      {/* Compteurs de contenu */}
      <div className="kpis">
        <StatCard title="Articles"         value={n(c.articles)}         icon={FileText}   tone="primary" loading={loading} subtitle="publiés" />
        <StatCard title="Artistes"         value={n(c.artists)}          icon={Music}      tone="warning" loading={loading} subtitle="sur la plateforme" />
        <StatCard title="Événements"       value={n(c.events)}           icon={Calendar}   tone="info"    loading={loading} subtitle={`${n(c.event_registrations)} inscriptions`} />
        <StatCard title="Séries podcast"   value={n(c.podcast_series)}    icon={Headphones} tone="success" loading={loading} subtitle={`${n(c.podcast_episodes)} épisodes`} />
      </div>
      <div className="kpis">
        <StatCard title="Vidéos WebTV"     value={n(c.webtv_videos)}      icon={Video}      tone="info"    loading={loading} subtitle="médiathèque" />
        <StatCard title="Sorties"          value={n(c.releases)}          icon={Disc3}      tone="primary" loading={loading} subtitle="musicales" />
        <StatCard title="Programmes radio" value={n(c.radio_programs)}     icon={BarChart3}  tone="warning" loading={loading} subtitle="grille" />
        <StatCard title="Épisodes"         value={n(c.podcast_episodes)}  icon={Headphones} tone="success" loading={loading} subtitle="podcast" />
      </div>

      {/* Totaux d'engagement */}
      <div className="kpis">
        <StatCard title="Vues articles"    value={n(t.article_views)}     icon={Eye}        tone="primary"     loading={loading} subtitle="cumulées" />
        <StatCard title="Likes articles"   value={n(t.article_likes)}     icon={Heart}      tone="destructive" loading={loading} subtitle="cumulés" />
        <StatCard title="Vues WebTV"       value={n(t.webtv_views)}       icon={Eye}        tone="info"        loading={loading} subtitle="cumulées" />
        <StatCard title="Écoutes podcast"  value={n(t.podcast_plays)}     icon={Play}       tone="success"     loading={loading} subtitle="cumulées" />
      </div>

      {/* Tops */}
      <div className="grid-2b">
        <TopList
          title="Articles les plus lus" icon={TrendingUp} sub="Article"
          items={data?.top_articles ?? []} value={(a) => a.view_count}
          href={(a) => `/admin/articles/${a.slug}`}
        />
        <TopList
          title="Épisodes les plus écoutés" icon={Headphones} sub="Épisode"
          items={data?.top_podcast_episodes ?? []} value={(e) => e.play_count}
          href={() => "/admin/podcasts"}
        />
      </div>
      <TopList
        title="Vidéos WebTV les plus vues" icon={Video} sub="Vidéo"
        items={data?.top_webtv_videos ?? []} value={(v) => v.view_count}
        href={() => "/admin/mediatheque"}
      />
    </section>
  );
}
