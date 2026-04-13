"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showPulse?: boolean;
}

const statusConfig: Record<string, { label: string; className: string; dot?: string; glow?: string }> = {
  // Incident statuses
  open: {
    label: "Open",
    className: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/15",
    dot: "bg-warning",
    glow: "shadow-warning/20",
  },
  investigating: {
    label: "Investigating",
    className: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15",
    dot: "bg-primary animate-pulse",
    glow: "shadow-primary/20",
  },
  resolved: {
    label: "Resolved",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    dot: "bg-success",
    glow: "shadow-success/20",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-muted-foreground",
  },
  // Investigation statuses
  pending: {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-muted-foreground",
  },
  running: {
    label: "Running",
    className: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15",
    dot: "bg-primary",
    glow: "shadow-primary/20",
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    className: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/15",
    dot: "bg-warning",
    glow: "shadow-warning/20",
  },
  completed: {
    label: "Completed",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    dot: "bg-success",
    glow: "shadow-success/20",
  },
  archived: {
    label: "Archived",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-muted-foreground",
  },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
    dot: "bg-destructive",
    glow: "shadow-destructive/20",
  },
  // Service statuses
  healthy: {
    label: "Healthy",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    dot: "bg-success",
    glow: "shadow-success/20",
  },
  degraded: {
    label: "Degraded",
    className: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/15",
    dot: "bg-warning",
    glow: "shadow-warning/20",
  },
  down: {
    label: "Down",
    className: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
    dot: "bg-destructive animate-pulse",
    glow: "shadow-destructive/20",
  },
  // Playbook statuses
  approved: {
    label: "Approved",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    dot: "bg-success",
    glow: "shadow-success/20",
  },
  declined: {
    label: "Declined",
    className: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
    dot: "bg-destructive",
    glow: "shadow-destructive/20",
  },
  executed: {
    label: "Executed",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    dot: "bg-success",
    glow: "shadow-success/20",
  },
  skipped: {
    label: "Skipped",
    className: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
    dot: "bg-muted-foreground",
  },
};

export function StatusBadge({ status, className, showPulse }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  };

  const shouldPulse = showPulse || 
    ["running", "awaiting_approval", "investigating", "down"].includes(status.toLowerCase());

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200",
        config.className,
        config.glow && "hover:shadow-md",
        config.glow,
        className
      )}
    >
      {config.dot && (
        <span className="relative flex h-2 w-2">
          {shouldPulse && (
            <span 
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                config.dot
              )} 
            />
          )}
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", config.dot)} />
        </span>
      )}
      {config.label}
    </span>
  );
}
