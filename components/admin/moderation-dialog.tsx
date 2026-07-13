"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { CommentItem, ChatMessage } from "@/lib/api";
import { toast } from "sonner";

export interface ModItem {
  id: number;
  author: string;
  text: string;
  date?: string;
  avatar?: string | null;
}

/** Convertit un commentaire API en élément de modération (champs souples). */
export const commentToMod = (c: CommentItem): ModItem => ({
  id: c.id,
  author: c.author_name || "Anonyme",
  text: c.content || c.text || c.body || "",
  date: c.created_at,
  avatar: c.author_avatar ?? undefined,
});

/** Convertit un message de chat API en élément de modération. */
export const chatToMod = (m: ChatMessage): ModItem => ({
  id: m.id,
  author: m.author_name || m.username || "Anonyme",
  text: m.content || m.message || m.text || "",
  date: m.created_at,
});

interface ModerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  emptyLabel?: string;
  /** Charge la liste des éléments à modérer. */
  load: () => Promise<ModItem[]>;
  /** Supprime un élément par id. */
  remove: (id: number) => Promise<void>;
}

/**
 * Dialog de modération réutilisable : liste des commentaires ou messages de chat,
 * avec suppression. Le parent fournit `load` et `remove` propres à la ressource.
 */
export function ModerationDialog({
  open, onOpenChange, title, description, emptyLabel, load, remove,
}: ModerationDialogProps) {
  const [items, setItems] = useState<ModItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await load());
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  const handleRemove = async (id: number) => {
    if (!confirm("Supprimer définitivement ?")) return;
    setDeleting(id);
    try {
      await remove(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Supprimé");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  };

  const initials = (name: string) =>
    name.split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? "Modérez et supprimez les messages inappropriés."}</DialogDescription>
        </DialogHeader>

        <div className="min-h-[200px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{emptyLabel ?? "Aucun message."}</p>
            </div>
          ) : (
            <ul className="space-y-2 pr-1">
              {items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {it.avatar && <AvatarImage src={it.avatar} alt={it.author} />}
                    <AvatarFallback className="text-xs">{initials(it.author)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{it.author}</span>
                      {it.date && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(it.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">{it.text}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                    disabled={deleting === it.id}
                    onClick={() => handleRemove(it.id)}
                  >
                    {deleting === it.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
