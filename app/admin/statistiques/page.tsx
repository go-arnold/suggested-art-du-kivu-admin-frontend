"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Eye, Users, FileText, Music, Calendar,
  Headphones, Video, Loader2, Heart, Ticket, Disc3, Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { analyticsApi, type DashboardStats } from "@/lib/api";

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, subtitle, icon: Icon, color = "text-primary", loading = false,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  loading?: boolean;
}) {
  return (
    <Card className="card-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <div className="text-3xl font-bold font-mono">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ── Top list générique ──────────────────────────────────────────────────────────

function TopList<T extends { id: number; title: string; slug: string }>({
  title, icon: Icon, color, bar, items, value, href,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bar: string;
  items: T[];
  value: (it: T) => number;
  href: (it: T) => string;
}) {
  const max = items.length ? Math.max(...items.map(value)) : 0;
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${color}`} />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée.</p>
        ) : (
          items.map((it, i) => {
            const v = value(it);
            return (
              <Link key={it.id} href={href(it)} className="flex items-center gap-4 group">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold ${color}`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">{it.title}</p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${bar} transition-all`}
                      style={{ width: `${max > 0 ? (v / max) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="shrink-0 font-mono text-sm text-muted-foreground">{v.toLocaleString()}</span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="mt-1 text-muted-foreground">Vue d&apos;ensemble de la plateforme Art-du-Kivu</p>
      </div>

      {error && (
        <Card className="card-shadow border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Impossible de charger les statistiques (accès administrateur requis ou service indisponible).
          </CardContent>
        </Card>
      )}

      {/* Compteurs de contenu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles"        value={n(c.articles)}         icon={FileText}   color="text-primary"     loading={loading} subtitle="publiés" />
        <StatCard title="Artistes"        value={n(c.artists)}          icon={Music}      color="text-warning"     loading={loading} subtitle="sur la plateforme" />
        <StatCard title="Événements"      value={n(c.events)}           icon={Calendar}   color="text-info"        loading={loading} subtitle={`${n(c.event_registrations)} inscriptions`} />
        <StatCard title="Séries podcast"  value={n(c.podcast_series)}   icon={Headphones} color="text-success"     loading={loading} subtitle={`${n(c.podcast_episodes)} épisodes`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Vidéos WebTV"    value={n(c.webtv_videos)}     icon={Video}      color="text-info"        loading={loading} subtitle="médiathèque" />
        <StatCard title="Sorties"         value={n(c.releases)}         icon={Disc3}      color="text-primary"     loading={loading} subtitle="musicales" />
        <StatCard title="Programmes radio" value={n(c.radio_programs)}  icon={BarChart3}  color="text-warning"     loading={loading} subtitle="grille" />
        <StatCard title="Épisodes"        value={n(c.podcast_episodes)} icon={Headphones} color="text-success"     loading={loading} subtitle="podcast" />
      </div>

      {/* Totaux d'engagement */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Vues articles"   value={n(t.article_views)}    icon={Eye}        color="text-primary"     loading={loading} subtitle="cumulées" />
        <StatCard title="Likes articles"  value={n(t.article_likes)}    icon={Heart}      color="text-destructive" loading={loading} subtitle="cumulés" />
        <StatCard title="Vues WebTV"      value={n(t.webtv_views)}      icon={Eye}        color="text-info"        loading={loading} subtitle="cumulées" />
        <StatCard title="Écoutes podcast" value={n(t.podcast_plays)}    icon={Play}       color="text-success"     loading={loading} subtitle="cumulées" />
      </div>

      {/* Tops */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopList
          title="Articles les plus lus" icon={TrendingUp} color="text-primary" bar="bg-primary"
          items={data?.top_articles ?? []} value={(a) => a.view_count}
          href={(a) => `/admin/articles/${a.slug}`}
        />
        <TopList
          title="Épisodes les plus écoutés" icon={Headphones} color="text-success" bar="bg-success"
          items={data?.top_podcast_episodes ?? []} value={(e) => e.play_count}
          href={() => "/admin/podcasts"}
        />
      </div>
      <TopList
        title="Vidéos WebTV les plus vues" icon={Video} color="text-info" bar="bg-info"
        items={data?.top_webtv_videos ?? []} value={(v) => v.view_count}
        href={() => "/admin/mediatheque"}
      />
    </div>
  );
}
