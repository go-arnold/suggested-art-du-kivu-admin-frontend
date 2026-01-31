"use client"

import { useState } from "react"
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Activity,
  Edit,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  UserCog,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: "admin" | "editor" | "moderator" | "user"
  status: "active" | "inactive" | "banned"
  lastActive: string
  createdAt: string
  articlesCount: number
  commentsCount: number
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "Jean-Pierre Mulongo",
    email: "jp.mulongo@artdukivu.com",
    avatar: "/placeholder.svg",
    role: "admin",
    status: "active",
    lastActive: "2026-01-30T14:30:00",
    createdAt: "2024-03-15",
    articlesCount: 45,
    commentsCount: 128,
  },
  {
    id: "2",
    name: "Marie Kabila",
    email: "m.kabila@artdukivu.com",
    avatar: "/placeholder.svg",
    role: "editor",
    status: "active",
    lastActive: "2026-01-30T12:15:00",
    createdAt: "2024-06-20",
    articlesCount: 32,
    commentsCount: 89,
  },
  {
    id: "3",
    name: "Patrick Bisimwa",
    email: "p.bisimwa@artdukivu.com",
    avatar: "/placeholder.svg",
    role: "moderator",
    status: "active",
    lastActive: "2026-01-29T18:45:00",
    createdAt: "2024-09-10",
    articlesCount: 0,
    commentsCount: 234,
  },
  {
    id: "4",
    name: "Ange Mutombo",
    email: "a.mutombo@gmail.com",
    avatar: "/placeholder.svg",
    role: "user",
    status: "active",
    lastActive: "2026-01-28T09:30:00",
    createdAt: "2025-01-05",
    articlesCount: 0,
    commentsCount: 12,
  },
  {
    id: "5",
    name: "Solange Bahati",
    email: "s.bahati@yahoo.fr",
    avatar: "/placeholder.svg",
    role: "user",
    status: "inactive",
    lastActive: "2025-12-15T16:20:00",
    createdAt: "2025-02-18",
    articlesCount: 0,
    commentsCount: 5,
  },
  {
    id: "6",
    name: "Emmanuel Kasa",
    email: "e.kasa@outlook.com",
    avatar: "/placeholder.svg",
    role: "user",
    status: "banned",
    lastActive: "2025-11-20T11:00:00",
    createdAt: "2025-03-22",
    articlesCount: 0,
    commentsCount: 0,
  },
  {
    id: "7",
    name: "Béatrice Nyota",
    email: "b.nyota@artdukivu.com",
    avatar: "/placeholder.svg",
    role: "editor",
    status: "active",
    lastActive: "2026-01-30T10:00:00",
    createdAt: "2024-08-05",
    articlesCount: 28,
    commentsCount: 67,
  },
]

function getRoleBadge(role: User["role"]) {
  switch (role) {
    case "admin":
      return (
        <Badge className="bg-primary text-primary-foreground">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      )
    case "editor":
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          <Shield className="mr-1 h-3 w-3" />
          Éditeur
        </Badge>
      )
    case "moderator":
      return (
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
          <ShieldAlert className="mr-1 h-3 w-3" />
          Modérateur
        </Badge>
      )
    case "user":
      return (
        <Badge variant="outline">
          Utilisateur
        </Badge>
      )
  }
}

function getStatusBadge(status: User["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Actif
        </Badge>
      )
    case "inactive":
      return (
        <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
          <XCircle className="mr-1 h-3 w-3" />
          Inactif
        </Badge>
      )
    case "banned":
      return (
        <Badge variant="destructive">
          <Ban className="mr-1 h-3 w-3" />
          Banni
        </Badge>
      )
  }
}

function getTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days} jour(s)`
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === "all" || user.role === filterRole
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const admins = users.filter((u) => u.role === "admin")
  const editors = users.filter((u) => u.role === "editor" || u.role === "moderator")
  const activeUsers = users.filter((u) => u.status === "active")
  const bannedUsers = users.filter((u) => u.status === "banned")

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et leurs permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvel Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Ajouter un Utilisateur</DialogTitle>
                <DialogDescription>
                  Créez un nouveau compte utilisateur avec un rôle spécifique.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" placeholder="Ex: Jean-Pierre Mulongo" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Administrateur
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-blue-500" />
                          Éditeur
                        </div>
                      </SelectItem>
                      <SelectItem value="moderator">
                        <div className="flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4 text-emerald-500" />
                          Modérateur
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Utilisateur
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="text-sm font-medium text-foreground">
                    Permissions par rôle
                  </h4>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <li>
                      <strong>Admin:</strong> Accès total à toutes les fonctionnalités
                    </li>
                    <li>
                      <strong>Éditeur:</strong> Création et modification de contenu
                    </li>
                    <li>
                      <strong>Modérateur:</strong> Modération des commentaires
                    </li>
                    <li>
                      <strong>Utilisateur:</strong> Consultation et commentaires
                    </li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  className="bg-primary hover:bg-primary/90"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Créer l&apos;utilisateur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">+3 ce mois</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administrateurs
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins.length}</div>
            <p className="text-xs text-muted-foreground">accès complet</p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilisateurs Actifs
            </CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((activeUsers.length / users.length) * 100)}% du total
            </p>
          </CardContent>
        </Card>
        <Card className="card-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comptes Bannis
            </CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bannedUsers.length}</div>
            <p className="text-xs text-muted-foreground">restrictions actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <UserCog className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Rôle" />
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
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="inactive">Inactif</SelectItem>
            <SelectItem value="banned">Banni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
          <span className="text-sm font-medium">
            {selectedUsers.length} utilisateur(s) sélectionné(s)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Envoyer un email
            </Button>
            <Button variant="outline" size="sm">
              Changer le rôle
            </Button>
            <Button variant="destructive" size="sm">
              <Ban className="mr-2 h-4 w-4" />
              Bannir
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card className="card-shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedUsers.length === filteredUsers.length &&
                    filteredUsers.length > 0
                  }
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead className="text-right">Articles</TableHead>
              <TableHead className="text-right">Commentaires</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleSelectUser(user.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">
                        {user.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Activity className="h-3 w-3" />
                    {getTimeAgo(user.lastActive)}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {user.articlesCount}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {user.commentsCount}
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
                        <Eye className="mr-2 h-4 w-4" />
                        Voir le profil
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer un email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {user.status !== "banned" ? (
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="mr-2 h-4 w-4" />
                          Bannir l&apos;utilisateur
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-emerald-600">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Réactiver le compte
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredUsers.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold text-foreground">
              Aucun utilisateur trouvé
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez vos filtres ou ajoutez un nouvel utilisateur.
            </p>
            <Button
              className="mt-4 bg-primary hover:bg-primary/90"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
