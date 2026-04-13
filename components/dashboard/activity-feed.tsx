"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, FileWarning, Search, Archive, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

const ACTIVITY_ICONS = {
  alert: AlertTriangle,
  incident: FileWarning,
  investigation: Search,
  archive: Archive,
};

const ACTIVITY_COLORS = {
  alert: "text-warning bg-warning/10 group-hover:bg-warning/15",
  incident: "text-destructive bg-destructive/10 group-hover:bg-destructive/15",
  investigation: "text-primary bg-primary/10 group-hover:bg-primary/15",
  archive: "text-success bg-success/10 group-hover:bg-success/15",
};

const ACTIVITY_LINKS = {
  alert: "/alerts",
  incident: "/incidents",
  investigation: "/investigations",
  archive: "/archives",
};

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card className="col-span-2 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[320px] pr-4">
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const Icon = ACTIVITY_ICONS[activity.type];
              const colorClass = ACTIVITY_COLORS[activity.type];
              const linkHref = ACTIVITY_LINKS[activity.type];

              return (
                <Link 
                  key={activity.id}
                  href={linkHref}
                  className="block"
                >
                  <div
                    className={cn(
                      "group relative flex items-start gap-4 rounded-xl border border-transparent bg-card/50 p-3.5 transition-all duration-200 hover:border-border hover:bg-accent/50 hover:shadow-sm animate-slide-up"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Hover indicator */}
                    <div className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-r-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        colorClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <p className="text-sm leading-tight line-clamp-2 group-hover:text-foreground transition-colors">
                        {activity.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
