"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Filter, MoreVertical, Eye, Pencil, FileText,
  Trash2, ChevronLeft, ChevronRight, Loader2, MessageSquare, Inbox,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { articlesApi, commentsApi, type ArticleList, type ArticleCategory } from "@/lib/api";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { toast } from "sonner";

const PAGE_SIZE = 20;

const AV_COLORS = ["var(--red)", "var(--blue)", "var(--gold)", "var(--emerald)", "var(--purple)", "var(--ink)"];

function initials(name?: string) {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").concat(parts[1]?.[0] ?? "").toUpperCase() || name.slice(0, 2).toUpperCase();
}

// The API returns "published_at" but no explicit status field in the list
// We derive display status from is_featured / published_at
function getDisplayStatus(article: ArticleList) {
  if (!article.published_at) {
    return { label: "Brouillon", cls: "b-gray" };
  }
  const pub = new Date(article.published_at);
  if (pub > new Date()) {
    return { label: "Programmé", cls: "b-blue" };
  }
  return { label: "Publié", cls: "b-green" };
}

// Date display: use published_at for published, or a placeholder for drafts
function getDisplayDate(article: ArticleList): string {
  if (article.published_at) {
    return new Date(article.published_at).toLocaleDateString("fr-FR", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  return "Brouillon";
}

function getCategoryName(cat: ArticleList["category"]): string {
  if (!cat) return "—";
  if (typeof cat === "string") return cat;
  return (cat as ArticleCategory).name;
}

export default function ArticlesPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleList[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comments, setComments] = useState<ArticleList | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("ordering", "-created_at"); // plus récents en premier
      params.set("page", String(page));
      params.set("page_size", String(PAGE_SIZE));
      if (searchQuery) params.set("search", searchQuery);
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const data = await articlesApi.list(params.toString());
      setArticles(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Erreur lors du chargement des articles");
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  useEffect(() => {
    articlesApi.categories().then(setCategories).catch(() => {});
  }, []);

  const handleDelete = async (slug: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await articlesApi.delete(slug);
      toast.success("Article supprimé");
      fetchArticles();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const toggleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === articles.length ? [] : articles.map((a) => a.id)
    );

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const shown = articles.length;

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Articles</h1>
          <p>Gérez vos articles et publications</p>
        </div>
        <div className="h-actions">
          <Link href="/admin/articles/nouveau" className="btn btn-red">
            <Plus strokeWidth={2.2} />Nouvel Article
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input
            placeholder="Rechercher un article…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="filter">
            <Filter />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div
          className="toolbar"
          style={{ background: "var(--red-soft)", borderRadius: 12, padding: "10px 14px" }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--red-ink)" }}>
            {selectedIds.length} article{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          <button className="btn btn-red">Supprimer</button>
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--t3)" }} />
          </div>
        ) : articles.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><Inbox /></div>
            <h3>Aucun article trouvé</h3>
            <p>Aucun article ne correspond à votre recherche.</p>
            <Link href="/admin/articles/nouveau" className="btn btn-red">
              <Plus strokeWidth={2.2} />Nouvel Article
            </Link>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <Checkbox
                    checked={articles.length > 0 && selectedIds.length === articles.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th>Article</th>
                <th>Auteur</th>
                <th>Catégorie</th>
                <th>Statut</th>
                <th>Vues</th>
                <th>Date</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article, i) => {
                const status = getDisplayStatus(article);
                return (
                  <tr
                    key={article.id}
                    onClick={() => router.push(`/admin/articles/${article.slug}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(article.id)}
                        onCheckedChange={() => toggleSelect(article.id)}
                      />
                    </td>
                    <td>
                      <div className="art-cell">
                        <div className="art-thumb">
                          {article.featured_image_url
                            ? <img src={article.featured_image_url} alt={article.title} />
                            : <FileText />}
                        </div>
                        <div>
                          <div className="art-t">{article.title}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="auth">
                        <span className="av" style={{ background: AV_COLORS[i % AV_COLORS.length] }}>
                          {initials(article.author_name)}
                        </span>
                        <span>{article.author_name}</span>
                      </div>
                    </td>
                    <td><span className="cat">{getCategoryName(article.category)}</span></td>
                    <td>
                      <span className={cn("badge", status.cls)}>
                        <span className="bd" />{status.label}
                      </span>
                    </td>
                    <td><span className="num">{(article.view_count ?? 0).toLocaleString()}</span></td>
                    <td><span className="muted">{getDisplayDate(article)}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="row-act"><MoreVertical /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/articles/${article.slug}`}>
                              <Eye className="mr-2 h-4 w-4" />Voir les détails
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/articles/${article.slug}/modifier`}>
                              <Pencil className="mr-2 h-4 w-4" />Modifier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setComments(article)}>
                            <MessageSquare className="mr-2 h-4 w-4" />Commentaires
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(article.slug)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="tbl-foot">
            <span className="info">{shown} sur {totalCount} articles · Page {page} sur {totalPages}</span>
            <div className="pager">
              <button className="pg" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={cn("pg", page === n && "on")}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button className="pg" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modération des commentaires */}
      {comments && (
        <ModerationDialog
          open onOpenChange={(o) => !o && setComments(null)}
          title={`Commentaires — ${comments.title}`}
          emptyLabel="Aucun commentaire sur cet article."
          load={() => commentsApi.list("articles", comments.slug).then((r) => r.results.map(commentToMod))}
          remove={(cid) => commentsApi.remove("articles", comments.slug, cid)}
        />
      )}
    </section>
  );
}
