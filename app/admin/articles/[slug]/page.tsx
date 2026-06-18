"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Loader2, Eye, Calendar, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { articlesApi, type ArticleList, type ArticleCategory } from "@/lib/api";
import { toast } from "sonner";

export default function ArticlePreviewPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [article, setArticle]   = useState<ArticleList | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    articlesApi.get(params.slug)
      .then(setArticle)
      .catch(() => {
        toast.error("Article introuvable");
        router.push("/admin/articles");
      })
      .finally(() => setLoading(false));
  }, [params.slug, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!article) return null;

  const categoryName =
    typeof article.category === "string"
      ? article.category
      : (article.category as ArticleCategory)?.name ?? "—";

  const isPublished = !!article.published_at && new Date(article.published_at) <= new Date();
  const isScheduled = !!article.published_at && new Date(article.published_at) > new Date();

  // article.content may exist in detail response
  const content = (article as ArticleList & { content?: string }).content;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/articles"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Prévisualisation</h1>
            <p className="font-mono text-xs text-muted-foreground truncate max-w-xs">{params.slug}</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/articles/${params.slug}/modifier`}>
            <Pencil className="mr-2 h-4 w-4" />Modifier l'article
          </Link>
        </Button>
      </div>

      {/* Article card */}
      <div className="mx-auto max-w-3xl rounded-2xl bg-card card-shadow overflow-hidden">

        {/* Featured image */}
        {article.featured_image_url && (
          <div className="aspect-video w-full overflow-hidden bg-muted">
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-8 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryName}</Badge>
            {isPublished && (
              <Badge className="bg-success/10 text-success border-success/20">Publié</Badge>
            )}
            {isScheduled && (
              <Badge className="bg-info/10 text-info border-info/20">Programmé</Badge>
            )}
            {!article.published_at && (
              <Badge variant="secondary" className="bg-muted text-muted-foreground">Brouillon</Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl font-bold text-foreground leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {article.author_name}
            </span>
            {article.published_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(article.published_at).toLocaleDateString("fr-FR", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              {(article.view_count ?? 0).toLocaleString()} vues
            </span>
            {(article as ArticleList & { read_time?: number }).read_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {(article as ArticleList & { read_time?: number }).read_time} min de lecture
              </span>
            )}
          </div>

          <Separator />

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-lg text-muted-foreground leading-relaxed italic border-l-4 border-primary/30 pl-4">
              {article.excerpt}
            </p>
          )}

          {/* Content */}
          {content ? (
            <div
              className="prose prose-neutral dark:prose-invert max-w-none rte-content"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Le contenu complet n'est pas disponible dans la vue liste.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/articles/${params.slug}/modifier`}>
                  <Pencil className="mr-2 h-4 w-4" />Ouvrir l'éditeur
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
