"use client";

import { useEffect, useState } from "react";
import { Eye, Users, FileText, Calendar } from "lucide-react";
import { StatCard } from "@/components/admin/dashboard/stat-card";
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { AlertsSection } from "@/components/admin/dashboard/alerts-section";
import { UpcomingEvents } from "@/components/admin/dashboard/upcoming-events";
import { homeApi, articlesApi, eventsApi, usersApi, type HomeData } from "@/lib/api";

interface DashStats {
  totalArticles: number;
  upcomingEvents: number;
  totalUsers: number;
  totalViews: number;
}

export default function AdminDashboard() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    homeApi.get().then(setHomeData).catch(() => {});

    // Fetch real counts in parallel
    Promise.allSettled([
      articlesApi.list("page_size=1"),
      eventsApi.list("status=upcoming&page_size=1"),
      usersApi.list("page_size=1"),
    ]).then(([articlesRes, eventsRes, usersRes]) => {
      setStats({
        totalArticles:
          articlesRes.status === "fulfilled" ? articlesRes.value.count : 0,
        upcomingEvents:
          eventsRes.status === "fulfilled" ? eventsRes.value.count : 0,
        totalUsers:
          usersRes.status === "fulfilled" ? usersRes.value.count : 0,
        totalViews: 0, // no dedicated endpoint
      });
    });
  }, []);

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
          title="Articles publiés"
          value={stats ? stats.totalArticles.toLocaleString() : "…"}
          icon={FileText}
          trend="neutral"
        />
        <StatCard
          title="Événements à Venir"
          value={stats ? stats.upcomingEvents.toLocaleString() : "…"}
          icon={Calendar}
          trend="neutral"
        />
        <StatCard
          title="Utilisateurs"
          value={stats ? stats.totalUsers.toLocaleString() : "…"}
          icon={Users}
          trend="neutral"
        />
        <StatCard
          title="Artistes mis en avant"
          value={homeData?.featured_artists ? String(homeData.featured_artists.length) : "…"}
          icon={Eye}
          trend="neutral"
        />
      </div>

      {/* Alerts */}
      <AlertsSection />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityFeed latestNews={homeData?.latest_news} />
        </div>
        <div>
          <UpcomingEvents />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
}
