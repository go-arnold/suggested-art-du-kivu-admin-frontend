"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Filter, MoreHorizontal, Eye, Pencil,
  Trash2, ChevronLeft, ChevronRight, Loader2, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { articlesApi, commentsApi, type ArticleList, type ArticleCategory } from "@/lib/api";
import { ModerationDialog, commentToMod } from "@/components/admin/moderation-dialog";
import { toast } from "sonner";

const PAGE_SIZE = 20;

// The API returns "published_at" but no explicit status field in the list
// We derive display status from is_featured / published_at
function getDisplayStatus(article: ArticleList) {
  if (!article.published_at) {
    return { label: "Brouillon", className: "bg-muted text-muted-foreground" };
  }
  const pub = new Date(article.published_at);
  if (pub > new Date()) {
    return { label: "Programmé", className: "bg-info/10 text-info" };
  }
  return { label: "Publié", className: "bg-success/10 text-success" };
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Articles</h1>
          <p className="mt-1 text-muted-foreground">Gérez vos articles et publications</p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/nouveau">
            <Plus className="mr-2 h-4 w-4" />Nouvel Article
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl bg-card p-4 card-shadow sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un article..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
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
        <div className="flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.length} article{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="destructive">Supprimer</Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-card card-shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    checked={articles.length > 0 && selectedIds.length === articles.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[300px]">Article</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Vues</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center text-muted-foreground">
                    Aucun article trouvé
                  </TableCell>
                </TableRow>
              ) : articles.map((article) => {
                const status = getDisplayStatus(article);
                return (
                  <TableRow
                    key={article.id}
                    onClick={() => router.push(`/admin/articles/${article.slug}`)}
                    className={cn(
                      "group cursor-pointer transition-colors",
                      selectedIds.includes(article.id) && "bg-primary/5"
                    )}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(article.id)}
                        onCheckedChange={() => toggleSelect(article.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-20 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={article.featured_image_url || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <Link
                          href={`/admin/articles/${article.slug}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {article.title}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{article.author_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {getCategoryName(article.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={status.className}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {(article.view_count ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getDisplayDate(article)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} sur {totalPages} · {totalCount} articles
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
                <Button
                  key={n}
                  variant={page === n ? "outline" : "ghost"}
                  size="sm"
                  className="min-w-[40px]"
                  onClick={() => setPage(n)}
                >
                  {n}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
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
    </div>
  );
}
