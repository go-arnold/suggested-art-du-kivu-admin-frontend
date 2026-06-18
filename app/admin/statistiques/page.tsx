"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Eye, Users, FileText,
  Music, Calendar, Headphones, Video, Loader2, Radio,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  articlesApi, artistsApi, eventsApi, podcastsApi,
  emissionsApi, usersApi,
} from "@/lib/api";

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

// ── Top Articles Row ───────────────────────────────────────────────────────────

function TopArticles({ articles }: { articles: { id: number; title: string; view_count: number; author_name: string; published_at: string | null }[] }) {
  if (articles.length === 0) return null;
  const max = Math.max(...articles.map((a) => a.view_count));
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Articles les plus lus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {articles.map((art, i) => (
          <div key={art.id} className="flex items-center gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{art.title}</p>
              <p className="text-xs text-muted-foreground">{art.author_name}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${max > 0 ? (art.view_count / max) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-mono text-muted-foreground">
              {art.view_count.toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Top Episodes ───────────────────────────────────────────────────────────────

function TopEpisodes({ episodes }: { episodes: { id: number; title: string; play_count: number; series_title: string; duration: string }[] }) {
  if (episodes.length === 0) return null;
  const max = Math.max(...episodes.map((e) => e.play_count));
  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-blue-500" />
          Épisodes les plus écoutés
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {episodes.map((ep, i) => (
          <div key={ep.id} className="flex items-center gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{ep.title}</p>
              <p className="text-xs text-muted-foreground">{ep.series_title} · {ep.duration}</p>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400 transition-all"
                  style={{ width: `${max > 0 ? (ep.play_count / max) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 text-sm font-mono text-muted-foreground">
              {ep.play_count.toLocaleString()}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Stats {
  articles:  number;
  artists:   number;
  events:    number;
  podcasts:  number;
  episodes:  number;
  emissions: number;
  users:     number;
  videos:    number;
}

export default function StatistiquesPage() {
  const [stats,    setStats]    = useState<Partial<Stats>>({});
  const [loading,  setLoading]  = useState(true);
  const [topArticles, setTopArticles] = useState<{
    id: number; title: string; view_count: number; author_name: string; published_at: string | null;
  }[]>([]);
  const [topEpisodes, setTopEpisodes] = useState<{
    id: number; title: string; play_count: number; series_title: string; duration: string;
  }[]>([]);

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      articlesApi.list("page_size=5"),          // top 5 most viewed
      artistsApi.list("page_size=1"),
      eventsApi.list("page_size=1"),
      podcastsApi.list("page_size=1"),
      podcastsApi.episodes.list("page_size=5"),  // top 5 most played
      emissionsApi.list("page_size=1"),
      usersApi.list("page_size=1"),
    ]).then(([arts, artists, events, pods, eps, emiss, usrs]) => {
      const s: Partial<Stats> = {};

      if (arts.status    === "fulfilled") { s.articles  = arts.value.count;    setTopArticles(arts.value.results.map(a => ({ id: a.id, title: a.title, view_count: a.view_count ?? 0, author_name: a.author_name, published_at: a.published_at }))); }
      if (artists.status === "fulfilled") s.artists   = artists.value.count;
      if (events.status  === "fulfilled") s.events    = events.value.count;
      if (pods.status    === "fulfilled") s.podcasts   = pods.value.count;
      if (eps.status     === "fulfilled") { s.episodes  = eps.value.count;     setTopEpisodes(eps.value.results.map(e => ({ id: e.id, title: e.title, play_count: e.play_count ?? 0, series_title: e.series_title, duration: e.duration }))); }
      if (emiss.status   === "fulfilled") s.emissions  = emiss.value.count;
      if (usrs.status    === "fulfilled") s.users      = usrs.value.count;

      setStats(s);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Statistiques</h1>
        <p className="mt-1 text-muted-foreground">Vue d'ensemble de la plateforme Art-du-Kivu</p>
      </div>

      {/* Overview grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles"   value={stats.articles  ?? "—"} icon={FileText}   color="text-primary"      loading={loading} subtitle="publiés" />
        <StatCard title="Artistes"   value={stats.artists   ?? "—"} icon={Music}      color="text-warning"      loading={loading} subtitle="sur la plateforme" />
        <StatCard title="Événements" value={stats.events    ?? "—"} icon={Calendar}   color="text-blue-500"     loading={loading} subtitle="au total" />
        <StatCard title="Podcasts"   value={stats.podcasts  ?? "—"} icon={Headphones} color="text-emerald-500"  loading={loading} subtitle="séries" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Épisodes"   value={stats.episodes  ?? "—"} icon={Headphones} color="text-blue-400"     loading={loading} subtitle="podcast" />
        <StatCard title="Émissions"  value={stats.emissions ?? "—"} icon={Radio}      color="text-red-500"      loading={loading} subtitle="live / enregistrées" />
        <StatCard title="Utilisateurs" value={stats.users   ?? "—"} icon={Users}      color="text-primary"      loading={loading} subtitle="inscrits" />
        <StatCard title="Contenu total" value={
          loading ? "—"
            : ((stats.articles ?? 0) + (stats.episodes ?? 0) + (stats.events ?? 0)).toLocaleString()
        } icon={BarChart3} color="text-primary" loading={loading} subtitle="articles + épisodes + événements" />
      </div>

      {/* Charts placeholder + top lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopArticles articles={topArticles} />
        <TopEpisodes episodes={topEpisodes} />
      </div>

      {/* Events breakdown */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Répartition des événements par statut
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventsBreakdown />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Events Breakdown ──────────────────────────────────────────────────────────

function EventsBreakdown() {
  const [data,    setData]    = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const statuses = [
    { key: "upcoming", label: "À venir",    color: "bg-blue-400" },
    { key: "live",     label: "En cours",   color: "bg-emerald-400" },
    { key: "past",     label: "Passés",     color: "bg-muted-foreground/40" },
    { key: "cancelled",label: "Annulés",    color: "bg-destructive/50" },
  ];

  useEffect(() => {
    Promise.allSettled(
      statuses.map((s) => eventsApi.list(`status=${s.key}&page_size=1`).then((r) => ({ key: s.key, count: r.count })))
    ).then((results) => {
      const d: Record<string, number> = {};
      results.forEach((r) => { if (r.status === "fulfilled") d[r.value.key] = r.value.count; });
      setData(d);
    }).finally(() => setLoading(false));
  }, []);

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {statuses.map(({ key, label, color }) => {
        const count = data[key] ?? 0;
        const pct   = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={key} className="flex items-center gap-4">
            <span className="w-24 text-sm text-muted-foreground shrink-0">{label}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-16 text-right text-sm font-mono text-muted-foreground shrink-0">
              {count} ({Math.round(pct)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
