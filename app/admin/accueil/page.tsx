"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Pencil, Loader2, ArrowRight, Music, Mic2, CalendarDays, Disc3,
  Newspaper, ImageIcon, Save, Sparkles, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { homeApi, type HomeBanner, type HomeData } from "@/lib/api";
import { toast } from "sonner";

/** Délai d'apparition échelonné pour un effet de cascade dans une grille. */
const stagger = (i: number, base = 90) => ({ animationDelay: `${i * base}ms` });

/** Chiffre qui s'anime de 0 vers sa valeur finale dès qu'elle est connue (façon page vitrine). */
function CountUp({ value, suffix = "", loading }: { value: number; suffix?: string; loading: boolean }) {
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;
    const duration = 800;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loading, value]);

  return <>{loading ? "—" : `${display}${suffix}`}</>;
}

/** En-tête de section cohérent (icône colorée + titre + sous-titre). */
function SectionHead({
  icon: Icon, iconBg, iconColor, title, sub, action,
}: {
  icon: typeof ImageIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-h no-bar animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ padding: "0 2px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="sec-ic" style={{ background: iconBg, color: iconColor }}><Icon /></div>
        <div>
          <h3 style={{ paddingLeft: 0 }}>{title}</h3>
          <div className="sub">{sub}</div>
        </div>
      </div>
      {action}
    </div>
  );
}

export default function AccueilPage() {
  const [banner, setBanner] = useState<HomeBanner>({});
  const [loadingBanner, setLoadingBanner] = useState(true);

  const [home, setHome] = useState<HomeData | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<HomeBanner>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    homeApi.banner.get().then(setBanner).catch(() => {}).finally(() => setLoadingBanner(false));
    homeApi.get().then(setHome).catch(() => {}).finally(() => setLoadingHome(false));
  }, []);

  const openEdit = () => { setDraft(banner); setEditOpen(true); };

  const saveBanner = async () => {
    setSaving(true);
    try {
      const saved = await homeApi.banner.update({
        title: draft.title,
        subtitle: draft.subtitle,
        cta_label: draft.cta_label,
        cta_url: draft.cta_url,
        ...(draft.image_url ? { image: draft.image_url } : {}),
      });
      setBanner(saved);
      toast.success("Bannière d'accueil mise à jour");
      setEditOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const alaUne = home?.a_la_une;
  const hits = home?.hits_du_mois ?? [];
  const magazine = home?.magazine;
  const magazineArticles = magazine?.articles ?? [];
  const secondArticle = magazineArticles[0];
  const galleryArticles = magazineArticles.slice(secondArticle ? 1 : 0, secondArticle ? 5 : 4);

  return (
    <section className="view">
      {/* Bannière — aperçu réel et animé de la page d'accueil publique */}
      <div className="hero hero-xl">
        {banner.image_url && (
          <div className="hero-media" style={{ backgroundImage: `url(${banner.image_url})` }} />
        )}
        <div className="hero-overlay" />
        <div className="hero-glow" />
        <div className="hero-in">
          <div>
            <div className="hero-eyebrow animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
              <span className="live-dot" />Aperçu en direct — page d&apos;accueil publique
            </div>
            <h1 className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700">
              {loadingBanner ? "…" : banner.title || "Aucun titre défini"}
            </h1>
            <p className="animate-in fade-in-0 slide-in-from-bottom-3 duration-700" style={{ animationDelay: "80ms" }}>
              {loadingBanner ? "" : banner.subtitle || "Ajoutez un sous-titre pour accrocher vos visiteurs."}
            </p>
            <div className="hero-actions animate-in fade-in-0 slide-in-from-bottom-3 duration-700" style={{ animationDelay: "160ms" }}>
              {banner.cta_label && <span className="hero-btn solid">{banner.cta_label}</span>}
              <button className="hero-btn" onClick={openEdit}>
                <Pencil />Modifier la bannière
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau de statistiques — chiffres animés, façon page vitrine */}
      <div className="stats-strip animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ marginBottom: 56, marginTop: 24 }}>
        <div className="stat">
          <div className="stat-v">
            <CountUp loading={loadingHome} value={[alaUne?.artist_of_month, alaUne?.featured_podcast, alaUne?.featured_event].filter(Boolean).length} suffix="/3" />
          </div>
          <div className="stat-l">Éléments à la une</div>
        </div>
        <div className="stat">
          <div className="stat-v"><CountUp loading={loadingHome} value={hits.length} /></div>
          <div className="stat-l">Hits du mois</div>
        </div>
        <div className="stat">
          <div className="stat-v"><CountUp loading={loadingHome} value={magazineArticles.length} /></div>
          <div className="stat-l">Articles magazine</div>
        </div>
        <div className="stat">
          <div className="stat-v">{loadingHome ? "—" : magazine?.hero ? "Oui" : "Non"}</div>
          <div className="stat-l">Article magazine hero</div>
        </div>
      </div>

      {/* À la une */}
      <SectionHead
        icon={Sparkles} iconBg="var(--gold-soft)" iconColor="var(--gold)"
        title="À la une" sub="Contenu mis en avant en tête de la page d'accueil"
      />
      <div className="ev-grid" style={{ marginBottom: 56 }}>
        <FeatureCard
          icon={Music}
          label="Artiste du mois"
          image={alaUne?.artist_of_month?.photo_url ?? null}
          title={alaUne?.artist_of_month?.name ?? null}
          meta={alaUne?.artist_of_month?.city ?? undefined}
          href="/admin/artistes"
          emptyHint="Aucun artiste en vedette"
          loading={loadingHome}
          index={0}
        />
        <FeatureCard
          icon={Mic2}
          label="Podcast à la une"
          image={alaUne?.featured_podcast?.cover_url ?? null}
          title={alaUne?.featured_podcast?.title ?? null}
          meta={alaUne?.featured_podcast?.duration ?? undefined}
          href="/admin/podcasts"
          emptyHint="Aucun podcast en vedette"
          loading={loadingHome}
          index={1}
        />
        <FeatureCard
          icon={CalendarDays}
          label="Événement à la une"
          image={alaUne?.featured_event?.image_url ?? null}
          title={alaUne?.featured_event?.title ?? null}
          meta={alaUne?.featured_event?.venue_name || alaUne?.featured_event?.city_name}
          href="/admin/evenements"
          emptyHint="Aucun événement en vedette"
          loading={loadingHome}
          index={2}
        />
      </div>

      {/* Hits du mois */}
      <SectionHead
        icon={TrendingUp} iconBg="var(--emerald-soft)" iconColor="var(--emerald)"
        title="Hits du mois" sub={`Sorties les plus suivies ce mois-ci (${hits.length})`}
        action={<Link href="/admin/releases" className="link">Sorties <ArrowRight /></Link>}
      />
      {loadingHome ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : hits.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted-foreground" style={{ marginBottom: 56 }}>
          Aucun hit du mois pour l&apos;instant — calculé automatiquement selon l&apos;engagement des sorties récentes.
        </div>
      ) : (
        <div className="m-grid" style={{ marginBottom: 56 }}>
          {hits.slice(0, 8).map((r, i) => (
            <Link href="/admin/releases" key={r.id}
              className="m-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both"
              style={{ textDecoration: "none", color: "inherit", ...stagger(i, 60) }}>
              <div className="m-cover cover-zoom">
                {r.cover_url ? <img src={r.cover_url} alt={r.title} loading="lazy" /> : <CoverPlaceholder icon={Disc3} />}
              </div>
              <div className="m-body">
                <div className="m-title" title={r.title}>{r.title}</div>
                <div className="m-series">{r.artist_name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Magazine — blocs alternés (image / texte) façon page vitrine */}
      <SectionHead
        icon={Newspaper} iconBg="var(--red-soft)" iconColor="var(--red)"
        title="Magazine" sub="Articles magazine mis en avant"
        action={<Link href="/admin/articles" className="link">Articles <ArrowRight /></Link>}
      />
      {loadingHome ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !magazine?.hero && magazineArticles.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-muted-foreground">
          Aucun article magazine mis en avant. Marquez un article <code>article_type=&quot;magazine&quot;</code> pour l&apos;afficher ici.
        </div>
      ) : (
        <>
          {magazine?.hero && (
            <Link href="/admin/articles"
              className="feature-row animate-in fade-in-0 slide-in-from-left-4 duration-[600ms] fill-mode-both"
              style={{ textDecoration: "none", color: "inherit" }}>
              <div className="f-media cover-zoom">
                {magazine.hero.featured_image_url
                  ? <img src={magazine.hero.featured_image_url} alt={magazine.hero.title} loading="lazy" />
                  : <CoverPlaceholder icon={Newspaper} />}
              </div>
              <div className="f-text">
                <div className="f-eyebrow">À la une du magazine</div>
                <div className="f-title">{magazine.hero.title}</div>
                {magazine.hero.excerpt && <p className="f-body">{magazine.hero.excerpt}</p>}
                <span className="link">Lire l&apos;article <ArrowRight /></span>
              </div>
            </Link>
          )}

          {secondArticle && (
            <Link href="/admin/articles"
              className="feature-row reverse animate-in fade-in-0 slide-in-from-right-4 duration-[600ms] fill-mode-both"
              style={{ textDecoration: "none", color: "inherit" }}>
              <div className="f-media cover-zoom">
                {secondArticle.featured_image_url
                  ? <img src={secondArticle.featured_image_url} alt={secondArticle.title} loading="lazy" />
                  : <CoverPlaceholder icon={Newspaper} />}
              </div>
              <div className="f-text">
                <div className="f-eyebrow">Aussi dans le magazine</div>
                <div className="f-title">{secondArticle.title}</div>
                {secondArticle.excerpt && <p className="f-body">{secondArticle.excerpt}</p>}
                <span className="link">Lire l&apos;article <ArrowRight /></span>
              </div>
            </Link>
          )}

          {galleryArticles.length > 0 && (
            <div className="m-grid" style={{ marginTop: 8 }}>
              {galleryArticles.map((a, i) => (
                <Link href="/admin/articles" key={a.id}
                  className="m-card animate-in fade-in-0 slide-in-from-bottom-4 duration-500 fill-mode-both"
                  style={{ textDecoration: "none", color: "inherit", ...stagger(i, 70) }}>
                  <div className="m-cover cover-zoom">
                    {a.featured_image_url ? <img src={a.featured_image_url} alt={a.title} loading="lazy" /> : <CoverPlaceholder icon={Newspaper} />}
                  </div>
                  <div className="m-body">
                    <div className="m-title">{a.title}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Édition de la bannière */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!saving) setEditOpen(o); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la bannière d&apos;accueil</DialogTitle>
            <DialogDescription>
              La page d&apos;accueil publique est mise en cache 15 min — le changement peut mettre
              jusqu&apos;à 15 min à y apparaître.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Titre</Label>
              <Input value={draft.title ?? ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Bienvenue sur Art du Kivu" />
            </div>
            <div className="grid gap-2">
              <Label>Sous-titre</Label>
              <Textarea rows={2} value={draft.subtitle ?? ""} onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })} placeholder="Découvrez les talents du Kivu" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Libellé du bouton</Label>
                <Input value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} placeholder="Écouter" />
              </div>
              <div className="grid gap-2">
                <Label>Lien du bouton</Label>
                <Input value={draft.cta_url ?? ""} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Image de fond (URL Cloudinary)</Label>
              <Input value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://res.cloudinary.com/..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button disabled={saving} onClick={saveBanner}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function CoverPlaceholder({ icon: Icon, small }: { icon: typeof ImageIcon; small?: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Icon className="text-muted-foreground/30" style={{ width: small ? 20 : 32, height: small ? 20 : 32 }} />
    </div>
  );
}

function FeatureCard({
  icon: Icon, label, image, title, meta, href, emptyHint, loading, index,
}: {
  icon: typeof ImageIcon;
  label: string;
  image: string | null | undefined;
  title: string | null | undefined;
  meta?: string;
  href: string;
  emptyHint: string;
  loading: boolean;
  index: number;
}) {
  return (
    <Link href={href}
      className="m-card animate-in fade-in-0 slide-in-from-bottom-4 duration-[600ms] fill-mode-both"
      style={{ textDecoration: "none", color: "inherit", ...stagger(index, 120) }}>
      <div className="m-cover cover-zoom" style={{ height: 190 }}>
        {loading ? (
          <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : image ? (
          <img src={image} alt={title ?? label} loading="lazy" />
        ) : (
          <CoverPlaceholder icon={Icon} />
        )}
        <span className="m-tag m-sched"><Icon className="h-3 w-3" />{label}</span>
      </div>
      <div className="m-body" style={{ minHeight: 62 }}>
        {loading ? (
          <div className="m-title">…</div>
        ) : title ? (
          <>
            <div className="m-title">{title}</div>
            {meta && <div className="m-series">{meta}</div>}
          </>
        ) : (
          <div className="feature-empty">
            <div className="m-series" style={{ marginTop: 0 }}>{emptyHint}</div>
            <span className="cta">Configurer <ArrowRight className="h-3 w-3" /></span>
          </div>
        )}
      </div>
    </Link>
  );
}
