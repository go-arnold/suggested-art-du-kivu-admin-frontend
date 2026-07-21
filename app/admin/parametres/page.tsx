"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings, Palette, Shield, Bell, Mail, Save, Upload, Globe,
} from "lucide-react";
import { toast } from "sonner";

// ── Toggle (switch design-system) ────────────────────────────────────────────────

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button type="button" className={cn("switch", on && "on")} onClick={() => setOn(!on)} />
  );
}

const NAV = [
  { key: "general",       label: "Général",       icon: Settings },
  { key: "theme",         label: "Thème",         icon: Palette },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security",      label: "Sécurité",      icon: Shield },
];

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState("general");

  const handleSave = () => {
    toast.success("Paramètres sauvegardés avec succès");
  };

  return (
    <section className="view">
      {/* Header */}
      <div className="page-h">
        <div>
          <h1>Paramètres</h1>
          <p>Configurez votre plateforme Art-du-Kivu</p>
        </div>
        <div className="h-actions">
          <button className="btn btn-red" onClick={handleSave}>
            <Save />Sauvegarder
          </button>
        </div>
      </div>

      <div className="set-wrap">
        <div className="set-nav">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={cn(activeTab === key && "on")}
              onClick={() => setActiveTab(key)}
            >
              <Icon />{label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* ── General ── */}
          {activeTab === "general" && (
            <>
              <div className="panel">
                <div className="panel-h"><div><h3>Informations du Site</h3></div></div>
                <div className="panel-b">
                  <div className="fld">
                    <label htmlFor="siteName">Nom du site</label>
                    <input id="siteName" defaultValue="Art-du-Kivu" />
                  </div>
                  <div className="fld">
                    <label htmlFor="siteUrl">URL du site</label>
                    <input id="siteUrl" defaultValue="https://art-du-kivu.com" />
                  </div>
                  <div className="fld">
                    <label htmlFor="slogan">Slogan</label>
                    <input id="slogan" defaultValue="Promotion des talents artistiques du Kivu" />
                  </div>
                  <div className="fld" style={{ marginBottom: 0 }}>
                    <label htmlFor="description">Description</label>
                    <textarea id="description" rows={4}
                      defaultValue="Art-du-Kivu est une plateforme culturelle dédiée à la promotion et à la valorisation des talents artistiques de la région du Kivu en République Démocratique du Congo." />
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h"><div><h3>Logo et Favicon</h3></div></div>
                <div className="panel-b">
                  <div className="fld-row">
                    <div className="fld" style={{ marginBottom: 0 }}>
                      <label>Logo principal</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-sidebar text-sidebar-foreground font-display text-2xl">AK</div>
                        <button className="btn btn-ghost"><Upload />Changer</button>
                      </div>
                    </div>
                    <div className="fld" style={{ marginBottom: 0 }}>
                      <label>Favicon</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-display text-sm">AK</div>
                        <button className="btn btn-ghost"><Upload />Changer</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h"><div><h3>Localisation</h3></div></div>
                <div className="panel-b">
                  <div className="fld-row">
                    <div className="fld">
                      <label><Globe style={{ display: "inline", width: 14, height: 14, marginRight: 6, verticalAlign: "-2px" }} />Langue par défaut</label>
                      <select defaultValue="fr">
                        <option value="fr">Français</option>
                        <option value="en">English</option>
                        <option value="sw">Swahili</option>
                      </select>
                    </div>
                    <div className="fld">
                      <label>Fuseau horaire</label>
                      <select defaultValue="africa-kinshasa">
                        <option value="africa-kinshasa">Africa/Kinshasa (UTC+1)</option>
                        <option value="africa-lubumbashi">Africa/Lubumbashi (UTC+2)</option>
                      </select>
                    </div>
                    <div className="fld" style={{ marginBottom: 0 }}>
                      <label>Format de date</label>
                      <select defaultValue="dd-mm-yyyy">
                        <option value="dd-mm-yyyy">DD/MM/YYYY</option>
                        <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div className="fld" style={{ marginBottom: 0 }}>
                      <label>Devise</label>
                      <select defaultValue="cdf">
                        <option value="cdf">CDF (FC)</option>
                        <option value="usd">USD ($)</option>
                        <option value="eur">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Theme ── */}
          {activeTab === "theme" && (
            <>
              <div className="panel">
                <div className="panel-h"><div><h3>Apparence</h3></div></div>
                <div className="panel-b">
                  <div className="sw-row">
                    <div>
                      <div className="t">Mode sombre</div>
                      <div className="s">Activer le thème sombre par défaut</div>
                    </div>
                    <Toggle />
                  </div>
                  <div className="fld" style={{ marginTop: 16 }}>
                    <label>Couleur principale</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
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
                  <div className="fld" style={{ marginTop: 16, marginBottom: 0 }}>
                    <label>Police de titre</label>
                    <select defaultValue="archivo" style={{ maxWidth: 200 }}>
                      <option value="archivo">Archivo Black</option>
                      <option value="inter">Inter</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h"><div><h3>Prévisualisation</h3></div></div>
                <div className="panel-b">
                  <div className="rounded-lg border border-border p-6 bg-muted/30">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-display text-lg">AK</div>
                      <div>
                        <h4 className="font-display text-xl font-bold">Art-du-Kivu</h4>
                        <p className="text-sm text-muted-foreground">Promotion des talents artistiques</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className="btn btn-red">Bouton Principal</button>
                      <button className="btn btn-ghost">Bouton Secondaire</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {activeTab === "notifications" && (
            <>
              <div className="panel">
                <div className="panel-h"><div><h3>Notifications Email</h3></div></div>
                <div className="panel-b">
                  {[
                    { label: "Nouveaux commentaires", desc: "Recevoir un email pour chaque nouveau commentaire" },
                    { label: "Nouveaux abonnés newsletter", desc: "Notification lors d'une nouvelle inscription" },
                    { label: "Rapports hebdomadaires", desc: "Résumé des statistiques chaque semaine" },
                    { label: "Alertes de sécurité", desc: "Notifications des connexions suspectes" },
                  ].map((item, i) => (
                    <div className="sw-row" key={i}>
                      <div>
                        <div className="t">{item.label}</div>
                        <div className="s">{item.desc}</div>
                      </div>
                      <Toggle defaultChecked />
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <div className="panel-h"><div><h3>Configuration SMTP</h3></div></div>
                <div className="panel-b">
                  <div className="fld-row">
                    <div className="fld"><label>Serveur SMTP</label><input placeholder="smtp.example.com" /></div>
                    <div className="fld"><label>Port</label><input placeholder="587" /></div>
                    <div className="fld"><label>Utilisateur</label><input placeholder="user@example.com" /></div>
                    <div className="fld"><label>Mot de passe</label><input type="password" placeholder="••••••••" /></div>
                  </div>
                  <div className="fld" style={{ marginBottom: 0 }}>
                    <label>Email d{"'"}envoi</label>
                    <input type="email" placeholder="noreply@art-du-kivu.com" />
                  </div>
                  <button className="btn btn-ghost" style={{ marginTop: 14 }}>
                    <Mail />Tester la configuration
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Security ── */}
          {activeTab === "security" && (
            <>
              <div className="panel">
                <div className="panel-h"><div><h3>Authentification</h3></div></div>
                <div className="panel-b">
                  <div className="sw-row">
                    <div>
                      <div className="t">Authentification à deux facteurs</div>
                      <div className="s">Exiger 2FA pour tous les administrateurs</div>
                    </div>
                    <Toggle />
                  </div>
                  <div className="sw-row">
                    <div>
                      <div className="t">Verrouillage après tentatives échouées</div>
                      <div className="s">Bloquer après 5 tentatives échouées</div>
                    </div>
                    <Toggle defaultChecked />
                  </div>
                  <div className="sw-row">
                    <div>
                      <div className="t">Expiration de session</div>
                      <div className="s">Déconnecter automatiquement après inactivité</div>
                    </div>
                    <select defaultValue="1h" style={{ width: 130 }}>
                      <option value="30m">30 min</option>
                      <option value="1h">1 heure</option>
                      <option value="4h">4 heures</option>
                      <option value="24h">24 heures</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="panel">
                <div className="panel-h"><div><h3>API Backend</h3></div></div>
                <div className="panel-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                    <div>
                      <p className="font-medium">Endpoint API</p>
                      <p className="text-muted-foreground font-mono text-xs">https://art-du-kivu-api.kelor.tech/api/v1</p>
                    </div>
                    <span className="badge b-green"><span className="bd" />Connecté</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                    <div>
                      <p className="font-medium">Documentation Swagger</p>
                      <p className="text-muted-foreground font-mono text-xs">https://art-du-kivu-api.kelor.tech/api/schema/swagger-ui/</p>
                    </div>
                    <a className="btn btn-ghost" href="https://art-du-kivu-api.kelor.tech/api/schema/swagger-ui/" target="_blank" rel="noopener noreferrer">
                      Ouvrir
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
