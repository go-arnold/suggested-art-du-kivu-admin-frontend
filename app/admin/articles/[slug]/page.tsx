"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Loader2,
  Eye,
  Heart,
  Calendar,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { articlesApi, type ArticleDetail } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Badge de statut aux couleurs de l'app.
function statusBadge(status: ArticleDetail["status"]) {
  switch (status) {
    case "published":
      return { label: "Publié", className: "bg-success/10 text-success border-success/20" };
    case "scheduled":
      return { label: "Programmé", className: "bg-info/10 text-info border-info/20" };
    default:
      return { label: "Brouillon", className: "bg-muted text-muted-foreground" };
  }
}

export default function ArticleDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    articlesApi
      .get(params.slug)
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

  const status = statusBadge(article.status);
  const categoryName = article.category?.name ?? "—";
  const authorName = article.author?.username ?? "—";
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  const tags = (article.tags ?? []).map((t) =>
    typeof t === "string" ? t : t.name
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/articles">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Détails de l{"'"}article
            </h1>
            <p className="max-w-xs truncate font-mono text-xs text-muted-foreground">
              {article.slug}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/admin/articles/${article.slug}/modifier`}>
            <Pencil className="mr-2 h-4 w-4" />
            Modifier l{"'"}article
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Article principal */}
        <div className="rounded-2xl bg-card card-shadow overflow-hidden">
          {/* Image à la une */}
          {article.featured_image_url && (
            <div className="aspect-video w-full overflow-hidden bg-muted">
              <img
                src={article.featured_image_url}
                alt={article.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-6 p-6 sm:p-8">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{categoryName}</Badge>
              <Badge variant="secondary" className={status.className}>
                {status.label}
              </Badge>
              {article.is_featured && (
                <Badge className="border-primary/20 bg-primary/10 text-primary">
                  <Star className="mr-1 h-3 w-3" />
                  À la une
                </Badge>
              )}
            </div>

            {/* Titre */}
            <h2 className="font-display text-3xl font-bold leading-tight text-foreground">
              {article.title}
            </h2>

            {/* Auteur + date */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={article.author?.avatar_url ?? undefined} alt={authorName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {authorInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium text-foreground">{authorName}</span>
              </span>
              {article.published_at && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(article.published_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {!!article.read_time && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {article.read_time} min de lecture
                </span>
              )}
            </div>

            <Separator />

            {/* Extrait */}
            {article.excerpt && (
              <p className="border-l-4 border-primary/30 pl-4 text-lg italic leading-relaxed text-muted-foreground">
                {article.excerpt}
              </p>
            )}

            {/* Contenu */}
            {article.content?.replace(/<[^>]*>/g, "").trim() ? (
              <div
                className="rte-content max-w-none"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Cet article n{"'"}a pas encore de contenu.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar : statistiques & métadonnées */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card p-6 card-shadow">
            <h3 className="mb-4 font-semibold text-foreground">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-muted/40 p-4 text-center">
                <Eye className="mx-auto mb-1 h-5 w-5 text-info" />
                <p className="font-display text-xl font-bold text-foreground">
                  {(article.view_count ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Vues</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4 text-center">
                <Heart className="mx-auto mb-1 h-5 w-5 text-primary" />
                <p className="font-display text-xl font-bold text-foreground">
                  {(article.like_count ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-6 card-shadow">
            <h3 className="mb-4 font-semibold text-foreground">Informations</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Catégorie</dt>
                <dd className="font-medium text-foreground">{categoryName}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Statut</dt>
                <dd>
                  <Badge variant="secondary" className={cn("text-xs", status.className)}>
                    {status.label}
                  </Badge>
                </dd>
              </div>
              {article.article_type && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {article.article_type}
                  </dd>
                </div>
              )}
            </dl>

            {tags.length > 0 && (
              <>
                <Separator className="my-4" />
                <p className="mb-2 text-sm text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
