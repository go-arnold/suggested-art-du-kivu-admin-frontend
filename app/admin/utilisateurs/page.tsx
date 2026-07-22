"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, Search, Filter, MoreVertical, Mail,
  Shield, ShieldCheck, ShieldAlert, Activity, Edit, Trash2,
  Ban, Eye, Download, UserCog, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usersApi, type User } from "@/lib/api";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AV_COLORS = ["var(--red)", "var(--blue)", "var(--gold)", "var(--emerald)", "var(--purple)", "var(--ink)"];

function getRoleBadge(role: User["role"]) {
  switch (role) {
    case "admin":
      return <span className="badge b-red"><span className="bd" />Admin</span>;
    case "editor":
      return <span className="badge b-blue"><span className="bd" />Éditeur</span>;
    case "moderator":
      return <span className="badge b-green"><span className="bd" />Modérateur</span>;
    case "viewer":
      return <span className="badge b-gold"><span className="bd" />Lecteur</span>;
    default:
      return <span className="badge b-gray"><span className="bd" />Utilisateur</span>;
  }
}

function getStatusBadge(isActive: boolean) {
  return isActive
    ? <span className="badge b-green"><span className="bd" />Actif</span>
    : <span className="badge b-gray"><span className="bd" />Inactif</span>;
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
  const [viewUser,    setViewUser]    = useState<User | null>(null);
  const [editUser,    setEditUser]    = useState<User | null>(null);
  const [editForm,    setEditForm]    = useState<{ username: string; handle: string; bio: string; is_online: boolean; role: User["role"]; is_active: boolean }>({ username: "", handle: "", bio: "", is_online: false, role: "viewer", is_active: true });
  const [savingEdit,  setSavingEdit]  = useState(false);

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
      // Création admin : compte vérifié directement, avec le rôle choisi (pas d'email de confirmation).
      await usersApi.create({ email, username, password: password1, role, first_name, last_name });
      toast.success(`Compte créé pour ${first_name} ${last_name}`);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  // ── Édition (PATCH /users/{id}/ : username, handle, bio, is_online) ────────
  const openEdit = (user: User) => {
    setEditForm({
      username: user.username ?? "",
      handle: user.handle ?? "",
      bio: user.bio ?? "",
      is_online: !!user.is_online,
      role: user.role ?? "viewer",
      is_active: user.is_active !== false,
    });
    setEditUser(user);
  };

  const handleUpdate = async () => {
    if (!editUser) return;
    if (!editForm.username.trim()) { toast.error("Le nom d'utilisateur est requis"); return; }
    // N'envoie QUE les champs modifiés : évite que le validateur d'unicité du
    // backend rejette un username inchangé (« déjà pris » par soi-même).
    const payload: Partial<User> = {};
    if (editForm.username.trim() !== editUser.username)       payload.username = editForm.username.trim();
    if (editForm.handle.trim() !== (editUser.handle ?? ""))   payload.handle = editForm.handle.trim();
    if (editForm.bio.trim() !== (editUser.bio ?? ""))         payload.bio = editForm.bio.trim();
    if (editForm.is_online !== !!editUser.is_online)          payload.is_online = editForm.is_online;
    if (editForm.role !== editUser.role)                      payload.role = editForm.role;
    if (editForm.is_active !== (editUser.is_active !== false)) payload.is_active = editForm.is_active;

    if (Object.keys(payload).length === 0) {
      toast.info("Aucune modification");
      setEditUser(null);
      return;
    }
    setSavingEdit(true);
    try {
      await usersApi.update(editUser.id, payload);
      // Vérifie que le backend a bien appliqué rôle/activation (sinon ce sont
      // des champs en lecture seule côté serializer -> on prévient honnêtement).
      const roleChanged = editForm.role !== editUser.role;
      const activeChanged = editForm.is_active !== (editUser.is_active !== false);
      if (roleChanged || activeChanged) {
        try {
          const fresh = await usersApi.get(editUser.id);
          const roleOk = !roleChanged || fresh.role === editForm.role;
          const activeOk = !activeChanged || fresh.is_active === undefined || fresh.is_active === editForm.is_active;
          if (!roleOk || !activeOk) {
            toast.error("Rôle/activation non modifiables.");
          } else {
            toast.success("Utilisateur mis à jour");
          }
        } catch {
          toast.success("Utilisateur mis à jour");
        }
      } else {
        toast.success("Utilisateur mis à jour");
      }
      setEditUser(null);
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSavingEdit(false);
    }
  };

  // ── Envoyer un email ───────────────────────────────────────────────────────
  const handleEmail = (user: User) => {
    if (!user.email) { toast.error("Aucune adresse email"); return; }
    window.location.href = `mailto:${user.email}`;
  };

  // ── Suppression unitaire (DELETE /users/{id}/ ; refuse son propre compte) ──
  const handleDelete = async (user: User) => {
    if (!confirm(`Supprimer l'utilisateur ${user.username || user.email} ?`)) return;
    try {
      await usersApi.delete(user.id);
      toast.success("Utilisateur supprimé");
      fetchUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
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

  const stats = [
    { label: "Total",           value: totalCount,                              icon: Users,       bg: "var(--blue-soft)",    fg: "var(--blue)" },
    { label: "Administrateurs", value: admins.length,                           icon: ShieldCheck, bg: "var(--purple-soft)",  fg: "var(--purple)" },
    { label: "Actifs",          value: activeUsers.length,                      icon: Activity,    bg: "var(--emerald-soft)", fg: "var(--emerald)" },
    { label: "Inactifs",        value: users.filter((u) => !u.is_active).length, icon: Ban,        bg: "var(--red-soft)",     fg: "var(--red)" },
  ];

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Utilisateurs</h1>
          <p>Gérez les utilisateurs et leurs permissions</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-ghost"><Download />Exporter</button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="btn btn-red"><UserPlus strokeWidth={2.2} />Nouvel Utilisateur</button>
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
      <div className="kpis">
        {stats.map(({ label, value, icon: Icon, bg, fg }) => (
          <div className="kpi" key={label}>
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: bg, color: fg }}><Icon /></div>
              <div><div className="kpi-lb">{label}</div></div>
            </div>
            <div className="kpi-v">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="tb-search">
          <Search />
          <input placeholder="Rechercher un utilisateur…" value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="filter">
            <UserCog /><SelectValue placeholder="Rôle" />
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
          <SelectTrigger className="filter">
            <Filter /><SelectValue placeholder="Statut" />
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
        <div
          className="toolbar"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px" }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>{selectedIds.length} sélectionné(s)</span>
          <button className="btn btn-ghost"><Mail />Email</button>
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
            <Loader2 className="animate-spin" style={{ color: "var(--t3)" }} />
          </div>
        ) : users.length === 0 ? (
          <div className="ph">
            <div className="ph-ic"><Users /></div>
            <h3>Aucun utilisateur trouvé</h3>
            <p>Aucun utilisateur ne correspond à votre recherche.</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 44 }}>
                  <Checkbox
                    checked={users.length > 0 && selectedIds.length === users.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Statut</th>
                <th>Dernière connexion</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const displayName = user.username || user.email?.split("@")[0] || `#${user.id}`;
                const initials    = displayName.slice(0, 2).toUpperCase();

                return (
                  <tr key={user.id}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </td>
                    <td>
                      <div className="art-cell">
                        <span
                          className="av"
                          style={{ width: 36, height: 36, fontSize: 13, background: AV_COLORS[i % AV_COLORS.length] }}
                        >
                          {initials}
                        </span>
                        <div>
                          <div className="art-t">{displayName}</div>
                          <div className="art-s">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>{getStatusBadge(!!user.is_active)}</td>
                    <td>
                      <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Activity style={{ width: 13, height: 13 }} />{timeAgo(user.last_login)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="row-act"><MoreVertical /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />Voir le profil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmail(user)}>
                            <Mail className="mr-2 h-4 w-4" />Envoyer un email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}>
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
      </div>

      {/* Voir le profil */}
      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          {viewUser && (
            <>
              <DialogHeader>
                <DialogTitle>Profil utilisateur</DialogTitle>
                <DialogDescription>Informations du compte.</DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 py-2">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {(viewUser.username || viewUser.email || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{viewUser.username || "—"}</p>
                  <p className="truncate text-sm text-muted-foreground">{viewUser.email}</p>
                  <div className="mt-1">{getRoleBadge(viewUser.role)}</div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Handle</dt><dd className="font-medium">{viewUser.handle || "—"}</dd></div>
                <div><dt className="text-muted-foreground">Statut</dt><dd className="font-medium">{viewUser.is_online ? "En ligne" : "Hors ligne"}</dd></div>
                <div><dt className="text-muted-foreground">Vérifié</dt><dd className="font-medium">{viewUser.is_verified ? "Oui" : "Non"}</dd></div>
                <div><dt className="text-muted-foreground">Écoutes</dt><dd className="font-medium">{viewUser.listen_count ?? 0}</dd></div>
                {viewUser.created_at && (
                  <div className="col-span-2"><dt className="text-muted-foreground">Inscrit le</dt><dd className="font-medium">{new Date(viewUser.created_at).toLocaleDateString("fr-FR")}</dd></div>
                )}
                {viewUser.bio && (
                  <div className="col-span-2"><dt className="text-muted-foreground">Bio</dt><dd className="whitespace-pre-wrap">{viewUser.bio}</dd></div>
                )}
              </dl>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleEmail(viewUser)}><Mail className="mr-2 h-4 w-4" />Email</Button>
                <Button onClick={() => { const u = viewUser; setViewUser(null); openEdit(u); }}><Edit className="mr-2 h-4 w-4" />Modifier</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modifier */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!savingEdit && !o) setEditUser(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Modifier l&apos;utilisateur</DialogTitle>
            <DialogDescription>Réservé aux administrateurs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nom d&apos;utilisateur *</Label>
              <Input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Rôle</Label>
                <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v as User["role"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="moderator">Modérateur</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Handle</Label>
                <Input value={editForm.handle} onChange={(e) => setEditForm({ ...editForm, handle: e.target.value })} placeholder="@pseudo" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Bio</Label>
              <Textarea rows={3} value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">Compte actif</Label>
                <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label className="cursor-pointer">En ligne</Label>
                <Switch checked={editForm.is_online} onCheckedChange={(v) => setEditForm({ ...editForm, is_online: v })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={savingEdit} onClick={() => setEditUser(null)}>Annuler</Button>
            <Button disabled={savingEdit} onClick={handleUpdate}>
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
