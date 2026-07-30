"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye, Headphones, Radio as RadioIcon, Heart, FileText, Music,
  Mic2, Clock, ArrowRight, PenLine, Calendar,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  homeApi, eventsApi, analyticsApi,
  type HomeData, type DashboardStats, type EventList,
} from "@/lib/api";

const nf = (n: number | undefined) => (n ?? 0).toLocaleString("fr-FR");

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [home, setHome] = useState<HomeData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventList[]>([]);

  useEffect(() => {
    homeApi.get().then(setHome).catch(() => {});
    analyticsApi.dashboard().then(setStats).catch(() => {});
    eventsApi
      .list("status=upcoming&page_size=4")
      .then((r) => setEvents(r.results))
      .catch(() => {});
  }, []);

  const name = user?.username || user?.email?.split("@")[0] || "Art-du-Kivu";
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const counts = stats?.counts ?? {};
  const totals = stats?.totals ?? {};
  // Reflète la page d'accueil publique réelle (GET /home/, mise en cache 15 min
  // côté serveur) : magazine.articles = derniers articles magazine mis en avant.
  const news = home?.magazine?.articles ?? [];
  const topArticles = stats?.top_articles ?? [];

  const distribution = [
    { nm: "Articles", vl: counts.articles, color: "var(--red)" },
    { nm: "Sorties", vl: counts.releases, color: "var(--gold)" },
    { nm: "Podcasts", vl: counts.podcast_episodes, color: "var(--blue)" },
    { nm: "Web TV", vl: counts.webtv_videos, color: "var(--purple)" },
    { nm: "Radio", vl: counts.radio_programs, color: "var(--emerald)" },
    { nm: "Artistes", vl: counts.artists, color: "#A3A299" },
  ];

  const nextEvent = events[0];

  return (
    <section className="view">
      {/* Hero */}
      <div className="hero">
        <div className="hero-glow" />
        <div className="hero-in">
          <div>
            <div className="hero-eyebrow">{today}</div>
            <h1>{greeting()}, {name} 👋</h1>
            <p>Voici l&apos;essentiel de votre plateforme culturelle aujourd&apos;hui.</p>
            <div className="chips">
              <Link href="/admin/articles" className="chip" style={{ cursor: "pointer" }}>
                <FileText />{nf(counts.articles)} article{(counts.articles ?? 0) > 1 ? "s" : ""}
              </Link>
              <Link href="/admin/evenements" className="chip" style={{ cursor: "pointer" }}>
                <Calendar />{events.length} programmation{events.length > 1 ? "s" : ""} à venir
              </Link>
              <Link href="/admin/artistes" className="chip" style={{ cursor: "pointer" }}>
                <Music />{nf(counts.artists)} artiste{(counts.artists ?? 0) > 1 ? "s" : ""}
              </Link>
            </div>
            <div className="hero-actions">
              <Link href="/admin/planning" className="hero-btn">
                <Calendar />Planning éditorial
              </Link>
              <Link href="/admin/emissions" className="hero-btn solid">
                <RadioIcon />Lancer un live
              </Link>
            </div>
          </div>

          {nextEvent && (
            <div className="hero-card">
              <div className="hc-top">Prochaine programmation</div>
              <div className="hc-title">{nextEvent.title}</div>
              <div className="hc-sub">
                {new Date(nextEvent.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                {nextEvent.city_name ? ` · ${nextEvent.city_name}` : ""}
              </div>
              <div className="hc-wave">
                {Array.from({ length: 26 }).map((_, i) => (
                  <i
                    key={i}
                    className={i % 4 === 0 ? "hot" : ""}
                    style={{ height: `${30 + ((i * 37) % 60)}%`, animationDelay: `${i * 0.06}s` }}
                  />
                ))}
              </div>
              <div className="hc-foot">
                <span><b>{nextEvent.venue_name || nextEvent.category || "Événement"}</b></span>
                <Link href="/admin/evenements" className="link" style={{ color: "#fff" }}>
                  Voir <ArrowRight />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}>
              <Eye />
            </div>
            <div><div className="kpi-lb">Vues des articles</div></div>
          </div>
          <div className="kpi-v">{nf(totals.article_views)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>
              <Headphones />
            </div>
            <div><div className="kpi-lb">Écoutes podcasts</div></div>
          </div>
          <div className="kpi-v">{nf(totals.podcast_plays)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--emerald-soft)", color: "var(--emerald)" }}>
              <RadioIcon />
            </div>
            <div><div className="kpi-lb">Vues Web TV</div></div>
          </div>
          <div className="kpi-v">{nf(totals.webtv_views)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-top">
            <div className="kpi-ic" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
              <Heart />
            </div>
            <div><div className="kpi-lb">J&apos;aime communauté</div></div>
          </div>
          <div className="kpi-v">{nf(totals.post_likes)}</div>
        </div>
      </div>

      {/* Activité récente + répartition */}
      <div className="grid-2">
        <div className="panel">
          <div className="panel-h">
            <div>
              <h3>Derniers articles</h3>
              <div className="sub">Publications récentes sur la plateforme</div>
            </div>
            <Link href="/admin/articles" className="link">Tout voir <ArrowRight /></Link>
          </div>
          <div className="panel-b" style={{ paddingTop: 6 }}>
            {news.length === 0 ? (
              <p className="muted" style={{ padding: "10px 0" }}>Aucun article récent.</p>
            ) : (
              <div className="tl">
                {news.slice(0, 5).map((a, i) => {
                  const colors = ["var(--red)", "var(--blue)", "var(--gold)", "var(--emerald)", "#A3A299"];
                  const cat = typeof a.category === "string" ? a.category : a.category?.name;
                  return (
                    <div className="tl-i" key={a.id}>
                      <span className="tl-dot" style={{ background: colors[i % colors.length] }} />
                      <div className="tl-t">
                        <b>{a.author_name || "Rédaction"}</b> a publié « {a.title} »
                      </div>
                      <div className="tl-s">
                        {cat ? `${cat} · ` : ""}
                        {a.published_at
                          ? new Date(a.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                          : "Brouillon"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <div>
              <h3>Répartition du contenu</h3>
              <div className="sub">Vue d&apos;ensemble du catalogue</div>
            </div>
            <Link href="/admin/statistiques" className="link">Stats <ArrowRight /></Link>
          </div>
          <div className="slist">
            {distribution.map((d) => (
              <div className="slist-i" key={d.nm}>
                <span className="sw" style={{ background: d.color }} />
                <span className="nm">{d.nm}</span>
                <span className="vl">{nf(d.vl)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Populaires + à venir */}
      <div className="grid-2b">
        <div className="panel">
          <div className="panel-h">
            <div>
              <h3>Articles populaires</h3>
              <div className="sub">Les plus consultés</div>
            </div>
            <Link href="/admin/statistiques" className="link">Statistiques <ArrowRight /></Link>
          </div>
          <div className="rank">
            {topArticles.length === 0 ? (
              <p className="muted" style={{ padding: "10px 0" }}>Pas encore de données.</p>
            ) : (
              topArticles.slice(0, 5).map((a, i) => (
                <div className="rank-i" key={a.id}>
                  <span className={`rank-n${i === 0 ? " top" : ""}`}>{i + 1}</span>
                  <div className="rank-m">
                    <div className="t">{a.title}</div>
                    <div className="s">Article</div>
                  </div>
                  <span className="rank-v">{nf(a.view_count)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            <div>
              <h3>À venir</h3>
              <div className="sub">Prochaines programmations</div>
            </div>
            <Link href="/admin/planning" className="link">Planning <ArrowRight /></Link>
          </div>
          <div className="panel-b" style={{ paddingTop: 0 }}>
            {events.length === 0 ? (
              <p className="muted" style={{ padding: "10px 0" }}>Aucun événement à venir.</p>
            ) : (
              events.map((ev) => {
                const d = new Date(ev.date);
                return (
                  <div className="evt" key={ev.id}>
                    <div className="evt-d">
                      <span>{d.toLocaleDateString("fr-FR", { month: "short" })}</span>
                      <b>{d.getDate()}</b>
                    </div>
                    <div className="evt-m">
                      <div className="t">{ev.title}</div>
                      <div className="s">
                        <Clock />
                        {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {ev.venue_name ? ` · ${ev.venue_name}` : ev.city_name ? ` · ${ev.city_name}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="panel-h" style={{ padding: "6px 2px 12px" }}>
        <div>
          <h3>Actions rapides</h3>
          <div className="sub">Accès direct aux tâches fréquentes</div>
        </div>
      </div>
      <div className="qa">
        <Link href="/admin/articles/nouveau" className="qa-c">
          <div className="qa-ic" style={{ background: "var(--red-soft)", color: "var(--red)" }}><PenLine /></div>
          <div className="t">Nouvel article</div>
          <div className="s">Rédiger une publication</div>
        </Link>
        <Link href="/admin/artistes/nouveau" className="qa-c">
          <div className="qa-ic" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}><Music /></div>
          <div className="t">Ajouter un artiste</div>
          <div className="s">Créer un profil</div>
        </Link>
        <Link href="/admin/emissions" className="qa-c">
          <div className="qa-ic" style={{ background: "var(--emerald-soft)", color: "var(--emerald)" }}><RadioIcon /></div>
          <div className="t">Programmer un live</div>
          <div className="s">Nouvelle émission</div>
        </Link>
        <Link href="/admin/podcasts" className="qa-c">
          <div className="qa-ic" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}><Mic2 /></div>
          <div className="t">Nouvel épisode</div>
          <div className="s">Publier un podcast</div>
        </Link>
      </div>
    </section>
  );
}
