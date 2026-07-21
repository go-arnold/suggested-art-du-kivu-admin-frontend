"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths, subMonths, addDays, addWeeks, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday,
  set, parseISO, format,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, CalendarDays, Search,
  Loader2, Radio, Calendar as CalendarIcon, Newspaper, Mic2, Clock, Check,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { eventsApi, emissionsApi, articlesApi, podcastsApi } from "@/lib/api";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type Kind = "event" | "emission" | "article" | "podcast";
type View = "day" | "week" | "month" | "list";

interface PlanningItem {
  key: string;
  kind: Kind;
  slug: string;
  title: string;
  date: Date;
  status: string;
}

interface Style {
  color: string; // couleur principale (bordure gauche + texte)
  soft: string;  // fond teinté (badges icône)
  dot: string;   // pastille légende
  label: string;
  icon: typeof CalendarIcon;
}

// Couleurs par type (sauf article : couleur selon statut)
const KIND_STYLE: Record<Exclude<Kind, "article">, Style> = {
  event:    { color: "var(--red)",     soft: "var(--red-soft)",     dot: "var(--red)",     label: "Événement", icon: CalendarIcon },
  emission: { color: "var(--blue)",    soft: "var(--blue-soft)",    dot: "var(--blue)",    label: "Émission",  icon: Radio },
  podcast:  { color: "var(--emerald)", soft: "var(--emerald-soft)", dot: "var(--emerald)", label: "Podcast",   icon: Mic2 },
};

// Couleurs des articles selon leur statut
const ARTICLE_STYLE: Record<string, Style> = {
  published: { color: "var(--emerald)", soft: "var(--emerald-soft)", dot: "var(--emerald)", label: "Article publié",    icon: Newspaper },
  scheduled: { color: "var(--blue)",    soft: "var(--blue-soft)",    dot: "var(--blue)",    label: "Article programmé", icon: Newspaper },
  draft:     { color: "var(--t3)",      soft: "var(--surface-2)",    dot: "var(--t3)",      label: "Brouillon",         icon: Newspaper },
};

function styleFor(it: PlanningItem): Style {
  if (it.kind === "article") return ARTICLE_STYLE[it.status] ?? ARTICLE_STYLE.published;
  return KIND_STYLE[it.kind];
}

// Calendriers filtrables (clé = type, ou article-<statut>)
const CALENDARS: { key: string; dot: string; label: string }[] = [
  { key: "event",             dot: "var(--red)",     label: "Événements" },
  { key: "emission",          dot: "var(--blue)",    label: "Émissions" },
  { key: "podcast",           dot: "var(--emerald)", label: "Podcasts" },
  { key: "article-published", dot: "var(--emerald)", label: "Articles publiés" },
  { key: "article-scheduled", dot: "var(--blue)",    label: "Articles programmés" },
];

function calKey(it: PlanningItem): string {
  return it.kind === "article" ? `article-${it.status}` : it.kind;
}

// Page de destination au clic
function hrefFor(it: PlanningItem): string {
  switch (it.kind) {
    case "article":  return `/admin/articles/${it.slug}`;
    case "event":    return "/admin/evenements";
    case "emission": return "/admin/emissions";
    default:         return "/admin/podcasts";
  }
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const router = useRouter();
  const openItem = (it: PlanningItem) => router.push(hrefFor(it));

  const [current,     setCurrent]     = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [view,        setView]        = useState<View>("month");
  const [items,       setItems]       = useState<PlanningItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [enabledCals, setEnabledCals] = useState<Set<string>>(() => new Set(CALENDARS.map((c) => c.key)));
  const [search,      setSearch]      = useState("");

  const toggleCal = (key: string) => setEnabledCals((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  const [dragged,  setDragged]  = useState<PlanningItem | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const [evRes, emRes, arRes, poRes] = await Promise.allSettled([
      eventsApi.list("page_size=200"),
      emissionsApi.list("page_size=200"),
      articlesApi.list("page_size=200"),
      podcastsApi.episodes.list("page_size=200"),
    ]);
    const list: PlanningItem[] = [];
    if (evRes.status === "fulfilled") {
      for (const e of evRes.value.results) {
        if (e.date) list.push({ key: `event-${e.slug}`, kind: "event", slug: e.slug, title: e.title, date: parseISO(e.date), status: e.status });
      }
    }
    if (emRes.status === "fulfilled") {
      for (const e of emRes.value.results) {
        if (e.scheduled_at) list.push({ key: `emission-${e.slug}`, kind: "emission", slug: e.slug, title: e.title, date: parseISO(e.scheduled_at), status: e.status });
      }
    }
    if (arRes.status === "fulfilled") {
      for (const a of arRes.value.results) {
        if (!a.published_at) continue; // brouillon sans date -> non plaçable
        const d = parseISO(a.published_at);
        const status = d.getTime() > Date.now() ? "scheduled" : "published";
        list.push({ key: `article-${a.slug}`, kind: "article", slug: a.slug, title: a.title, date: d, status });
      }
    }
    if (poRes.status === "fulfilled") {
      for (const ep of poRes.value.results) {
        if (ep.published_at) list.push({ key: `podcast-${ep.slug}`, kind: "podcast", slug: ep.slug, title: ep.title, date: parseISO(ep.published_at), status: "published" });
      }
    }
    setItems(list);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (!enabledCals.has(calKey(it))) return false;
      if (q && !it.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, enabledCals, search]);

  const byDay = useMemo(() => {
    const map = new Map<string, PlanningItem[]>();
    for (const it of filtered) {
      const k = format(it.date, "yyyy-MM-dd");
      const arr = map.get(k) ?? [];
      arr.push(it);
      map.set(k, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.getTime() - b.date.getTime());
    return map;
  }, [filtered]);

  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(startOfMonth(current), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(current), { weekStartsOn: 1 }),
  }), [current]);

  const weekDays = useMemo(() => eachDayOfInterval({
    start: startOfWeek(selectedDay, { weekStartsOn: 1 }),
    end: endOfWeek(selectedDay, { weekStartsOn: 1 }),
  }), [selectedDay]);

  const periodCount = useMemo(() => filtered.filter((it) => isSameMonth(it.date, current)).length, [filtered, current]);
  const todayCount  = useMemo(() => filtered.filter((it) => isToday(it.date)).length, [filtered]);
  const daysWithItems = useMemo(() => filtered.map((it) => it.date), [filtered]);
  const selectedItems = byDay.get(format(selectedDay, "yyyy-MM-dd")) ?? [];

  // Navigation adaptée à la vue
  const go = (dir: 1 | -1) => {
    if (view === "week") { const n = addWeeks(selectedDay, dir); setSelectedDay(n); setCurrent(startOfMonth(n)); }
    else if (view === "day") { const n = addDays(selectedDay, dir); setSelectedDay(n); setCurrent(startOfMonth(n)); }
    else setCurrent((d) => (dir === 1 ? addMonths(d, 1) : subMonths(d, 1)));
  };
  const goToday = () => { const t = new Date(); setSelectedDay(t); setCurrent(startOfMonth(t)); };

  const headerLabel =
    view === "day" ? format(selectedDay, "EEEE d MMMM yyyy", { locale: fr }) :
    view === "week" ? `Semaine du ${format(weekDays[0], "d MMM", { locale: fr })}` :
    format(current, "MMMM yyyy", { locale: fr });

  // ── Drag & drop : replanifier ──
  const reschedule = async (item: PlanningItem, day: Date) => {
    if (isSameDay(item.date, day)) return;
    const newDate = set(day, { hours: item.date.getHours(), minutes: item.date.getMinutes(), seconds: 0, milliseconds: 0 });
    const iso = newDate.toISOString();
    setItems((prev) => prev.map((it) => (it.key === item.key ? { ...it, date: newDate } : it)));
    try {
      if (item.kind === "event")         await eventsApi.update(item.slug, { date: iso });
      else if (item.kind === "emission") await emissionsApi.update(item.slug, { scheduled_at: iso });
      else if (item.kind === "article")  await articlesApi.update(item.slug, { scheduled_at: iso });
      else                               await podcastsApi.episodes.update(item.slug, { published_at: iso });
      toast.success(`Replanifié au ${format(newDate, "d MMMM", { locale: fr })}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de la replanification");
      fetchItems();
    }
  };

  const dndProps = {
    dragged, dragOver,
    onDragStart: setDragged,
    onDragEnd: () => { setDragged(null); setDragOver(null); },
    onDayOver: setDragOver,
    onDrop: (day: Date) => { if (dragged) reschedule(dragged, day); setDragged(null); setDragOver(null); },
    onSelectDay: setSelectedDay,
    onOpen: openItem,
  };

  const VIEWS: { v: View; label: string }[] = [
    { v: "day", label: "Jour" }, { v: "week", label: "Semaine" },
    { v: "month", label: "Mois" }, { v: "list", label: "Liste" },
  ];

  return (
    <section className="view" style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="page-h" style={{ marginBottom: 0 }}>
        <div>
          <h1>Planning Art-du-Kivu</h1>
          <p style={{ textTransform: "capitalize" }}>{headerLabel} · {periodCount} ce mois</p>
        </div>
        <div className="h-actions">
          <div className="seg">
            <button onClick={() => go(-1)} aria-label="Précédent"><ChevronLeft size={16} /></button>
            <button onClick={goToday}>Aujourd&apos;hui</button>
            <button onClick={() => go(1)} aria-label="Suivant"><ChevronRight size={16} /></button>
          </div>
          <div className="seg">
            {VIEWS.map(({ v, label }) => (
              <button key={v} className={cn(view === v && "on")} onClick={() => setView(v)}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* 3 panneaux : filtres | calendrier | détail du jour */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[260px_1fr_300px]">
        {/* Panneau gauche */}
        <aside className="min-h-0 space-y-3 overflow-y-auto pb-1 pr-1">
          <div className="panel" style={{ padding: 8 }}>
            <Calendar
              mode="single" locale={fr} month={current} onMonthChange={setCurrent}
              selected={selectedDay} onSelect={(d) => d && setSelectedDay(d)}
              modifiers={{ hasItems: daysWithItems }}
              modifiersClassNames={{ hasItems: "font-bold text-primary" }}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="panel" style={{ padding: 16, textAlign: "center" }}>
              <p className="kpi-v" style={{ fontSize: 26, marginBottom: 4 }}>{periodCount}</p>
              <p className="s" style={{ fontSize: 12, color: "var(--t3)" }}>Période</p>
            </div>
            <div className="panel" style={{ padding: 16, textAlign: "center", background: "var(--red-soft)" }}>
              <p className="kpi-v" style={{ fontSize: 26, marginBottom: 4, color: "var(--red)" }}>{todayCount}</p>
              <p className="s" style={{ fontSize: 12, color: "var(--t3)" }}>Aujourd&apos;hui</p>
            </div>
          </div>

          <div className="panel" style={{ padding: 14 }}>
            <label className="s" style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--t2)", marginBottom: 8 }}>Recherche</label>
            <div className="tb-search">
              <Search />
              <input placeholder="Titre…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {/* Calendriers = filtres cliquables */}
          <div className="panel" style={{ padding: 12 }}>
            <p className="s" style={{ margin: "0 4px 4px", fontSize: 12, fontWeight: 500, color: "var(--t2)" }}>Calendriers</p>
            {CALENDARS.map((c) => {
              const on = enabledCals.has(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleCal(c.key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-muted",
                    !on && "opacity-40",
                  )}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.dot }} />
                  <span className="flex-1 text-left">{c.label}</span>
                  {on && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              );
            })}
            <p className="px-1 pt-2 text-xs text-muted-foreground">
              Glissez-déposez sur un autre jour pour replanifier.
            </p>
          </div>
        </aside>

        {/* Panneau central */}
        <div className="panel flex min-h-0 flex-col overflow-hidden">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : view === "month" ? (
            <DayGrid days={monthDays} current={current} selectedDay={selectedDay} byDay={byDay} maxItems={2} {...dndProps} />
          ) : view === "week" ? (
            <DayGrid days={weekDays} current={current} selectedDay={selectedDay} byDay={byDay} maxItems={8} {...dndProps} />
          ) : view === "day" ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DayAgenda day={selectedDay} items={selectedItems} onOpen={openItem} />
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ListView items={filtered} onOpen={openItem} />
            </div>
          )}
        </div>

        {/* Panneau droit : détail du jour */}
        <aside className="panel flex min-h-0 flex-col">
          <div className="shrink-0 border-b border-border p-4">
            <p className="kpi-v" style={{ fontSize: 26, marginBottom: 2 }}>{format(selectedDay, "d")}</p>
            <p className="capitalize text-sm text-muted-foreground">{format(selectedDay, "EEEE MMMM yyyy", { locale: fr })}</p>
            {isToday(selectedDay) && (
              <span className="badge b-red" style={{ marginTop: 8 }}><span className="bd" />Aujourd&apos;hui</span>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {selectedItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Rien de planifié ce jour.</p>
            ) : (
              selectedItems.map((it) => {
                const s = styleFor(it);
                const Icon = s.icon;
                return (
                  <button
                    key={it.key}
                    onClick={() => openItem(it)}
                    className="kb-card w-full text-left"
                    style={{ borderLeft: `3px solid ${s.color}`, marginBottom: 0 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: s.color }}>
                      <Icon style={{ width: 14, height: 14 }} />{format(it.date, "HH:mm")} · {s.label}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">{it.title}</p>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

// ── Grille de jours (mois ou semaine) ─────────────────────────────────────────

interface GridProps {
  days: Date[];
  current: Date;
  selectedDay: Date;
  byDay: Map<string, PlanningItem[]>;
  maxItems: number;
  dragged: PlanningItem | null;
  dragOver: string | null;
  onSelectDay: (d: Date) => void;
  onDragStart: (it: PlanningItem) => void;
  onDragEnd: () => void;
  onDayOver: (key: string | null) => void;
  onDrop: (day: Date) => void;
  onOpen: (it: PlanningItem) => void;
}

function DayGrid({
  days, current, selectedDay, byDay, maxItems,
  dragged, dragOver, onSelectDay, onDragStart, onDragEnd, onDayOver, onDrop, onOpen,
}: GridProps) {
  // 6 lignes pour le mois (42 jours), 1 pour la semaine (7 jours)
  const rows = days.length / 7;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d}</div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 grid-cols-7"
        style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
      >
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, current);
          const isOver = dragOver === key && !!dragged;
          const isSel = isSameDay(day, selectedDay);
          return (
            <div
              key={key}
              onClick={() => onSelectDay(day)}
              onDragOver={(e) => { e.preventDefault(); onDayOver(key); }}
              onDragLeave={() => onDayOver(null)}
              onDrop={(e) => { e.preventDefault(); onDrop(day); }}
              className={cn(
                "flex min-h-0 cursor-pointer flex-col border-b border-r border-border p-1.5 transition-colors",
                !inMonth && "bg-muted/30",
                isSel && "ring-2 ring-inset ring-primary/40",
                isOver && "bg-primary/10 ring-2 ring-inset ring-primary",
              )}
            >
              <div className="mb-1 flex shrink-0 items-center justify-between">
                <span className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday(day) ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground",
                  !inMonth && "opacity-40",
                )}>
                  {format(day, "d")}
                </span>
                {dayItems.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">{dayItems.length}</span>
                )}
              </div>
              {/* Aperçu limité ; le détail complet s'affiche à droite au clic */}
              <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                <div className="min-h-0 flex-1 space-y-1 overflow-hidden">
                  {dayItems.slice(0, maxItems).map((it) => {
                    const s = styleFor(it);
                    return (
                      <div
                        key={it.key}
                        draggable
                        onClick={(e) => { e.stopPropagation(); onOpen(it); }}
                        onDragStart={() => onDragStart(it)}
                        onDragEnd={onDragEnd}
                        title={it.title}
                        className={cn("kb-card", dragged?.key === it.key && "dragging")}
                        style={{ borderLeft: `3px solid ${s.color}`, padding: "4px 7px", borderRadius: 7 }}
                      >
                        <p className="truncate text-xs font-semibold leading-tight">
                          <span style={{ color: s.color }}>{format(it.date, "HH:mm")}</span>{" "}
                          <span className="text-foreground">{it.title}</span>
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
                {/* Toujours visible (épinglé en bas) si davantage d'éléments */}
                {dayItems.length > maxItems && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelectDay(day); }}
                    className="shrink-0 rounded px-1 text-left text-[11px] font-semibold text-primary hover:underline"
                  >
                    +{dayItems.length - maxItems} de plus
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vue Jour (agenda) ─────────────────────────────────────────────────────────

function DayAgenda({ day, items, onOpen }: { day: Date; items: PlanningItem[]; onOpen: (it: PlanningItem) => void }) {
  const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
  return (
    <div className="p-4">
      <p className="mb-4 capitalize text-lg font-display font-bold text-foreground">
        {format(day, "EEEE d MMMM yyyy", { locale: fr })}
      </p>
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Rien de planifié ce jour.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((it) => {
            const s = styleFor(it);
            const Icon = s.icon;
            return (
              <button
                key={it.key}
                onClick={() => onOpen(it)}
                className="kb-card flex w-full items-center gap-3 text-left"
                style={{ borderLeft: `3px solid ${s.color}`, marginBottom: 0 }}
              >
                <span style={{ width: 56, flexShrink: 0, fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 500, color: s.color }}>{format(it.date, "HH:mm")}</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: s.soft, color: s.color }}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Vue Liste ─────────────────────────────────────────────────────────────────

function ListView({ items, onOpen }: { items: PlanningItem[]; onOpen: (it: PlanningItem) => void }) {
  const sorted = [...items].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (!sorted.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm text-muted-foreground">Aucun élément planifié.</p>
      </div>
    );
  }
  const groups = new Map<string, PlanningItem[]>();
  for (const it of sorted) {
    const k = format(it.date, "yyyy-MM-dd");
    const arr = groups.get(k) ?? [];
    arr.push(it);
    groups.set(k, arr);
  }
  return (
    <div className="divide-y divide-border">
      {[...groups.entries()].map(([k, group]) => (
        <div key={k} className="p-4">
          <p className="mb-3 text-sm font-semibold capitalize text-foreground">
            {format(parseISO(k), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <div className="space-y-2">
            {group.map((it) => {
              const s = styleFor(it);
              const Icon = s.icon;
              return (
                <button
                  key={it.key}
                  onClick={() => onOpen(it)}
                  className="kb-card flex w-full items-center gap-3 text-left"
                  style={{ borderLeft: `3px solid ${s.color}`, marginBottom: 0 }}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: s.soft, color: s.color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                    <p className="text-xs text-muted-foreground">{format(it.date, "HH:mm")} · {s.label}</p>
                  </div>
                  <span className="cat" style={{ textTransform: "capitalize" }}>{it.status}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
