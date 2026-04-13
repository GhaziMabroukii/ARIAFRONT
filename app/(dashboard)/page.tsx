"use client";

import { useEffect, useState, useCallback } from "react";
import useSWR from "swr";
import { AlertTriangle, FileWarning, Search, Clock, Shield, Zap, TrendingUp } from "lucide-react";
import { dashboardAPI, type DashboardStats } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertsChart } from "@/components/dashboard/alerts-chart";
import { SeverityChart } from "@/components/dashboard/severity-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

// Mock data for demonstration when API is unavailable
const mockStats: DashboardStats = {
  total_alerts: 12847,
  critical_alerts: 23,
  open_incidents: 47,
  active_investigations: 12,
  pending_approvals: 5,
  alerts_trend: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    count: Math.floor(Math.random() * 500) + 200,
  })),
  incidents_by_severity: [
    { severity: "critical", count: 8 },
    { severity: "high", count: 15 },
    { severity: "medium", count: 32 },
    { severity: "low", count: 42 },
  ],
  recent_activity: [
    {
      id: "1",
      type: "alert",
      message: "High severity alert detected from Wazuh agent on web-server-01",
      timestamp: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: "2",
      type: "incident",
      message: "New incident INC-2024-0847 created with 5 correlated alerts",
      timestamp: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "3",
      type: "investigation",
      message: "Investigation INV-2024-0312 completed - Playbook executed successfully",
      timestamp: new Date(Date.now() - 600000).toISOString(),
    },
    {
      id: "4",
      type: "archive",
      message: "Investigation INV-2024-0298 archived with resolution: False positive",
      timestamp: new Date(Date.now() - 900000).toISOString(),
    },
    {
      id: "5",
      type: "alert",
      message: "Suricata IDS detected potential SQL injection attempt",
      timestamp: new Date(Date.now() - 1200000).toISOString(),
    },
    {
      id: "6",
      type: "investigation",
      message: "AI analysis generated playbook for INV-2024-0315 - Awaiting approval",
      timestamp: new Date(Date.now() - 1500000).toISOString(),
    },
    {
      id: "7",
      type: "incident",
      message: "Incident INC-2024-0845 escalated to critical severity",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: "8",
      type: "alert",
      message: "Falco detected suspicious container activity in prod-cluster",
      timestamp: new Date(Date.now() - 2100000).toISOString(),
    },
  ],
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  
  const { data: stats, error, isLoading, mutate } = useSWR<DashboardStats>(
    "dashboard-stats",
    () => dashboardAPI.getStats().catch(() => mockStats),
    {
      refreshInterval: 30000,
      fallbackData: mockStats,
    }
  );

  // Handle real-time updates
  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutate();
  }, [mutate]);

  useWSSubscription("alert_created", handleWSUpdate);
  useWSSubscription("incident_created", handleWSUpdate);
  useWSSubscription("investigation_updated", handleWSUpdate);

  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const data = stats || mockStats;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                Security Dashboard
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                  </span>
                  Live
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                Real-time security operations overview
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-72">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search alerts, incidents, investigations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery) {
                    window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              disabled={isLoading}
              className="transition-all duration-200 hover:bg-primary/5 hover:border-primary/30"
            >
              <RefreshCw className={cn("h-4 w-4 transition-transform", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 space-y-6 p-6">
        {/* Stats Grid */}
        <div 
          className={cn(
            "grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <StatCard
            title="Total Alerts"
            value={data.total_alerts}
            subtitle="Last 24 hours"
            icon={AlertTriangle}
            trend={{ value: 12, isPositive: false }}
            className="animate-fade-in"
            style={{ animationDelay: "0ms" }}
            href="/alerts"
          />
          <StatCard
            title="Critical Alerts"
            value={data.critical_alerts}
            subtitle="Requires immediate action"
            icon={Shield}
            variant="critical"
            className="animate-fade-in"
            style={{ animationDelay: "50ms" }}
            href="/alerts?severity=critical"
          />
          <StatCard
            title="Open Incidents"
            value={data.open_incidents}
            subtitle="Under investigation"
            icon={FileWarning}
            variant="warning"
            className="animate-fade-in"
            style={{ animationDelay: "100ms" }}
            href="/incidents?status=open"
          />
          <StatCard
            title="Active Investigations"
            value={data.active_investigations}
            subtitle="AI analysis in progress"
            icon={Search}
            className="animate-fade-in"
            style={{ animationDelay: "150ms" }}
            href="/investigations?status=running"
          />
          <StatCard
            title="Pending Approvals"
            value={data.pending_approvals}
            subtitle="Playbooks awaiting review"
            icon={Clock}
            variant={data.pending_approvals > 0 ? "warning" : "success"}
            className="animate-fade-in"
            style={{ animationDelay: "200ms" }}
            href="/investigations?status=awaiting_approval"
          />
        </div>

        {/* Quick Stats Bar */}
        <div 
          className={cn(
            "flex items-center gap-6 rounded-xl border bg-card/50 px-6 py-4 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "250ms" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Threat Level</p>
              <p className="text-xs text-muted-foreground">Based on current activity</p>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-success via-warning to-destructive transition-all duration-1000"
                style={{ width: `${Math.min((data.critical_alerts / 50) * 100, 100)}%` }}
              />
            </div>
            <span className={cn(
              "text-sm font-semibold",
              data.critical_alerts > 20 ? "text-destructive" : data.critical_alerts > 10 ? "text-warning" : "text-success"
            )}>
              {data.critical_alerts > 20 ? "High" : data.critical_alerts > 10 ? "Medium" : "Low"}
            </span>
          </div>
          <div className="flex items-center gap-2 border-l pl-6">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">97.8%</span> alerts auto-classified
            </span>
          </div>
        </div>

        {/* Charts Row */}
        <div 
          className={cn(
            "grid gap-4 lg:grid-cols-3 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "300ms" }}
        >
          <AlertsChart data={data.alerts_trend} />
          <SeverityChart data={data.incidents_by_severity} />
        </div>

        {/* Activity and Actions Row */}
        <div 
          className={cn(
            "grid gap-4 lg:grid-cols-3 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "400ms" }}
        >
          <ActivityFeed activities={data.recent_activity} />
          <QuickActions
            pendingApprovals={data.pending_approvals}
            activeInvestigations={data.active_investigations}
          />
        </div>
      </div>
    </div>
  );
}
