"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { ArrowRight, Archive, FileText, BookOpen } from "lucide-react";
import { archivesAPI, type Archive as ArchiveType, type PaginatedResponse } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Mock data
const mockArchives: ArchiveType[] = Array.from({ length: 20 }, (_, i) => ({
  id: `archive-${i + 1}`,
  archive_id: `ARC-2024-${String(i + 1).padStart(4, "0")}`,
  investigation_id: `INV-2024-${String(i + 1).padStart(4, "0")}`,
  archived_at: new Date(Date.now() - i * 86400000).toISOString(),
  summary: [
    "SSH brute force attack mitigated - Attacker IPs blocked",
    "False positive - Legitimate admin activity",
    "Malware removed from production server",
    "Data exfiltration attempt blocked at firewall",
    "SQL injection vulnerability patched",
    "Container escape attempt prevented by Falco",
  ][i % 6],
  resolution: [
    "Blocked 47 malicious IPs at firewall, enabled fail2ban with aggressive settings",
    "Confirmed legitimate activity from authorized admin, updated whitelist",
    "Removed malware, patched vulnerability, rotated credentials",
    "Updated DLP rules, blocked data transfer to unauthorized endpoints",
    "Applied security patches, implemented input validation",
    "Updated container security policies, added runtime protection",
  ][i % 6],
  lessons_learned: i % 2 === 0 
    ? "Need to implement more aggressive rate limiting on SSH endpoints"
    : undefined,
}));

export default function ArchivesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, mutate } = useSWR<PaginatedResponse<ArchiveType>>(
    ["archives", page],
    () =>
      archivesAPI
        .list({ page, page_size: 20 })
        .catch(() => ({
          items: mockArchives.slice((page - 1) * 20, page * 20),
          total: mockArchives.length,
          page,
          page_size: 20,
          total_pages: Math.ceil(mockArchives.length / 20),
        })),
    { refreshInterval: 60000 }
  );

  const archives = data?.items || [];
  const totalPages = data?.total_pages || 1;

  const columns = [
    {
      key: "id",
      header: "Archive ID",
      cell: (archive: ArchiveType) => (
        <span className="font-mono text-sm">{archive.archive_id}</span>
      ),
      className: "w-36",
    },
    {
      key: "summary",
      header: "Summary",
      cell: (archive: ArchiveType) => (
        <div className="max-w-md">
          <p className="truncate font-medium">{archive.summary}</p>
          <p className="truncate text-xs text-muted-foreground">
            {archive.resolution}
          </p>
        </div>
      ),
    },
    {
      key: "investigation",
      header: "Investigation",
      cell: (archive: ArchiveType) => (
        <Badge
          variant="outline"
          className="cursor-pointer font-mono"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/investigations/${archive.investigation_id}`);
          }}
        >
          {archive.investigation_id}
        </Badge>
      ),
      className: "w-36",
    },
    {
      key: "lessons",
      header: "Lessons",
      cell: (archive: ArchiveType) =>
        archive.lessons_learned ? (
          <Badge variant="secondary">
            <BookOpen className="mr-1 h-3 w-3" />
            Documented
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      className: "w-28",
    },
    {
      key: "archived",
      header: "Archived",
      cell: (archive: ArchiveType) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(archive.archived_at), { addSuffix: true })}
        </span>
      ),
      className: "w-32",
    },
    {
      key: "actions",
      header: "",
      cell: (archive: ArchiveType) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/archives/${archive.archive_id}`);
          }}
        >
          View
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      ),
      className: "w-24",
    },
  ];

  // Calculate stats
  const totalArchived = mockArchives.length;
  const withLessons = mockArchives.filter((a) => a.lessons_learned).length;
  const thisMonth = mockArchives.filter(
    (a) =>
      new Date(a.archived_at).getMonth() === new Date().getMonth() &&
      new Date(a.archived_at).getFullYear() === new Date().getFullYear()
  ).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Archives"
        description="Completed investigations and remediation history"
        onRefresh={() => mutate()}
        isLoading={isLoading}
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Archived</p>
                  <p className="text-3xl font-bold">{totalArchived}</p>
                </div>
                <Archive className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold">{thisMonth}</p>
                </div>
                <FileText className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">With Lessons Learned</p>
                  <p className="text-3xl font-bold">{withLessons}</p>
                </div>
                <BookOpen className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        <DataTable
          columns={columns}
          data={archives}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(archive) => router.push(`/archives/${archive.archive_id}`)}
          isLoading={isLoading}
          emptyMessage="No archived investigations"
        />
      </div>
    </div>
  );
}
