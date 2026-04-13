"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Cpu, HardDrive, MemoryStick, Server, AlertTriangle } from "lucide-react";
import { metricsAPI, type MetricData } from "@/lib/api";
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
import { cn } from "@/lib/utils";

// Mock data
const mockHosts = ["web-server-01", "db-server-02", "api-gateway-01", "prod-node-01", "prod-node-02"];

const generateMockMetrics = (host: string): MetricData[] =>
  Array.from({ length: 24 }, (_, i) => ({
    host,
    timestamp: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
    cpu_percent: Math.random() * 60 + 20,
    memory_percent: Math.random() * 40 + 40,
    disk_percent: Math.random() * 20 + 60,
  }));

const mockOverview = {
  total_hosts: 5,
  avg_cpu: 45.3,
  avg_memory: 62.1,
  critical_hosts: ["db-server-02"],
};

export default function MetricsPage() {
  const [selectedHost, setSelectedHost] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("24h");

  const { data: hosts } = useSWR("metric-hosts", () =>
    metricsAPI.getHosts().catch(() => mockHosts)
  );

  const { data: overview, mutate: mutateOverview } = useSWR(
    "metrics-overview",
    () => metricsAPI.getOverview().catch(() => mockOverview),
    { refreshInterval: 30000 }
  );

  const { data: metrics, isLoading, mutate: mutateMetrics } = useSWR(
    ["host-metrics", selectedHost, timeRange],
    () => {
      if (selectedHost === "all") {
        return Promise.resolve(generateMockMetrics("all"));
      }
      return metricsAPI
        .getHostMetrics(selectedHost, timeRange)
        .catch(() => generateMockMetrics(selectedHost));
    },
    { refreshInterval: 30000 }
  );

  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutateOverview();
    mutateMetrics();
  }, [mutateOverview, mutateMetrics]);

  useWSSubscription("metric_update", handleWSUpdate);

  const chartData =
    metrics?.map((m) => ({
      time: new Date(m.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      cpu: m.cpu_percent,
      memory: m.memory_percent,
      disk: m.disk_percent,
    })) || [];

  const currentMetrics = metrics?.[metrics.length - 1];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Host Metrics"
        description="Real-time performance monitoring"
        onRefresh={() => {
          mutateOverview();
          mutateMetrics();
        }}
        isLoading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedHost} onValueChange={setSelectedHost}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Select host" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hosts (Average)</SelectItem>
                {(hosts || mockHosts).map((host) => (
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
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Hosts</p>
                  <p className="text-3xl font-bold">{overview?.total_hosts || 0}</p>
                </div>
                <Server className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <MetricCard
            title="CPU Usage"
            value={currentMetrics?.cpu_percent || overview?.avg_cpu || 0}
            icon={Cpu}
            color="chart-1"
          />
          <MetricCard
            title="Memory Usage"
            value={currentMetrics?.memory_percent || overview?.avg_memory || 0}
            icon={MemoryStick}
            color="chart-2"
          />
          <MetricCard
            title="Disk Usage"
            value={currentMetrics?.disk_percent || 75}
            icon={HardDrive}
            color="chart-3"
          />
        </div>

        {/* Critical Hosts Alert */}
        {overview?.critical_hosts && overview.critical_hosts.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Critical Host Alert</p>
                <p className="text-sm text-muted-foreground">
                  The following hosts require attention: {overview.critical_hosts.join(", ")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* CPU Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <Cpu className="h-4 w-4 text-chart-1" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        color: "var(--color-popover-foreground)",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "CPU"]}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="var(--color-chart-1)" strokeWidth={2} fill="url(#cpuGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Memory Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <MemoryStick className="h-4 w-4 text-chart-2" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="time" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        color: "var(--color-popover-foreground)",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Memory"]}
                    />
                    <Area type="monotone" dataKey="memory" stroke="var(--color-chart-2)" strokeWidth={2} fill="url(#memGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Host List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">All Hosts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(hosts || mockHosts).map((host) => {
                const hostMetrics = generateMockMetrics(host);
                const current = hostMetrics[hostMetrics.length - 1];
                const isCritical = overview?.critical_hosts?.includes(host);

                return (
                  <div
                    key={host}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50 cursor-pointer",
                      isCritical && "border-destructive/50 bg-destructive/5"
                    )}
                    onClick={() => setSelectedHost(host)}
                  >
                    <div className="flex items-center gap-3">
                      <Server className={cn("h-5 w-5", isCritical ? "text-destructive" : "text-muted-foreground")} />
                      <div>
                        <p className="font-medium">{host}</p>
                        {isCritical && (
                          <p className="text-xs text-destructive">High resource usage</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">CPU</p>
                        <p className="font-mono text-sm">{current.cpu_percent.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Memory</p>
                        <p className="font-mono text-sm">{current.memory_percent.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Disk</p>
                        <p className="font-mono text-sm">{current.disk_percent.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
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
  color,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  const isWarning = value > 80;
  const isCritical = value > 90;

  return (
    <Card className={cn(isCritical && "border-destructive/50", isWarning && !isCritical && "border-warning/50")}>
      <CardContent className="pt-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{title}</p>
            <Icon className={cn("h-5 w-5", `text-${color}`)} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={cn("text-3xl font-bold", isCritical && "text-destructive", isWarning && !isCritical && "text-warning")}>
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
