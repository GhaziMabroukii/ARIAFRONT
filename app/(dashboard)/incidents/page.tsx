"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { X, AlertTriangle, ArrowRight } from "lucide-react";
import { incidentsAPI, type Incident, type PaginatedResponse } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const mockIncidents: Incident[] = Array.from({ length: 15 }, (_, i) => ({
  id: `incident-${i + 1}`,
  incident_id: `INC-2024-${String(i + 1).padStart(4, "0")}`,
  created_at: new Date(Date.now() - i * 3600000).toISOString(),
  updated_at: new Date(Date.now() - i * 1800000).toISOString(),
  status: (["open", "investigating", "resolved", "closed"] as const)[i % 4],
  severity: (["critical", "high", "medium", "low"] as const)[i % 4],
  title: [
    "Brute Force Attack on SSH Service",
    "Data Exfiltration Attempt Detected",
    "Malware Infection on Production Server",
    "Unauthorized Access to Admin Panel",
    "SQL Injection Attack on Web Application",
    "DDoS Attack on API Gateway",
    "Privilege Escalation Attempt",
    "Suspicious Container Activity",
  ][i % 8],
  description: "Multiple correlated alerts indicate a potential security incident requiring investigation.",
  alert_count: Math.floor(Math.random() * 20) + 3,
  investigation_id: i % 2 === 0 ? `INV-2024-${String(i).padStart(4, "0")}` : undefined,
}));

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const severityOptions = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export default function IncidentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "all");
  const [severity, setSeverity] = useState(searchParams.get("severity") || "all");

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Incident>>(
    ["incidents", page, status, severity],
    () =>
      incidentsAPI
        .list({
          page,
          page_size: 20,
          status: status !== "all" ? status : undefined,
          severity: severity !== "all" ? severity : undefined,
        })
        .catch(() => {
          let filtered = [...mockIncidents];
          if (status !== "all") {
            filtered = filtered.filter((i) => i.status === status);
          }
          if (severity !== "all") {
            filtered = filtered.filter((i) => i.severity === severity);
          }
          return {
            items: filtered.slice((page - 1) * 20, page * 20),
            total: filtered.length,
            page,
            page_size: 20,
            total_pages: Math.ceil(filtered.length / 20),
          };
        }),
    { refreshInterval: 30000 }
  );

  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutate();
  }, [mutate]);

  useWSSubscription("incident_created", handleWSUpdate);
  useWSSubscription("incident_updated", handleWSUpdate);

  const incidents = data?.items || [];
  const totalPages = data?.total_pages || 1;

  const columns = [
    {
      key: "severity",
      header: "Severity",
      cell: (incident: Incident) => <SeverityBadge severity={incident.severity} />,
      className: "w-24",
    },
    {
      key: "id",
      header: "Incident ID",
      cell: (incident: Incident) => (
        <span className="font-mono text-sm">{incident.incident_id}</span>
      ),
      className: "w-36",
    },
    {
      key: "title",
      header: "Title",
      cell: (incident: Incident) => (
        <div className="max-w-md">
          <p className="truncate font-medium">{incident.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {incident.description}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (incident: Incident) => <StatusBadge status={incident.status} />,
      className: "w-32",
    },
    {
      key: "alerts",
      header: "Alerts",
      cell: (incident: Incident) => (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{incident.alert_count}</span>
        </div>
      ),
      className: "w-20",
    },
    {
      key: "created",
      header: "Created",
      cell: (incident: Incident) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "actions",
      header: "",
      cell: (incident: Incident) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/incidents/${incident.incident_id}`);
          }}
        >
          View
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      ),
      className: "w-24",
    },
  ];

  const clearFilters = () => {
    setStatus("all");
    setSeverity("all");
    setPage(1);
  };

  const hasFilters = status !== "all" || severity !== "all";

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Incidents"
        description="Security incidents requiring investigation"
        onRefresh={() => mutate()}
        isLoading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 p-6">
        <DataTable
          columns={columns}
          data={incidents}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(incident) => router.push(`/incidents/${incident.incident_id}`)}
          isLoading={isLoading}
          emptyMessage="No incidents found"
        />
      </div>
    </div>
  );
}
