"use client"

import { Eye, Users, FileText, Calendar } from "lucide-react"
import { StatCard } from "@/components/admin/dashboard/stat-card"
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed"
import { QuickActions } from "@/components/admin/dashboard/quick-actions"
import { AlertsSection } from "@/components/admin/dashboard/alerts-section"
import { UpcomingEvents } from "@/components/admin/dashboard/upcoming-events"

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Tableau de Bord
        </h1>
        <p className="mt-1 text-muted-foreground">
          Bienvenue sur l{"'"}administration Art-du-Kivu
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Visites ce mois"
          value="12,847"
          change={12.5}
          changeLabel="vs mois dernier"
          icon={Eye}
          trend="up"
        />
        <StatCard
          title="Abonnés Newsletter"
          value="3,482"
          change={8.2}
          changeLabel="vs mois dernier"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Articles Publiés"
          value="24"
          change={-2}
          changeLabel="vs mois dernier"
          icon={FileText}
          trend="down"
        />
        <StatCard
          title="Événements à Venir"
          value="7"
          change={0}
          changeLabel="ce mois"
          icon={Calendar}
          trend="neutral"
        />
      </div>

      {/* Alerts */}
      <AlertsSection />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>

        {/* Upcoming Events */}
        <div>
          <UpcomingEvents />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  )
}
