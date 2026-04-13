"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { X, ArrowRight, Clock, Brain } from "lucide-react";
import { investigationsAPI, type Investigation, type PaginatedResponse } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mock data for demonstration
const mockInvestigations: Investigation[] = Array.from({ length: 12 }, (_, i) => ({
  id: `investigation-${i + 1}`,
  investigation_id: `INV-2024-${String(i + 1).padStart(4, "0")}`,
  created_at: new Date(Date.now() - i * 5400000).toISOString(),
  updated_at: new Date(Date.now() - i * 2700000).toISOString(),
  status: (["pending", "running", "awaiting_approval", "completed", "archived", "failed"] as const)[i % 6],
  incident_id: `INC-2024-${String(i + 1).padStart(4, "0")}`,
  summary: [
    "SSH brute force attack detected from multiple IPs targeting production servers",
    "Potential data exfiltration attempt via DNS tunneling",
    "Malware signature detected in containerized workload",
    "Unauthorized API access pattern identified",
    "SQL injection attempt on web application",
    "Privilege escalation attempt in Kubernetes cluster",
  ][i % 6],
}));

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "running", label: "Running" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "failed", label: "Failed" },
];

export default function InvestigationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(searchParams.get("status") || "all");

  const { data, error, isLoading, mutate } = useSWR<PaginatedResponse<Investigation>>(
    ["investigations", page, status],
    () =>
      investigationsAPI
        .list({
          page,
          page_size: 20,
          status: status !== "all" ? status : undefined,
        })
        .catch(() => {
          let filtered = [...mockInvestigations];
          if (status !== "all") {
            filtered = filtered.filter((i) => i.status === status);
          }
          return {
            items: filtered.slice((page - 1) * 20, page * 20),
            total: filtered.length,
            page,
            page_size: 20,
            total_pages: Math.ceil(filtered.length / 20),
          };
        }),
    { refreshInterval: 15000 }
  );

  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutate();
  }, [mutate]);

  useWSSubscription("investigation_created", handleWSUpdate);
  useWSSubscription("investigation_updated", handleWSUpdate);
  useWSSubscription("playbook_status_changed", handleWSUpdate);

  const investigations = data?.items || [];
  const totalPages = data?.total_pages || 1;

  // Count pending approvals
  const pendingApprovals = mockInvestigations.filter(
    (i) => i.status === "awaiting_approval"
  ).length;

  const columns = [
    {
      key: "status",
      header: "Status",
      cell: (inv: Investigation) => <StatusBadge status={inv.status} />,
      className: "w-40",
    },
    {
      key: "id",
      header: "Investigation ID",
      cell: (inv: Investigation) => (
        <span className="font-mono text-sm">{inv.investigation_id}</span>
      ),
      className: "w-36",
    },
    {
      key: "summary",
      header: "Summary",
      cell: (inv: Investigation) => (
        <div className="max-w-lg">
          <p className="truncate">{inv.summary || "AI analysis in progress..."}</p>
        </div>
      ),
    },
    {
      key: "incident",
      header: "Incident",
      cell: (inv: Investigation) => (
        <Badge
          variant="outline"
          className="cursor-pointer font-mono"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/incidents/${inv.incident_id}`);
          }}
        >
          {inv.incident_id}
        </Badge>
      ),
      className: "w-36",
    },
    {
      key: "updated",
      header: "Last Update",
      cell: (inv: Investigation) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(inv.updated_at), { addSuffix: true })}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "actions",
      header: "",
      cell: (inv: Investigation) => (
        <Button
          variant={inv.status === "awaiting_approval" ? "default" : "ghost"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/investigations/${inv.investigation_id}`);
          }}
        >
          {inv.status === "awaiting_approval" ? "Review" : "View"}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      ),
      className: "w-28",
    },
  ];

  const clearFilters = () => {
    setStatus("all");
    setPage(1);
  };

  const hasFilters = status !== "all";

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Investigations"
        description="AI-powered security investigations with automated playbooks"
        onRefresh={() => mutate()}
        isLoading={isLoading}
        actions={
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-44">
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
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Pending Approvals Alert */}
        {pendingApprovals > 0 && status === "all" && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium">
                    {pendingApprovals} investigation{pendingApprovals > 1 ? "s" : ""} awaiting approval
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Review AI-generated playbooks before execution
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="border-warning text-warning hover:bg-warning/10"
                onClick={() => setStatus("awaiting_approval")}
              >
                Review Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statusOptions.slice(1).map((opt) => {
            const count = mockInvestigations.filter(
              (i) => i.status === opt.value
            ).length;
            const isActive = status === opt.value;

            return (
              <Card
                key={opt.value}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  isActive && "ring-2 ring-primary"
                )}
                onClick={() => setStatus(isActive ? "all" : opt.value)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={opt.value} />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <DataTable
          columns={columns}
          data={investigations}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(inv) => router.push(`/investigations/${inv.investigation_id}`)}
          isLoading={isLoading}
          emptyMessage="No investigations found"
        />
      </div>
    </div>
  );
}
