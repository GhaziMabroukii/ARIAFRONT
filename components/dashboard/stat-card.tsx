"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/animated-counter";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { type CSSProperties } from "react";

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "critical" | "warning" | "success";
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  className,
  style,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300 hover-lift cursor-pointer",
        variant === "critical" && "border-destructive/30 hover:border-destructive/50",
        variant === "warning" && "border-warning/30 hover:border-warning/50",
        variant === "success" && "border-success/30 hover:border-success/50",
        variant === "default" && "hover:border-primary/30",
        className
      )}
      style={style}
      onClick={onClick}
    >
      {/* Animated background gradient */}
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          variant === "default" && "bg-gradient-to-br from-primary/5 via-primary/3 to-transparent",
          variant === "critical" && "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent",
          variant === "warning" && "bg-gradient-to-br from-warning/10 via-warning/5 to-transparent",
          variant === "success" && "bg-gradient-to-br from-success/10 via-success/5 to-transparent"
        )}
      />

      {/* Scanline effect for critical */}
      {variant === "critical" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
          <div className="animate-scan-line absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-destructive to-transparent" />
        </div>
      )}
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-foreground/80">
              {title}
            </p>
            <div className="flex items-baseline gap-3">
              <AnimatedCounter
                value={value}
                className="text-3xl font-bold tracking-tight"
                duration={800}
              />
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-transform duration-200 group-hover:scale-105",
                    trend.isPositive
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {trend.isPositive ? "+" : ""}
                  {trend.value}%
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground/80">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
              variant === "default" && "bg-primary/10 text-primary group-hover:bg-primary/15",
              variant === "critical" && "bg-destructive/10 text-destructive group-hover:bg-destructive/15",
              variant === "warning" && "bg-warning/10 text-warning group-hover:bg-warning/15",
              variant === "success" && "bg-success/10 text-success group-hover:bg-success/15"
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      
      {/* Bottom accent line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full",
          variant === "default" && "bg-gradient-to-r from-transparent via-primary to-transparent",
          variant === "critical" && "bg-gradient-to-r from-transparent via-destructive to-transparent",
          variant === "warning" && "bg-gradient-to-r from-transparent via-warning to-transparent",
          variant === "success" && "bg-gradient-to-r from-transparent via-success to-transparent"
        )}
      />

      {/* Corner glow for critical alerts */}
      {variant === "critical" && value > 0 && (
        <div className="absolute -right-2 -top-2 h-8 w-8 animate-pulse rounded-full bg-destructive/20 blur-xl" />
      )}
    </Card>
  );
}

// Skeleton loader for stat card
export function StatCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-8 w-16" />
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="skeleton h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}
