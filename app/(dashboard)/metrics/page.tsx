"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Server, 
  AlertTriangle, 
  Activity,
  ExternalLink,
  Search,
  RefreshCw
} from "lucide-react";
import { metricsAPI, type MetricData, type HostMetrics, type MetricsDashboard } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MetricsPage() {
  const [selectedHost, setSelectedHost] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [isVisible, setIsVisible] = useState(false);

  // Fetch dashboard data (all hosts)
  const { data: dashboard, error: dashboardError, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR(
    "metrics-dashboard",
    () => metricsAPI.getDashboard(),
    { 
      refreshInterval: 30000,
      onError: (err) => console.log("[v0] Dashboard fetch error:", err.message),
    }
  );

  // Fetch host list
  const { data: hostList } = useSWR(
    "metrics-hosts",
    () => metricsAPI.getHosts(),
    {
      onError: (err) => console.log("[v0] Hosts fetch error:", err.message),
    }
  );

  // Fetch specific host metrics when selected
  const { data: hostMetrics, isLoading: hostLoading, mutate: mutateHost } = useSWR(
    selectedHost !== "all" ? ["host-metrics", selectedHost, timeRange] : null,
    () => metricsAPI.getHostMetrics(selectedHost, timeRange),
    { 
      refreshInterval: 30000,
      onError: (err) => console.log("[v0] Host metrics fetch error:", err.message),
    }
  );

  // WebSocket real-time updates
  const handleWSUpdate = useCallback((message: WSMessage) => {
    console.log("[v0] WebSocket metric update:", message.type);
    mutateDashboard();
    if (selectedHost !== "all") {
      mutateHost();
    }
  }, [mutateDashboard, mutateHost, selectedHost]);

  useWSSubscription("metric_update", handleWSUpdate);
  useWSSubscription("performance_alert", handleWSUpdate);

  // Animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Derive hosts from dashboard or hostList
  const hosts = hostList || dashboard?.hosts?.map(h => h.host) || [];
  
  // Calculate overview stats from dashboard
  const overview = dashboard ? {
    total_hosts: dashboard.total_hosts || dashboard.hosts?.length || 0,
    avg_cpu: dashboard.hosts?.reduce((sum, h) => sum + h.cpu.usage_percent, 0) / (dashboard.hosts?.length || 1) || 0,
    avg_memory: dashboard.hosts?.reduce((sum, h) => sum + h.memory.used_percent, 0) / (dashboard.hosts?.length || 1) || 0,
    critical_hosts: dashboard.anomalies?.map(a => a.host) || 
      dashboard.hosts?.filter(h => h.cpu.usage_percent > 90 || h.memory.used_percent > 85).map(h => h.host) || [],
  } : null;

  // Get current metrics for display
  const currentHost = selectedHost !== "all" && dashboard?.hosts 
    ? dashboard.hosts.find(h => h.host === selectedHost) 
    : null;

  // Chart data - use host history or aggregate
  const chartData = hostMetrics?.map((m) => ({
    time: new Date(m.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    cpu: m.cpu_percent,
    memory: m.memory_percent,
    disk: m.disk_percent,
  })) || dashboard?.hosts?.slice(0, 24).map((h, i) => ({
    time: new Date(Date.now() - (23 - i) * 3600000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    cpu: h.cpu.usage_percent,
    memory: h.memory.used_percent,
    disk: h.disk[0]?.used_percent || 0,
  })) || [];

  const isLoading = dashboardLoading || hostLoading;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="System Metrics"
        description="Real-time performance monitoring from Telegraf"
        onRefresh={() => {
          mutateDashboard();
          if (selectedHost !== "all") mutateHost();
        }}
        isLoading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedHost} onValueChange={setSelectedHost}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hosts (Overview)</SelectItem>
                {hosts.map((host) => (
                  <SelectItem key={host} value={host}>
                    {host}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last 1 hour</SelectItem>
                <SelectItem value="6h">Last 6 hours</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Connection Status */}
        {dashboardError && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <div className="flex-1">
                <p className="font-medium text-warning">Backend Connection Issue</p>
                <p className="text-sm text-muted-foreground">
                  Unable to fetch metrics from backend. Make sure the backend is running at the configured URL.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => mutateDashboard()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Overview Cards */}
        <div 
          className={cn(
            "grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
        >
          <Card className="card-hover">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monitored Hosts</p>
                  <p className="text-3xl font-bold">{overview?.total_hosts || 0}</p>
                </div>
                <Server className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          
          <MetricCard
            title="CPU Usage"
            value={currentHost?.cpu.usage_percent || overview?.avg_cpu || 0}
            icon={Cpu}
            colorClass="text-chart-1"
            label={selectedHost !== "all" ? selectedHost : "Average"}
          />
          
          <MetricCard
            title="Memory Usage"
            value={currentHost?.memory.used_percent || overview?.avg_memory || 0}
            icon={MemoryStick}
            colorClass="text-chart-2"
            label={selectedHost !== "all" ? selectedHost : "Average"}
          />
          
          <MetricCard
            title="Disk Usage"
            value={currentHost?.disk[0]?.used_percent || 0}
            icon={HardDrive}
            colorClass="text-chart-3"
            label={currentHost?.disk[0]?.device || "Primary"}
          />
        </div>

        {/* Critical Hosts Alert */}
        {overview?.critical_hosts && overview.critical_hosts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5 animate-fade-in">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Critical Host Alert</p>
                <p className="text-sm text-muted-foreground">
                  The following hosts require attention: {overview.critical_hosts.join(", ")}
                </p>
              </div>
              <Link href={`/investigations?source=performance`}>
                <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  View Investigations
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Anomalies from Backend */}
        {dashboard?.anomalies && dashboard.anomalies.length > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Activity className="h-4 w-4 text-warning" />
                Active Anomalies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard.anomalies.map((anomaly, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-warning" />
                      <span className="font-medium">{anomaly.host}</span>
                      <Badge variant="outline" className="border-warning/50 text-warning">
                        {anomaly.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        <span className="font-mono font-bold text-warning">{anomaly.value.toFixed(1)}%</span>
                        <span className="text-muted-foreground"> / {anomaly.threshold}% threshold</span>
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedHost(anomaly.host)}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div 
          className={cn(
            "grid gap-6 lg:grid-cols-2 transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "100ms" }}
        >
          {/* CPU Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Cpu className="h-4 w-4 text-chart-1" />
                CPU Usage
                {selectedHost !== "all" && (
                  <Badge variant="secondary" className="ml-2">{selectedHost}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="time" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "CPU"]}
                      />
                      <Area type="monotone" dataKey="cpu" stroke="hsl(var(--chart-1))" strokeWidth={2} fill="url(#cpuGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Memory Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <MemoryStick className="h-4 w-4 text-chart-2" />
                Memory Usage
                {selectedHost !== "all" && (
                  <Badge variant="secondary" className="ml-2">{selectedHost}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="time" className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis className="text-muted-foreground" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--popover-foreground))",
                        }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Memory"]}
                      />
                      <Area type="monotone" dataKey="memory" stroke="hsl(var(--chart-2))" strokeWidth={2} fill="url(#memGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Host List */}
        <Card
          className={cn(
            "transition-all duration-700",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          )}
          style={{ transitionDelay: "200ms" }}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-medium">
              <span>All Monitored Hosts</span>
              {dashboard?.hosts && (
                <Badge variant="secondary">{dashboard.hosts.length} hosts</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.hosts?.map((host) => {
                const isCritical = overview?.critical_hosts?.includes(host.host);
                const hasAnomaly = dashboard.anomalies?.some(a => a.host === host.host);

                return (
                  <div
                    key={host.host}
                    className={cn(
                      "group flex items-center justify-between rounded-lg border p-4 transition-all duration-200",
                      "hover:bg-accent/50 hover:border-primary/30 cursor-pointer",
                      isCritical && "border-destructive/50 bg-destructive/5",
                      hasAnomaly && !isCritical && "border-warning/50 bg-warning/5",
                      selectedHost === host.host && "ring-2 ring-primary/30"
                    )}
                    onClick={() => setSelectedHost(host.host)}
                  >
                    <div className="flex items-center gap-3">
                      <Server className={cn(
                        "h-5 w-5 transition-colors",
                        isCritical ? "text-destructive" : hasAnomaly ? "text-warning" : "text-muted-foreground group-hover:text-primary"
                      )} />
                      <div>
                        <p className="font-medium">{host.host}</p>
                        {isCritical && (
                          <p className="text-xs text-destructive">High resource usage</p>
                        )}
                        {hasAnomaly && !isCritical && (
                          <p className="text-xs text-warning">Anomaly detected</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <MetricBadge label="CPU" value={host.cpu.usage_percent} />
                      <MetricBadge label="Memory" value={host.memory.used_percent} />
                      <MetricBadge label="Disk" value={host.disk[0]?.used_percent || 0} />
                      <Link 
                        href={`/investigations?host=${host.host}`}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
              
              {(!dashboard?.hosts || dashboard.hosts.length === 0) && !dashboardLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Server className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No hosts found</p>
                  <p className="text-sm text-muted-foreground/70">
                    Make sure Telegraf is sending metrics to Elasticsearch
                  </p>
                </div>
              )}
              
              {dashboardLoading && (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  colorClass,
  label,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  label?: string;
}) {
  const isWarning = value > 80;
  const isCritical = value > 90;

  return (
    <Card className={cn(
      "card-hover",
      isCritical && "border-destructive/50",
      isWarning && !isCritical && "border-warning/50"
    )}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              {label && <p className="text-xs text-muted-foreground/70">{label}</p>}
            </div>
            <Icon className={cn("h-5 w-5", colorClass)} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={cn(
              "text-3xl font-bold tabular-nums",
              isCritical && "text-destructive",
              isWarning && !isCritical && "text-warning"
            )}>
              {value.toFixed(1)}%
            </p>
          </div>
          <Progress
            value={value}
            className={cn(
              "h-2",
              isCritical && "[&>div]:bg-destructive",
              isWarning && !isCritical && "[&>div]:bg-warning"
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  const isWarning = value > 80;
  const isCritical = value > 90;
  
  return (
    <div className="text-right min-w-[60px]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "font-mono text-sm font-medium tabular-nums",
        isCritical && "text-destructive",
        isWarning && !isCritical && "text-warning"
      )}>
        {value.toFixed(1)}%
      </p>
    </div>
  );
}
