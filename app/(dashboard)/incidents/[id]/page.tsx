"use client";

import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { incidentsAPI, type Incident, type Alert, type TimelineEvent } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// Mock data
const mockIncident: Incident = {
  id: "incident-1",
  incident_id: "INC-2024-0001",
  created_at: new Date(Date.now() - 7200000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  status: "investigating",
  severity: "critical",
  title: "Brute Force Attack on SSH Service",
  description:
    "Multiple SSH authentication failures detected from various source IPs, indicating a coordinated brute force attack against the production servers.",
  alert_count: 47,
  investigation_id: "INV-2024-0001",
};

const mockAlerts: Alert[] = Array.from({ length: 10 }, (_, i) => ({
  id: `alert-${i + 1}`,
  alert_id: `ALT-2024-${String(i + 100).padStart(4, "0")}`,
  timestamp: new Date(Date.now() - i * 180000).toISOString(),
  rule_level: Math.floor(Math.random() * 5) + 10,
  rule_description: `SSH authentication failure from ${192}.168.${i + 1}.${Math.floor(Math.random() * 255)}`,
  agent_name: "web-server-01",
  agent_ip: "192.168.1.10",
  source: "wazuh",
}));

const mockTimeline: TimelineEvent[] = [
  {
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    event: "Incident created from correlated alerts",
    severity: "info",
  },
  {
    timestamp: new Date(Date.now() - 6800000).toISOString(),
    event: "First SSH brute force attempt detected",
    severity: "warning",
  },
  {
    timestamp: new Date(Date.now() - 5400000).toISOString(),
    event: "Attack rate increased to 50 attempts/minute",
    severity: "critical",
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    event: "Investigation INV-2024-0001 initiated",
    severity: "info",
  },
  {
    timestamp: new Date(Date.now() - 2700000).toISOString(),
    event: "AI analysis completed - playbook generated",
    severity: "info",
  },
  {
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    event: "Status updated to investigating",
    severity: "info",
  },
];

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: incident, isLoading: incidentLoading, mutate } = useSWR(
    ["incident", id],
    () => incidentsAPI.get(id).catch(() => mockIncident)
  );

  const { data: alerts, isLoading: alertsLoading } = useSWR(
    ["incident-alerts", id],
    () => incidentsAPI.getAlerts(id).catch(() => mockAlerts)
  );

  const { data: timeline, isLoading: timelineLoading } = useSWR(
    ["incident-timeline", id],
    () => incidentsAPI.getTimeline(id).catch(() => mockTimeline)
  );

  if (incidentLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const data = incident || mockIncident;
  const alertList = alerts || mockAlerts;
  const timelineList = timeline || mockTimeline;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={data.incident_id}
        description={data.title}
        onRefresh={() => mutate()}
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <SeverityBadge severity={data.severity} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={data.status} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Related Alerts</p>
                  <p className="text-2xl font-bold">{data.alert_count}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investigation Link */}
        {data.investigation_id && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ExternalLink className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Active Investigation</p>
                  <p className="text-sm text-muted-foreground">
                    {data.investigation_id}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/investigations/${data.investigation_id}`)}
              >
                View Investigation
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="relative space-y-4 pl-6">
                  <div className="absolute left-2 top-2 h-[calc(100%-16px)] w-px bg-border" />
                  {timelineList.map((event, index) => (
                    <div key={index} className="relative">
                      <div
                        className={cn(
                          "absolute -left-6 top-1 h-3 w-3 rounded-full border-2 border-background",
                          event.severity === "critical" && "bg-destructive",
                          event.severity === "warning" && "bg-warning",
                          event.severity === "info" && "bg-primary"
                        )}
                      />
                      <div className="space-y-1">
                        <p className="text-sm">{event.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), "PPp")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Related Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Related Alerts ({alertList.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {alertList.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-accent/50 cursor-pointer"
                      onClick={() => router.push(`/alerts?id=${alert.alert_id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <SeverityBadge severity={alert.rule_level} />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {alert.rule_description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(alert.timestamp), "PPp")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{data.description}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
