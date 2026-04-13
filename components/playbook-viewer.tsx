"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Play,
  Clock,
  ChevronRight,
  Terminal,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  GripVertical,
  Code2,
  List,
  AlertTriangle,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Playbook, PlaybookStep } from "@/lib/api";

interface PlaybookViewerProps {
  playbook: Playbook;
  canApprove?: boolean;
  canExecute?: boolean;
  canEdit?: boolean;
  onApprove?: () => void;
  onDecline?: (reason: string) => void;
  onExecute?: () => void;
  onSave?: (playbook: Playbook) => Promise<void>;
  isLoading?: boolean;
}

const stepIcons: Record<string, React.ElementType> = {
  pending: Clock,
  running: Play,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: ChevronRight,
};

// Convert playbook to YAML string
function playbookToYaml(playbook: Playbook): string {
  const lines: string[] = [
    `# Ansible Playbook: ${playbook.name}`,
    `# ${playbook.description}`,
    ``,
    `---`,
    `- name: ${playbook.name}`,
    `  hosts: all`,
    `  become: yes`,
    `  tasks:`,
  ];

  playbook.steps.forEach((step) => {
    lines.push(`    - name: "${step.action}"`);
    lines.push(`      # ${step.description}`);
    
    // Generate task based on action type
    const actionLower = step.action.toLowerCase();
    if (actionLower.includes('block') || actionLower.includes('firewall')) {
      lines.push(`      iptables:`);
      lines.push(`        chain: INPUT`);
      lines.push(`        source: "{{ item }}"`);
      lines.push(`        jump: DROP`);
      lines.push(`      loop: "{{ blocked_ips }}"`);
    } else if (actionLower.includes('rate limit') || actionLower.includes('fail2ban')) {
      lines.push(`      template:`);
      lines.push(`        src: templates/fail2ban-jail.local.j2`);
      lines.push(`        dest: /etc/fail2ban/jail.local`);
      lines.push(`      notify: restart fail2ban`);
    } else if (actionLower.includes('ssh') || actionLower.includes('config')) {
      lines.push(`      lineinfile:`);
      lines.push(`        path: /etc/ssh/sshd_config`);
      lines.push(`        regexp: "^PasswordAuthentication"`);
      lines.push(`        line: "PasswordAuthentication no"`);
      lines.push(`      notify: restart sshd`);
    } else if (actionLower.includes('report')) {
      lines.push(`      template:`);
      lines.push(`        src: templates/security-report.j2`);
      lines.push(`        dest: "/var/reports/incident-{{ ansible_date_time.iso8601 }}.html"`);
    } else if (actionLower.includes('notify') || actionLower.includes('slack') || actionLower.includes('email')) {
      lines.push(`      slack:`);
      lines.push(`        token: "{{ slack_token }}"`);
      lines.push(`        channel: "#security-alerts"`);
      lines.push(`        msg: "{{ notification_message }}"`);
    } else {
      lines.push(`      shell: |`);
      lines.push(`        echo "Executing: ${step.action}"`);
      lines.push(`        # Add your implementation here`);
    }
    lines.push(``);
  });

  lines.push(`  handlers:`);
  lines.push(`    - name: restart fail2ban`);
  lines.push(`      service:`);
  lines.push(`        name: fail2ban`);
  lines.push(`        state: restarted`);
  lines.push(``);
  lines.push(`    - name: restart sshd`);
  lines.push(`      service:`);
  lines.push(`        name: sshd`);
  lines.push(`        state: restarted`);

  return lines.join('\n');
}

export function PlaybookViewer({
  playbook,
  canApprove,
  canExecute,
  canEdit = true,
  onApprove,
  onDecline,
  onExecute,
  onSave,
  isLoading,
}: PlaybookViewerProps) {
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlaybook, setEditedPlaybook] = useState<Playbook>(playbook);
  const [yamlContent, setYamlContent] = useState(() => playbookToYaml(playbook));
  const [activeTab, setActiveTab] = useState<"steps" | "yaml">("steps");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedPlaybook(playbook);
    setYamlContent(playbookToYaml(playbook));
    setHasChanges(false);
  }, [playbook]);

  const handleDecline = () => {
    onDecline?.(declineReason);
    setShowDeclineDialog(false);
    setDeclineReason("");
  };

  const handleStepChange = (index: number, field: keyof PlaybookStep, value: string) => {
    const newSteps = [...editedPlaybook.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditedPlaybook({ ...editedPlaybook, steps: newSteps });
    setHasChanges(true);
  };

  const handleAddStep = () => {
    const newStep: PlaybookStep = {
      id: `step-${Date.now()}`,
      order: editedPlaybook.steps.length + 1,
      action: "New Action",
      description: "Describe this action",
      status: "pending",
    };
    setEditedPlaybook({
      ...editedPlaybook,
      steps: [...editedPlaybook.steps, newStep],
    });
    setHasChanges(true);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = editedPlaybook.steps.filter((_, i) => i !== index);
    // Reorder remaining steps
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setEditedPlaybook({ ...editedPlaybook, steps: newSteps });
    setHasChanges(true);
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= editedPlaybook.steps.length) return;
    
    const newSteps = [...editedPlaybook.steps];
    const [removed] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, removed);
    
    // Update order
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    
    setEditedPlaybook({ ...editedPlaybook, steps: newSteps });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!onSave) return;
    
    setIsSaving(true);
    try {
      await onSave(editedPlaybook);
      setIsEditing(false);
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save playbook:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedPlaybook(playbook);
    setYamlContent(playbookToYaml(playbook));
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleYamlChange = (value: string) => {
    setYamlContent(value);
    setHasChanges(true);
  };

  const currentPlaybook = isEditing ? editedPlaybook : playbook;

  return (
    <TooltipProvider>
      <Card className="animate-fade-in overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {isEditing ? (
                <Input
                  value={editedPlaybook.name}
                  onChange={(e) => {
                    setEditedPlaybook({ ...editedPlaybook, name: e.target.value });
                    setHasChanges(true);
                  }}
                  className="h-8 text-base font-medium"
                />
              ) : (
                <CardTitle className="text-base font-medium">
                  {currentPlaybook.name}
                </CardTitle>
              )}
              {isEditing ? (
                <Input
                  value={editedPlaybook.description}
                  onChange={(e) => {
                    setEditedPlaybook({ ...editedPlaybook, description: e.target.value });
                    setHasChanges(true);
                  }}
                  className="h-7 text-sm text-muted-foreground"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {currentPlaybook.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={currentPlaybook.status} />
              {canEdit && !isEditing && currentPlaybook.status === "pending" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 transition-all hover:scale-105"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Playbook</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing && (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "steps" | "yaml")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="steps" className="gap-2">
                  <List className="h-4 w-4" />
                  Steps Editor
                </TabsTrigger>
                <TabsTrigger value="yaml" className="gap-2">
                  <Code2 className="h-4 w-4" />
                  YAML Editor
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="steps" className="mt-4">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3 stagger-children">
                    {editedPlaybook.steps.map((step, index) => (
                      <EditableStepCard
                        key={step.id}
                        step={step}
                        index={index}
                        isLast={index === editedPlaybook.steps.length - 1}
                        onChange={(field, value) => handleStepChange(index, field, value)}
                        onRemove={() => handleRemoveStep(index)}
                        onMoveUp={() => handleMoveStep(index, index - 1)}
                        onMoveDown={() => handleMoveStep(index, index + 1)}
                        canMoveUp={index > 0}
                        canMoveDown={index < editedPlaybook.steps.length - 1}
                      />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-4 w-full border-dashed transition-all hover:border-primary hover:bg-primary/5"
                    onClick={handleAddStep}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Step
                  </Button>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="yaml" className="mt-4">
                <div className="relative">
                  <div className="absolute left-0 top-0 flex h-full w-10 flex-col items-end border-r bg-muted/50 pr-2 pt-3 font-mono text-xs text-muted-foreground">
                    {yamlContent.split('\n').map((_, i) => (
                      <div key={i} className="leading-6">{i + 1}</div>
                    ))}
                  </div>
                  <Textarea
                    value={yamlContent}
                    onChange={(e) => handleYamlChange(e.target.value)}
                    className="min-h-[350px] resize-none rounded-lg border bg-muted/30 pl-14 font-mono text-sm leading-6"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3" />
                  Direct YAML editing - changes will override step editor modifications
                </p>
              </TabsContent>
            </Tabs>
          )}

          {!isEditing && (
            <>
              {/* Steps */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Playbook Steps ({currentPlaybook.steps.length})
                </h4>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-2 stagger-children">
                    {currentPlaybook.steps.map((step, index) => (
                      <PlaybookStepCard
                        key={step.id}
                        step={step}
                        index={index}
                        isLast={index === currentPlaybook.steps.length - 1}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between border-t pt-4">
            {isEditing ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {hasChanges && (
                    <span className="flex items-center gap-1 text-warning">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-warning" />
                      Unsaved changes
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                    {isSaving ? (
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div />
                <div className="flex items-center gap-3">
                  {canApprove && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setShowDeclineDialog(true)}
                        disabled={isLoading}
                        className="transition-all hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                      <Button 
                        onClick={onApprove} 
                        disabled={isLoading}
                        className="transition-all hover:scale-105"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve Playbook
                      </Button>
                    </>
                  )}
                  {canExecute && (
                    <Button 
                      onClick={onExecute} 
                      disabled={isLoading}
                      className="bg-success text-success-foreground transition-all hover:scale-105 hover:bg-success/90"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Execute Playbook
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Decline Playbook</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this playbook. The investigation
              will require manual review.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason for declining..."
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeclineDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!declineReason.trim()}
            >
              Decline Playbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

function PlaybookStepCard({
  step,
  index,
  isLast,
}: {
  step: PlaybookStep;
  index: number;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = stepIcons[step.status] || Clock;

  return (
    <div className="relative animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-12 h-[calc(100%-24px)] w-px bg-border" />
      )}

      <div
        className={cn(
          "rounded-lg border bg-card p-4 transition-all duration-300 hover-lift",
          step.status === "running" && "border-primary/50 bg-primary/5 glow-primary",
          step.status === "failed" && "border-destructive/50 bg-destructive/5",
          step.status === "completed" && "border-success/50 bg-success/5"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 hover:scale-110",
              step.status === "pending" && "bg-muted text-muted-foreground",
              step.status === "running" && "bg-primary/10 text-primary",
              step.status === "completed" && "bg-success/10 text-success",
              step.status === "failed" && "bg-destructive/10 text-destructive",
              step.status === "skipped" && "bg-muted text-muted-foreground"
            )}
          >
            {step.status === "running" ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Icon className="h-5 w-5" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                Step {index + 1}: {step.action}
              </p>
              <StatusBadge status={step.status} />
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>

            {step.output && (
              <div className="mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground transition-colors hover:text-primary"
                  onClick={() => setExpanded(!expanded)}
                >
                  <Terminal className="mr-1 h-3 w-3" />
                  {expanded ? "Hide Output" : "Show Output"}
                </Button>
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                      {step.output}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableStepCard({
  step,
  index,
  isLast,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  step: PlaybookStep;
  index: number;
  isLast: boolean;
  onChange: (field: keyof PlaybookStep, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="group relative animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-14 h-[calc(100%-32px)] w-px bg-border" />
      )}

      <div className="rounded-lg border bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md">
        <div className="flex items-start gap-3">
          {/* Drag Handle & Order Controls */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <span className="font-mono text-sm font-semibold">{index + 1}</span>
            </div>
            <div className="flex flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveUp}
                disabled={!canMoveUp}
              >
                <ChevronRight className="h-3 w-3 -rotate-90" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={onMoveDown}
                disabled={!canMoveDown}
              >
                <ChevronRight className="h-3 w-3 rotate-90" />
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <Input
              value={step.action}
              onChange={(e) => onChange("action", e.target.value)}
              placeholder="Action name"
              className="h-9 font-medium"
            />
            <Textarea
              value={step.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Describe this step"
              rows={2}
              className="min-h-[60px] resize-none text-sm"
            />
          </div>

          {/* Delete Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
