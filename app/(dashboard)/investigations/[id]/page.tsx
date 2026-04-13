"use client";

import { use, useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Brain,
  Clock,
  Target,
  Shield,
  Archive,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { investigationsAPI, type Investigation, type Playbook, type AIAnalysis, type PlaybookStep } from "@/lib/api";
import { useWSSubscription, type WSMessage } from "@/lib/websocket";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PlaybookViewer } from "@/components/playbook-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Mock data
const mockInvestigation: Investigation = {
  id: "investigation-1",
  investigation_id: "INV-2024-0001",
  created_at: new Date(Date.now() - 5400000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
  status: "awaiting_approval",
  incident_id: "INC-2024-0001",
  summary:
    "AI analysis detected a coordinated SSH brute force attack targeting production servers. The attack originated from multiple IP addresses across different geographic regions, suggesting a botnet-driven campaign. Recommended immediate actions include blocking attacking IPs, implementing rate limiting, and auditing SSH configurations.",
  ai_analysis: {
    threat_assessment:
      "HIGH SEVERITY - Coordinated brute force attack with potential for lateral movement if successful authentication is achieved.",
    confidence: 94,
    indicators: [
      "Multiple failed SSH attempts from 47 unique IP addresses",
      "Geographic distribution suggests botnet activity",
      "Attack rate of 150+ attempts per minute",
      "Targeting root and admin accounts",
      "Pattern matches known Mirai botnet signature",
    ],
    recommendations: [
      "Block attacking IP ranges at firewall level",
      "Implement fail2ban with aggressive banning",
      "Enable SSH key-only authentication",
      "Add geographic restrictions to SSH access",
      "Review and audit user accounts",
    ],
    timeline: [
      { timestamp: new Date(Date.now() - 5400000).toISOString(), event: "First attack detected", severity: "warning" },
      { timestamp: new Date(Date.now() - 4800000).toISOString(), event: "Attack rate increased to 50/min", severity: "warning" },
      { timestamp: new Date(Date.now() - 3600000).toISOString(), event: "Attack rate peaked at 150/min", severity: "critical" },
      { timestamp: new Date(Date.now() - 2700000).toISOString(), event: "AI analysis initiated", severity: "info" },
      { timestamp: new Date(Date.now() - 1800000).toISOString(), event: "Playbook generated", severity: "info" },
    ],
  },
};

const mockPlaybook: Playbook = {
  id: "playbook-1",
  name: "SSH Brute Force Response",
  description:
    "Automated response playbook for SSH brute force attacks including IP blocking, rate limiting, and configuration hardening.",
  status: "pending",
  steps: [
    {
      id: "step-1",
      order: 1,
      action: "Block Attacking IPs",
      description: "Add identified malicious IPs to firewall blocklist using iptables rules",
      status: "pending",
    },
    {
      id: "step-2",
      order: 2,
      action: "Enable Rate Limiting",
      description: "Configure fail2ban with 5 attempts / 10 minute window and 24 hour ban",
      status: "pending",
    },
    {
      id: "step-3",
      order: 3,
      action: "Audit SSH Configuration",
      description: "Review and update sshd_config to disable password authentication",
      status: "pending",
    },
    {
      id: "step-4",
      order: 4,
      action: "Generate Security Report",
      description: "Create detailed incident report with IOCs and remediation steps",
      status: "pending",
    },
    {
      id: "step-5",
      order: 5,
      action: "Notify Security Team",
      description: "Send alert to SOC team via Slack and email with investigation summary",
      status: "pending",
    },
  ],
};

export default function InvestigationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [resolution, setResolution] = useState("");
  const [lessonsLearned, setLessonsLearned] = useState("");
  const [isActioning, setIsActioning] = useState(false);

  const { data: investigation, isLoading, mutate } = useSWR(
    ["investigation", id],
    () => investigationsAPI.get(id).catch(() => mockInvestigation)
  );

  const { data: playbook } = useSWR(
    ["investigation-playbook", id],
    () => investigationsAPI.getPlaybook(id).catch(() => mockPlaybook)
  );

  const handleWSUpdate = useCallback((message: WSMessage) => {
    mutate();
  }, [mutate]);

  useWSSubscription("investigation_updated", handleWSUpdate);
  useWSSubscription("playbook_status_changed", handleWSUpdate);

  const handleApprove = async () => {
    setIsActioning(true);
    try {
      await investigationsAPI.approvePlaybook(id);
      mutate();
    } catch (error) {
      console.error("Failed to approve playbook:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleDecline = async (reason: string) => {
    setIsActioning(true);
    try {
      await investigationsAPI.declinePlaybook(id, reason);
      mutate();
    } catch (error) {
      console.error("Failed to decline playbook:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleExecute = async () => {
    setIsActioning(true);
    try {
      await investigationsAPI.executePlaybook(id);
      mutate();
    } catch (error) {
      console.error("Failed to execute playbook:", error);
    } finally {
      setIsActioning(false);
    }
  };

  const handleSavePlaybook = async (updatedPlaybook: Playbook) => {
    try {
      await investigationsAPI.updatePlaybook(id, { steps: updatedPlaybook.steps });
      mutate();
    } catch (error) {
      console.error("Failed to save playbook:", error);
      throw error;
    }
  };

  const handleArchive = async () => {
    setIsActioning(true);
    try {
      await investigationsAPI.archive(id, {
        resolution,
        lessons_learned: lessonsLearned || undefined,
      });
      router.push("/archives");
    } catch (error) {
      console.error("Failed to archive investigation:", error);
    } finally {
      setIsActioning(false);
      setShowArchiveDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const data = investigation || mockInvestigation;
  const playbookData = playbook || mockPlaybook;
  const analysis = data.ai_analysis;

  const canApprove = data.status === "awaiting_approval";
  const canExecute = data.status === "completed" && playbookData.status === "approved";
  const canArchive = data.status === "completed";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={data.investigation_id}
        description={`Investigation for ${data.incident_id}`}
        onRefresh={() => mutate()}
        actions={
          <div className="flex items-center gap-2">
            {canArchive && (
              <Button variant="outline" onClick={() => setShowArchiveDialog(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
            )}
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Status Bar */}
        <div className="grid gap-4 md:grid-cols-4">
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
                  <p className="text-sm text-muted-foreground">AI Confidence</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">
                      {analysis?.confidence || 0}%
                    </span>
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Related Incident</p>
                  <Badge
                    variant="outline"
                    className="cursor-pointer font-mono"
                    onClick={() => router.push(`/incidents/${data.incident_id}`)}
                  >
                    {data.incident_id}
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* AI Analysis */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base font-medium">AI Analysis Summary</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{data.summary}</p>

                {analysis && (
                  <>
                    {/* Threat Assessment */}
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                        <div>
                          <p className="font-medium text-destructive">Threat Assessment</p>
                          <p className="mt-1 text-sm">{analysis.threat_assessment}</p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Meter */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Analysis Confidence</span>
                        <span className="font-medium">{analysis.confidence}%</span>
                      </div>
                      <Progress value={analysis.confidence} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Indicators */}
            {analysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-warning" />
                    <CardTitle className="text-base font-medium">
                      Indicators of Compromise
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.indicators.map((indicator, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {analysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-success" />
                    <CardTitle className="text-base font-medium">
                      Recommendations
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Playbook */}
          <div className="space-y-6">
            <PlaybookViewer
              playbook={playbookData}
              canApprove={canApprove}
              canExecute={canExecute}
              canEdit={data.status === "awaiting_approval" || data.status === "pending"}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onExecute={handleExecute}
              onSave={handleSavePlaybook}
              isLoading={isActioning}
            />

            {/* Timeline */}
            {analysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Analysis Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="relative space-y-4 pl-6">
                      <div className="absolute left-2 top-2 h-[calc(100%-16px)] w-px bg-border" />
                      {analysis.timeline.map((event, index) => (
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
            )}
          </div>
        </div>
      </div>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Investigation</DialogTitle>
            <DialogDescription>
              Complete this investigation by providing a resolution summary and any
              lessons learned.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Resolution Summary *</label>
              <Textarea
                placeholder="Describe how the incident was resolved..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lessons Learned</label>
              <Textarea
                placeholder="Document any insights or improvements..."
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={!resolution.trim() || isActioning}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
