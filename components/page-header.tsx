"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  onRefresh,
  isLoading,
  actions,
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="animate-fade-in">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
          {actions}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className="transition-all duration-200 hover:bg-primary/5 hover:border-primary/30"
            >
              <RefreshCw 
                className={cn(
                  "h-4 w-4 transition-transform", 
                  isLoading && "animate-spin"
                )} 
              />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
