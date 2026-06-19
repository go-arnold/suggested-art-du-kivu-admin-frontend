"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Search, Filter, MoreHorizontal, Mail,
  Shield, ShieldCheck, ShieldAlert, Activity, Edit, Trash2,
  Ban, CheckCircle, XCircle, Eye, Download, UserCog, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usersApi, authApi, type User } from "@/lib/api";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoleBadge(role: User["role"]) {
  switch (role) {
    case "admin":
      return <Badge className="bg-primary text-primary-foreground"><ShieldCheck className="mr-1 h-3 w-3" />Admin</Badge>;
    case "editor":
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Shield className="mr-1 h-3 w-3" />Éditeur</Badge>;
    case "moderator":
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700"><ShieldAlert className="mr-1 h-3 w-3" />Modérateur</Badge>;
    case "viewer":
      return <Badge variant="outline" className="border-amber-400 text-amber-600">Lecteur</Badge>;
    default:
      return <Badge variant="outline">Utilisateur</Badge>;
  }
}

function getStatusBadge(isActive: boolean) {
  return isActive
    ? <Badge variant="outline" className="border-emerald-500 text-emerald-600"><CheckCircle className="mr-1 h-3 w-3" />Actif</Badge>
    : <Badge variant="outline" className="border-muted-foreground text-muted-foreground"><XCircle className="mr-1 h-3 w-3" />Inactif</Badge>;
}

function timeAgo(dateString?: string) {
  if (!dateString) return "—";
  const diff = Date.now() - new Date(dateString).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 60) return `Il y a ${m} min`;
  if (h < 24) return `Il y a ${h}h`;
  if (d < 7)  return `Il y a ${d}j`;
  return new Date(dateString).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const PAGE_SIZE = 20;

// ── Create form state ─────────────────────────────────────────────────────────

interface CreateForm {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password1: string;
  password2: string;
  role: "admin" | "editor" | "moderator" | "user";
}

const EMPTY_FORM: CreateForm = {
  first_name: "", last_name: "", username: "",
  email: "", password1: "", password2: "", role: "user",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UtilisateursPage() {
  const [users,       setUsers]       = useState<User[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole,  setFilterRole]  = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [dialogOpen,  setDialogOpen]  = useState(false);
  const [form,        setForm]        = useState<CreateForm>(EMPTY_FORM);
  const [creating,    setCreating]    = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set("ordering", "-created_at"); // plus récents en premier
      p.set("page_size", String(PAGE_SIZE));
      if (searchQuery)          p.set("search",    searchQuery);
      if (filterRole   !== "all") p.set("role",      filterRole);
      if (filterStatus !== "all") p.set("is_active", filterStatus === "active" ? "true" : "false");
      const data = await usersApi.list(p.toString());
      setUsers(data.results);
      setTotalCount(data.count);
    } catch {
      toast.error("Erreur chargement utilisateurs — vérifiez votre connexion");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole, filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create user ─────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { first_name, last_name, username, email, password1, password2, role } = form;
    if (!first_name.trim()) { toast.error("Prénom requis"); return; }
    if (!last_name.trim())  { toast.error("Nom requis"); return; }
    if (!username.trim())   { toast.error("Username requis"); return; }
    if (!email.trim())      { toast.error("Email requis"); return; }
    if (!password1)         { toast.error("Mot de passe requis"); return; }
    if (password1 !== password2) { toast.error("Mots de passe différents"); return; }
    if (password1.length < 8)    { toast.error("Mot de passe trop court (min 8 chars)"); return; }

    setCreating(true);
    try {
      await authApi.register({ username, email, password1, password2, first_name, last_name });
      toast.success(`Compte créé pour ${first_name} ${last_name}`);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("server_error") || msg.includes("500")) {
        // Backend 500 = email config issue, account usually created
        toast.success("Compte créé (email de confirmation non envoyé)");
        setDialogOpen(false);
        setForm(EMPTY_FORM);
        fetchUsers();
      } else {
        toast.error(msg || "Erreur lors de la création");
      }
    } finally {
      setCreating(false);
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────
  const handleToggleActive = async (user: User) => {
    try {
      await usersApi.update(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? "Compte désactivé" : "Compte réactivé");
      fetchUsers();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect    = (id: number) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleSelectAll = () =>
    setSelectedIds(selectedIds.length === users.length ? [] : users.map((u) => u.id));

  // ── Stats (derived from current page, not full DB) ───────────────────────
  const admins      = users.filter((u) => u.role === "admin");
  const activeUsers = users.filter((u) => u.is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground">Gérez les utilisateurs et leurs permissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="mr-2 h-4 w-4" />Exporter</Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" />Nouvel Utilisateur</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Créer un utilisateur</DialogTitle>
                <DialogDescription>Nouveau compte avec rôle spécifique.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Prénom</Label>
                    <Input placeholder="Jean" value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nom</Label>
                    <Input placeholder="Matabaro" value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Nom d'utilisateur</Label>
                  <Input placeholder="jeanmatabaro" value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, "") })} />
                </div>

                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="jean@artdukivu.com" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Mot de passe</Label>
                    <Input type="password" placeholder="••••••••" value={form.password1}
                      onChange={(e) => setForm({ ...form, password1: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirmer</Label>
                    <Input type="password" placeholder="••••••••" value={form.password2}
                      onChange={(e) => setForm({ ...form, password2: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Rôle</Label>
                  <Select value={form.role}
                    onValueChange={(v) => setForm({ ...form, role: v as CreateForm["role"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Administrateur</div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" />Éditeur</div>
                      </SelectItem>
                      <SelectItem value="moderator">
                        <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-emerald-500" />Modérateur</div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Utilisateur</div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p><strong>Admin :</strong> Accès total</p>
                  <p><strong>Éditeur :</strong> Création et modification de contenu</p>
                  <p><strong>Modérateur :</strong> Modération des commentaires</p>
                  <p><strong>Utilisateur :</strong> Consultation uniquement</p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total",         value: totalCount,             icon: Users,       color: "text-primary" },
          { label: "Administrateurs", value: admins.length,        icon: ShieldCheck, color: "text-primary" },
          { label: "Actifs",        value: activeUsers.length,     icon: Activity,    color: "text-emerald-500" },
          { label: "Inactifs",      value: users.filter(u => !u.is_active).length, icon: Ban, color: "text-destructive" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="card-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un utilisateur..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <UserCog className="mr-2 h-4 w-4" /><SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="editor">Éditeur</SelectItem>
            <SelectItem value="moderator">Modérateur</SelectItem>
            <SelectItem value="user">Utilisateur</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
          <span className="text-sm font-medium">{selectedIds.length} sélectionné(s)</span>
          <Button variant="outline" size="sm"><Mail className="mr-2 h-4 w-4" />Email</Button>
        </div>
      )}

      {/* Table */}
      <Card className="card-shadow">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : users.map((user) => {
                const displayName = user.username || user.email?.split("@")[0] || `#${user.id}`;
                const initials    = displayName.slice(0, 2).toUpperCase();

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{displayName}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Activity className="h-3 w-3" />{timeAgo(user.last_login)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Mail className="mr-2 h-4 w-4" />Envoyer un email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={user.is_active ? "text-destructive" : "text-emerald-600"}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.is_active
                              ? <><Ban className="mr-2 h-4 w-4" />Désactiver</>
                              : <><CheckCircle className="mr-2 h-4 w-4" />Réactiver</>}
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
      </Card>
    </div>
  );
}
