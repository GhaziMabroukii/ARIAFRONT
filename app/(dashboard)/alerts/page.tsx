"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ExternalLink, Filter, X } from "lucide-react";
import { alertsAPI, type Alert, type PaginatedResponse } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { SeverityBadge } from "@/components/severity-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

// Mock data for demonstration
const mockAlerts: Alert[] = Array.from({ length: 25 }, (_, i) => ({
  id: `alert-${i + 1}`,
  alert_id: `ALT-2024-${String(i + 1).padStart(4, "0")}`,
  timestamp: new Date(Date.now() - i * 300000).toISOString(),
  rule_level: Math.floor(Math.random() * 15) + 1,
  rule_description: [
    "SSH brute force attack detected",
    "Suspicious file modification in /etc/passwd",
    "Multiple failed authentication attempts",
    "Potential SQL injection attempt",
    "Unusual network traffic pattern detected",
    "Container escape attempt detected by Falco",
    "Malware signature detected by ClamAV",
    "Unauthorized API access attempt",
  ][i % 8],
  agent_name: [`web-server-01`, `db-server-02`, `api-gateway-01`, `prod-node-${(i % 5) + 1}`][i % 4],
  agent_ip: `192.168.${(i % 3) + 1}.${(i % 254) + 1}`,
  source: ["wazuh", "falco", "suricata", "filebeat"][i % 4],
  incident_id: i % 3 === 0 ? `INC-2024-${String(Math.floor(i / 3)).padStart(4, "0")}` : undefined,
  investigation_id: i % 5 === 0 ? `INV-2024-${String(Math.floor(i / 5)).padStart(4, "0")}` : undefined,
}));

const sourceOptions = [
  { value: "all", label: "All Sources" },
  { value: "wazuh", label: "Wazuh" },
  { value: "falco", label: "Falco" },
  { value: "suricata", label: "Suricata" },
  { value: "filebeat", label: "Filebeat" },
];

const levelOptions = [
  { value: "all", label: "All Levels" },
  { value: "12", label: "Critical (12+)" },
  { value: "8", label: "High (8+)" },
  { value: "4", label: "Medium (4+)" },
  { value: "1", label: "Low (1+)" },
];

export default function AlertsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState(searchParams.get("source") || "all");
  const [level, setLevel] = useState(searchParams.get("level") || "all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Alert>>(
    ["alerts", page, source, level],
    () =>
      alertsAPI
        .list({
          page,
          page_size: 20,
          source: source !== "all" ? source : undefined,
          level: level !== "all" ? parseInt(level) : undefined,
        })
        .catch(() => ({
          items: mockAlerts.slice((page - 1) * 20, page * 20),
          total: mockAlerts.length,
          page,
          page_size: 20,
          total_pages: Math.ceil(mockAlerts.length / 20),
        })),
    { refreshInterval: 30000 }
  );

  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutate();
  }, [mutate]);

  useWSSubscription("alert_created", handleWSUpdate);

  const alerts = data?.items || [];
  const totalPages = data?.total_pages || 1;

  const columns = [
    {
      key: "severity",
      header: "Severity",
      cell: (alert: Alert) => <SeverityBadge severity={alert.rule_level} />,
      className: "w-24",
    },
    {
      key: "id",
      header: "Alert ID",
      cell: (alert: Alert) => (
        <span className="font-mono text-sm">{alert.alert_id}</span>
      ),
      className: "w-36",
    },
    {
      key: "description",
      header: "Description",
      cell: (alert: Alert) => (
        <div className="max-w-md">
          <p className="truncate font-medium">{alert.rule_description}</p>
          <p className="text-xs text-muted-foreground">
            {alert.agent_name} ({alert.agent_ip})
          </p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (alert: Alert) => (
        <Badge variant="outline" className="capitalize">
          {alert.source}
        </Badge>
      ),
      className: "w-28",
    },
    {
      key: "timestamp",
      header: "Time",
      cell: (alert: Alert) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "links",
      header: "",
      cell: (alert: Alert) => (
        <div className="flex items-center gap-1">
          {alert.incident_id && (
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/incidents/${alert.incident_id}`);
              }}
            >
              {alert.incident_id}
            </Badge>
          )}
        </div>
      ),
      className: "w-32",
    },
  ];

  const clearFilters = () => {
    setSource("all");
    setLevel("all");
    setPage(1);
  };

  const hasFilters = source !== "all" || level !== "all";

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Alerts"
        description="Security alerts from all monitoring sources"
        onRefresh={() => mutate()}
        isLoading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <Select value={source} onValueChange={(v) => { setSource(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map((opt) => (
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
          data={alerts}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={setSelectedAlert}
          isLoading={isLoading}
          emptyMessage="No alerts found"
        />
      </div>

      {/* Alert Detail Sheet */}
      <Sheet open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          {selectedAlert && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={selectedAlert.rule_level} />
                  <SheetTitle className="font-mono">
                    {selectedAlert.alert_id}
                  </SheetTitle>
                </div>
                <SheetDescription>
                  Alert details and related information
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Description
                  </h4>
                  <p className="mt-1">{selectedAlert.rule_description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Source
                    </h4>
                    <p className="mt-1 capitalize">{selectedAlert.source}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Level
                    </h4>
                    <p className="mt-1">{selectedAlert.rule_level}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Agent
                    </h4>
                    <p className="mt-1">{selectedAlert.agent_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      IP Address
                    </h4>
                    <p className="mt-1 font-mono">{selectedAlert.agent_ip}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Timestamp
                  </h4>
                  <p className="mt-1">
                    {format(new Date(selectedAlert.timestamp), "PPpp")}
                  </p>
                </div>

                {(selectedAlert.incident_id || selectedAlert.investigation_id) && (
                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                      Related Items
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlert.incident_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/incidents/${selectedAlert.incident_id}`)
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {selectedAlert.incident_id}
                        </Button>
                      )}
                      {selectedAlert.investigation_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/investigations/${selectedAlert.investigation_id}`
                            )
                          }
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {selectedAlert.investigation_id}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
