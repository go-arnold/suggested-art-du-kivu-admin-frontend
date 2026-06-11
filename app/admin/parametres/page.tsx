"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Settings,
  Palette,
  Shield,
  Database,
  Upload,
  Globe,
  Bell,
  Mail,
  Save,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = () => {
    toast.success("Paramètres sauvegardés avec succès");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Paramètres
          </h1>
          <p className="mt-1 text-muted-foreground">
            Configurez votre plateforme Art-du-Kivu
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Sauvegarder
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-card card-shadow p-1 h-auto flex-wrap">
          <TabsTrigger
            value="general"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Settings className="h-4 w-4" />
            Général
          </TabsTrigger>
          <TabsTrigger
            value="theme"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Palette className="h-4 w-4" />
            Thème
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="h-4 w-4" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger
            value="backup"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Database className="h-4 w-4" />
            Sauvegarde
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Informations du Site
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="siteName">Nom du site</Label>
                <Input id="siteName" defaultValue="Art-du-Kivu" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUrl">URL du site</Label>
                <Input id="siteUrl" defaultValue="https://art-du-kivu.com" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="slogan">Slogan</Label>
                <Input
                  id="slogan"
                  defaultValue="Promotion des talents artistiques du Kivu"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  defaultValue="Art-du-Kivu est une plateforme culturelle dédiée à la promotion et à la valorisation des talents artistiques de la région du Kivu en République Démocratique du Congo."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Logo et Favicon
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Label>Logo principal</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground font-display text-2xl">
                    AK
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Changer
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-sm">
                    AK
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Changer
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Localisation
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Langue par défaut</Label>
                <Select defaultValue="fr">
                  <SelectTrigger>
                    <Globe className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="sw">Swahili</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fuseau horaire</Label>
                <Select defaultValue="africa-kinshasa">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="africa-kinshasa">
                      Africa/Kinshasa (UTC+1)
                    </SelectItem>
                    <SelectItem value="africa-lubumbashi">
                      Africa/Lubumbashi (UTC+2)
                    </SelectItem>
                    <SelectItem value="europe-paris">
                      Europe/Paris (UTC+1)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Devise</Label>
                <Select defaultValue="usd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="cdf">CDF (FC)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Theme Settings */}
        <TabsContent value="theme" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Apparence
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">
                    Activer le thème sombre par défaut
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Couleur principale</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { name: "Ambre", color: "#D97706" },
                    { name: "Émeraude", color: "#059669" },
                    { name: "Bleu Kivu", color: "#0284C7" },
                    { name: "Terracotta", color: "#EA580C" },
                    { name: "Or", color: "#CA8A04" },
                  ].map((option) => (
                    <button
                      key={option.name}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105",
                        option.color === "#D97706"
                          ? "border-foreground ring-2 ring-offset-2 ring-primary"
                          : "border-transparent",
                      )}
                      style={{ backgroundColor: option.color }}
                      title={option.name}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Police de titre</Label>
                <Select defaultValue="archivo">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="archivo">Archivo Black</SelectItem>
                    <SelectItem value="clash">Clash Display</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Police de corps</Label>
                <Select defaultValue="dm-sans">
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dm-sans">DM Sans</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                    <SelectItem value="roboto">Roboto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Prévisualisation
            </h3>

            <div className="rounded-lg border border-border p-6 bg-muted/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-lg">
                  AK
                </div>
                <div>
                  <h4 className="font-display text-xl font-bold">
                    Art-du-Kivu
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Promotion des talents artistiques
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Voici un aperçu de l{"'"}apparence de votre site avec les
                paramètres actuels. Les modifications seront visibles
                immédiatement après la sauvegarde.
              </p>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Bouton Principal</Button>
                <Button size="sm" variant="outline">
                  Bouton Secondaire
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Notifications Email
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Nouveaux commentaires</Label>
                  <p className="text-sm text-muted-foreground">
                    Recevoir un email pour chaque nouveau commentaire
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Nouveaux abonnés newsletter</Label>
                  <p className="text-sm text-muted-foreground">
                    Notification lors d{"'"}une nouvelle inscription
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Rapports hebdomadaires</Label>
                  <p className="text-sm text-muted-foreground">
                    Résumé des statistiques chaque semaine
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Alertes de sécurité</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications des connexions suspectes
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Configuration SMTP
            </h3>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">Serveur SMTP</Label>
                <Input id="smtpHost" placeholder="smtp.example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPort">Port</Label>
                <Input id="smtpPort" placeholder="587" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpUser">Utilisateur</Label>
                <Input id="smtpUser" placeholder="user@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPass">Mot de passe</Label>
                <Input id="smtpPass" type="password" placeholder="••••••••" />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fromEmail">Email d{"'"}envoi</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@art-du-kivu.com"
                />
              </div>
            </div>

            <Button variant="outline" className="mt-4 bg-transparent">
              <Mail className="mr-2 h-4 w-4" />
              Tester la configuration
            </Button>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Authentification
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Exiger 2FA pour tous les administrateurs
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Verrouillage après tentatives échouées</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloquer après 5 tentatives de connexion échouées
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Expiration de session</Label>
                  <p className="text-sm text-muted-foreground">
                    Déconnecter automatiquement après inactivité
                  </p>
                </div>
                <Select defaultValue="1h">
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30m">30 min</SelectItem>
                    <SelectItem value="1h">1 heure</SelectItem>
                    <SelectItem value="4h">4 heures</SelectItem>
                    <SelectItem value="24h">24 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Journaux de Connexion
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Jeremy Matabaro</p>
                  <p className="text-sm text-muted-foreground">
                    192.168.1.1 · Chrome · Windows
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-success font-medium">Succès</p>
                  <p className="text-xs text-muted-foreground">
                    Il y a 2 heures
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">Marie K.</p>
                  <p className="text-sm text-muted-foreground">
                    10.0.0.5 · Safari · macOS
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-success font-medium">Succès</p>
                  <p className="text-xs text-muted-foreground">Hier</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5">
                <div>
                  <p className="font-medium">Inconnu</p>
                  <p className="text-sm text-muted-foreground">
                    45.67.89.123 · Firefox · Linux
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-destructive font-medium">Échec</p>
                  <p className="text-xs text-muted-foreground">
                    Il y a 3 jours
                  </p>
                </div>
              </div>
            </div>

            <Button variant="outline" className="mt-4 bg-transparent">
              Voir tous les journaux
            </Button>
          </div>
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Sauvegarde Automatique
            </h3>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Sauvegardes automatiques</Label>
                  <p className="text-sm text-muted-foreground">
                    Créer des sauvegardes régulières
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Fréquence</Label>
                  <p className="text-sm text-muted-foreground">
                    Intervalle entre les sauvegardes
                  </p>
                </div>
                <Select defaultValue="daily">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Toutes les heures</SelectItem>
                    <SelectItem value="daily">Quotidienne</SelectItem>
                    <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Conservation</Label>
                  <p className="text-sm text-muted-foreground">
                    Durée de conservation des sauvegardes
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 jours</SelectItem>
                    <SelectItem value="30">30 jours</SelectItem>
                    <SelectItem value="90">90 jours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">
              Sauvegardes Récentes
            </h3>

            <div className="space-y-3">
              {[
                { date: "2026-01-30 06:00", size: "245 MB", status: "success" },
                { date: "2026-01-29 06:00", size: "243 MB", status: "success" },
                { date: "2026-01-28 06:00", size: "241 MB", status: "success" },
                { date: "2026-01-27 06:00", size: "240 MB", status: "success" },
              ].map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{backup.date}</p>
                      <p className="text-xs text-muted-foreground">
                        {backup.size}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      Restaurer
                    </Button>
                    <Button variant="ghost" size="sm">
                      Télécharger
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4">
              <Button>
                <Database className="mr-2 h-4 w-4" />
                Créer une sauvegarde
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Restaurer
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
