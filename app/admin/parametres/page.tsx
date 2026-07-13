"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings, Palette, Shield, Bell, Mail, Save, Upload, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
          <h1 className="font-display text-3xl font-bold text-foreground">Paramètres</h1>
          <p className="mt-1 text-muted-foreground">Configurez votre plateforme Art-du-Kivu</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />Sauvegarder
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card card-shadow p-1 h-auto flex-wrap">
          <TabsTrigger value="general" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />Général
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="h-4 w-4" />Thème
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" />Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />Sécurité
          </TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Informations du Site</h3>
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
                <Input id="slogan" defaultValue="Promotion des talents artistiques du Kivu" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4}
                  defaultValue="Art-du-Kivu est une plateforme culturelle dédiée à la promotion et à la valorisation des talents artistiques de la région du Kivu en République Démocratique du Congo." />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Logo et Favicon</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <Label>Logo principal</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground font-display text-2xl">AK</div>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Changer</Button>
                </div>
              </div>
              <div className="space-y-4">
                <Label>Favicon</Label>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-sm">AK</div>
                  <Button variant="outline" size="sm"><Upload className="mr-2 h-4 w-4" />Changer</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Localisation</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Langue par défaut</Label>
                <Select defaultValue="fr">
                  <SelectTrigger><Globe className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="africa-kinshasa">Africa/Kinshasa (UTC+1)</SelectItem>
                    <SelectItem value="africa-lubumbashi">Africa/Lubumbashi (UTC+2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format de date</Label>
                <Select defaultValue="dd-mm-yyyy">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Devise</Label>
                <Select defaultValue="cdf">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdf">CDF (FC)</SelectItem>
                    <SelectItem value="usd">USD ($)</SelectItem>
                    <SelectItem value="eur">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Theme ── */}
        <TabsContent value="theme" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Apparence</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Mode sombre</Label>
                  <p className="text-sm text-muted-foreground">Activer le thème sombre par défaut</p>
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
                  ].map((opt) => (
                    <button
                      key={opt.name}
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border-2 transition-all hover:scale-105",
                        opt.color === "#D97706" ? "border-foreground ring-2 ring-offset-2 ring-primary" : "border-transparent"
                      )}
                      style={{ backgroundColor: opt.color }}
                      title={opt.name}
                    />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Police de titre</Label>
                <Select defaultValue="archivo">
                  <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="archivo">Archivo Black</SelectItem>
                    <SelectItem value="inter">Inter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Prévisualisation</h3>
            <div className="rounded-lg border border-border p-6 bg-muted/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-lg">AK</div>
                <div>
                  <h4 className="font-display text-xl font-bold">Art-du-Kivu</h4>
                  <p className="text-sm text-muted-foreground">Promotion des talents artistiques</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button size="sm">Bouton Principal</Button>
                <Button size="sm" variant="outline">Bouton Secondaire</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Notifications Email</h3>
            <div className="space-y-6">
              {[
                { label: "Nouveaux commentaires", desc: "Recevoir un email pour chaque nouveau commentaire" },
                { label: "Nouveaux abonnés newsletter", desc: "Notification lors d'une nouvelle inscription" },
                { label: "Rapports hebdomadaires", desc: "Résumé des statistiques chaque semaine" },
                { label: "Alertes de sécurité", desc: "Notifications des connexions suspectes" },
              ].map((item, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-6" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Configuration SMTP</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2"><Label>Serveur SMTP</Label><Input placeholder="smtp.example.com" /></div>
              <div className="space-y-2"><Label>Port</Label><Input placeholder="587" /></div>
              <div className="space-y-2"><Label>Utilisateur</Label><Input placeholder="user@example.com" /></div>
              <div className="space-y-2"><Label>Mot de passe</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2 md:col-span-2">
                <Label>Email d{"'"}envoi</Label>
                <Input type="email" placeholder="noreply@art-du-kivu.com" />
              </div>
            </div>
            <Button variant="outline" className="mt-4 bg-transparent">
              <Mail className="mr-2 h-4 w-4" />Tester la configuration
            </Button>
          </div>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="space-y-6">
          <div className="rounded-xl bg-card p-6 card-shadow">
            <h3 className="font-display text-lg font-semibold mb-6">Authentification</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Authentification à deux facteurs</Label>
                  <p className="text-sm text-muted-foreground">Exiger 2FA pour tous les administrateurs</p>
                </div>
                <Switch />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Verrouillage après tentatives échouées</Label>
                  <p className="text-sm text-muted-foreground">Bloquer après 5 tentatives échouées</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Expiration de session</Label>
                  <p className="text-sm text-muted-foreground">Déconnecter automatiquement après inactivité</p>
                </div>
                <Select defaultValue="1h">
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
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
            <h3 className="font-display text-lg font-semibold mb-6">API Backend</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div>
                  <p className="font-medium">Endpoint API</p>
                  <p className="text-muted-foreground font-mono text-xs">https://art-du-kivu-api.kelor.tech/api/v1</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 font-medium">Connecté</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <div>
                  <p className="font-medium">Documentation Swagger</p>
                  <p className="text-muted-foreground font-mono text-xs">https://art-du-kivu-api.kelor.tech/api/schema/swagger-ui/</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href="https://art-du-kivu-api.kelor.tech/api/schema/swagger-ui/" target="_blank" rel="noopener noreferrer">
                    Ouvrir
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
