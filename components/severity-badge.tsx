"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

interface SeverityBadgeProps {
  severity: string | number;
  className?: string;
  showIcon?: boolean;
}

const severityConfig: Record<string, { 
  label: string; 
  className: string; 
  icon: typeof AlertTriangle;
  glow?: string;
}> = {
  critical: {
    label: "Critical",
    className: "bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15",
    icon: AlertTriangle,
    glow: "shadow-destructive/20",
  },
  high: {
    label: "High",
    className: "bg-chart-4/10 text-chart-4 border-chart-4/30 hover:bg-chart-4/15",
    icon: AlertCircle,
    glow: "shadow-chart-4/20",
  },
  medium: {
    label: "Medium",
    className: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/15",
    icon: Info,
    glow: "shadow-warning/20",
  },
  low: {
    label: "Low",
    className: "bg-success/10 text-success border-success/30 hover:bg-success/15",
    icon: CheckCircle,
    glow: "shadow-success/20",
  },
};

// Map numeric levels (from Wazuh/alerts) to severity
function getLevelSeverity(level: number): string {
  if (level >= 12) return "critical";
  if (level >= 8) return "high";
  if (level >= 4) return "medium";
  return "low";
}

export function SeverityBadge({ severity, className, showIcon = true }: SeverityBadgeProps) {
  const severityKey = typeof severity === "number" 
    ? getLevelSeverity(severity) 
    : severity.toLowerCase();
  
  const config = severityConfig[severityKey] || severityConfig.low;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:shadow-md",
        config.className,
        config.glow,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}
