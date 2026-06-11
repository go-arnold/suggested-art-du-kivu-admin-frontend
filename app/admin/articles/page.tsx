"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Article {
  id: string;
  title: string;
  author: string;
  category: string;
  status: "published" | "draft" | "scheduled";
  views: number;
  date: string;
  thumbnail: string;
}

const articles: Article[] = [
  {
    id: "1",
    title: "Les rythmes traditionnels du Kivu",
    author: "Jeremy Matabaro",
    category: "Culture",
    status: "published",
    views: 1234,
    date: "2026-01-28",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "2",
    title: "Festival Amani 2026 : Programme complet",
    author: "Marie K.",
    category: "Événements",
    status: "scheduled",
    views: 0,
    date: "2026-02-15",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "3",
    title: "Portrait : L'artiste peintre de Bukavu",
    author: "Admin",
    category: "Artistes",
    status: "draft",
    views: 0,
    date: "2026-01-25",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "4",
    title: "Concert de Goma : Retour en images",
    author: "Sophie M.",
    category: "Événements",
    status: "published",
    views: 856,
    date: "2026-01-20",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "5",
    title: "L'art contemporain congolais",
    author: "Jeremy Matabaro",
    category: "Culture",
    status: "published",
    views: 2341,
    date: "2026-01-18",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
  {
    id: "6",
    title: "Guide des galeries d'art à Goma",
    author: "Marie K.",
    category: "Guides",
    status: "draft",
    views: 0,
    date: "2026-01-15",
    thumbnail: "/placeholder.svg?height=80&width=120",
  },
];

const statusConfig = {
  published: { label: "Publié", className: "bg-success/10 text-success" },
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  scheduled: { label: "Programmé", className: "bg-info/10 text-info" },
};

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch = article.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || article.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || article.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const toggleSelectAll = () => {
    if (selectedArticles.length === filteredArticles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(filteredArticles.map((a) => a.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedArticles((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const categories = [...new Set(articles.map((a) => a.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Articles
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gérez vos articles et publications
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/articles/nouveau">
            <Plus className="mr-2 h-4 w-4" />
            Nouvel Article
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="published">Publié</SelectItem>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="scheduled">Programmé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedArticles.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-primary/10 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedArticles.length} article
            {selectedArticles.length > 1 ? "s" : ""} sélectionné
            {selectedArticles.length > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary">
              Publier
            </Button>
            <Button size="sm" variant="destructive">
              Supprimer
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl bg-card card-shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedArticles.length === filteredArticles.length}
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
            {filteredArticles.map((article) => {
              const status = statusConfig[article.status];
              return (
                <TableRow
                  key={article.id}
                  className={cn(
                    "group transition-colors",
                    selectedArticles.includes(article.id) && "bg-primary/5",
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedArticles.includes(article.id)}
                      onCheckedChange={() => toggleSelect(article.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-20 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={article.thumbnail || "/placeholder.svg"}
                          alt={article.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <Link
                          href={`/admin/articles/${article.id}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {article.title}
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {article.author}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {article.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {article.views.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(article.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Prévisualiser
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Affichage de {filteredArticles.length} sur {articles.length}{" "}
            articles
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-w-[40px] bg-transparent"
            >
              1
            </Button>
            <Button variant="ghost" size="sm" className="min-w-[40px]">
              2
            </Button>
            <Button variant="ghost" size="sm" className="min-w-[40px]">
              3
            </Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
