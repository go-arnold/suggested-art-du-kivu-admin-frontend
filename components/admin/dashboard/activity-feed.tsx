"use client";

import { cn } from "@/lib/utils";
import { FileText, LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ArticleList } from "@/lib/api";

interface ActivityFeedProps {
  latestNews?: ArticleList[];
}

export function ActivityFeed({ latestNews }: ActivityFeedProps) {
  const items = latestNews ?? [];

  return (
    <div className="rounded-xl bg-card p-6 card-shadow">
      <h3 className="font-display text-lg font-semibold text-foreground">
        Derniers Articles
      </h3>
      <p className="text-sm text-muted-foreground">
        Publications récentes sur la plateforme
      </p>

      <div className="mt-6 space-y-1">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune activité récente
          </p>
        ) : (
          items.slice(0, 6).map((article, index) => {
            const categoryName =
              typeof article.category === "string"
                ? article.category
                : (article.category as { name?: string })?.name ?? "—";

            return (
              <div
                key={article.id}
                className={cn(
                  "group relative flex items-start gap-4 rounded-lg p-3 transition-smooth hover:bg-muted/50",
                  index !== Math.min(items.length, 6) - 1 &&
                    "border-b border-border/50"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
                  <FileText className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-1">
                    {article.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                    {article.excerpt ?? categoryName}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {article.author_name?.charAt(0).toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {article.author_name}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {article.view_count?.toLocaleString() ?? 0} vues
                    </span>
                    {article.published_at && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(article.published_at).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" }
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button className="mt-4 w-full rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-smooth">
        Voir tous les articles
      </button>
    </div>
  );
}
