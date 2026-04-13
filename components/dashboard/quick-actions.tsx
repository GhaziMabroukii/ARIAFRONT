"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  AlertTriangle,
  FileWarning,
  Clock,
  ArrowRight,
  Sparkles,
  Bot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  pendingApprovals: number;
  activeInvestigations: number;
}

export function QuickActions({ pendingApprovals, activeInvestigations }: QuickActionsProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {pendingApprovals > 0 && (
            <Link href="/investigations?status=awaiting_approval" className="block">
              <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-warning/30 bg-gradient-to-r from-warning/5 to-transparent p-3.5 transition-all duration-300 hover:border-warning/50 hover:shadow-md hover:shadow-warning/5">
                {/* Animated border */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-warning/10 via-transparent to-warning/10 opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 transition-transform duration-200 group-hover:scale-110">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pending Approvals</p>
                    <p className="text-xs text-muted-foreground">
                      Review playbooks awaiting approval
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className="border-warning/50 bg-warning/10 text-warning font-semibold animate-pulse"
                  >
                    {pendingApprovals}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-warning opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          )}

          {activeInvestigations > 0 && (
            <Link href="/investigations?status=running" className="block">
              <div className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent p-3.5 transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5">
                <div className="relative flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                    <Search className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Investigations</p>
                    <p className="text-xs text-muted-foreground">
                      Monitor ongoing investigations
                    </p>
                  </div>
                </div>
                <div className="relative flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary font-semibold">
                    {activeInvestigations}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-primary opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button 
              variant="outline" 
              className="group h-auto flex-col gap-2 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5" 
              asChild
            >
              <Link href="/alerts">
                <AlertTriangle className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="text-xs">View Alerts</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              className="group h-auto flex-col gap-2 py-4 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5" 
              asChild
            >
              <Link href="/incidents">
                <FileWarning className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                <span className="text-xs">View Incidents</span>
              </Link>
            </Button>
          </div>

          <Button 
            className="group w-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-300 hover:from-primary/90 hover:to-primary/70 hover:shadow-lg hover:shadow-primary/25" 
            asChild
          >
            <Link href="/assistant" className="flex items-center justify-center gap-2">
              <Bot className="h-4 w-4" />
              Ask AI Assistant
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
