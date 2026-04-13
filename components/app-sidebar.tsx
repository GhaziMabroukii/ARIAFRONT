"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  FileWarning,
  Search,
  Archive,
  Activity,
  Server,
  Workflow,
  Bot,
  Shield,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWebSocket } from "@/lib/websocket";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Incidents", href: "/incidents", icon: FileWarning },
  { name: "Investigations", href: "/investigations", icon: Search },
  { name: "Archives", href: "/archives", icon: Archive },
  { name: "Metrics", href: "/metrics", icon: Activity },
  { name: "Monitoring", href: "/monitoring", icon: Server },
  { name: "Pipeline", href: "/pipeline", icon: Workflow },
  { name: "AI Assistant", href: "/assistant", icon: Bot },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isConnected } = useWebSocket();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "group/sidebar relative flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-out",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Subtle gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sidebar-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover/sidebar:opacity-100" />

        {/* Logo */}
        <div className="relative flex h-16 items-center justify-between border-b border-sidebar-border px-3">
          <Link href="/" className="flex items-center gap-3 transition-transform duration-300 hover:scale-[1.02]">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40">
              <Shield className="h-5 w-5 text-primary-foreground" />
              <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success animate-pulse" />
            </div>
            <div
              className={cn(
                "flex flex-col transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              <span className="whitespace-nowrap text-lg font-bold tracking-tight text-sidebar-foreground">
                ARIA
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap text-[10px] text-sidebar-foreground/50">
                <Sparkles className="h-2.5 w-2.5" />
                by Huawei
              </span>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 text-sidebar-foreground/70 transition-all duration-300 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "rotate-180"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2 scrollbar-thin">
          {navigation.map((item, index) => {
            const isActive = pathname === item.href;
            const isHovered = hoveredItem === item.name;

            const NavItem = (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  animationDelay: `${index * 30}ms`,
                }}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-300" />
                )}

                {/* Hover glow effect */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-xl bg-gradient-to-r from-sidebar-primary/10 to-transparent opacity-0 transition-opacity duration-300",
                    isHovered && !isActive && "opacity-100"
                  )}
                />

                <div
                  className={cn(
                    "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] transition-transform duration-200",
                      (isActive || isHovered) && "scale-110"
                    )}
                  />
                </div>

                <span
                  className={cn(
                    "relative whitespace-nowrap transition-all duration-300",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                >
                  {item.name}

                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-0 h-0.5 w-full rounded-full bg-sidebar-primary/50" />
                  )}
                </span>

                {/* Notification badge for specific items */}
                {item.name === "Investigations" && !collapsed && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-warning/20 px-1.5 text-[10px] font-semibold text-warning">
                    3
                  </span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return NavItem;
          })}
        </nav>

        {/* Footer */}
        <div className="relative border-t border-sidebar-border p-2">
          {/* Connection Status */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
              collapsed && "justify-center"
            )}
          >
            <div className="relative">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors duration-300",
                  isConnected ? "bg-success" : "bg-destructive"
                )}
              />
              {isConnected && (
                <>
                  <div className="absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full bg-success opacity-75" />
                  <div className="absolute inset-0 h-2.5 w-2.5 animate-pulse rounded-full bg-success" />
                </>
              )}
            </div>
            <span
              className={cn(
                "text-sm text-sidebar-foreground/60 transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              )}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* Theme Toggle */}
          {mounted && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 rounded-xl text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                    {theme === "dark" ? (
                      <Moon className="h-[18px] w-[18px] transition-transform duration-300 hover:rotate-12" />
                    ) : theme === "light" ? (
                      <Sun className="h-[18px] w-[18px] transition-transform duration-300 hover:rotate-45" />
                    ) : (
                      <Monitor className="h-[18px] w-[18px]" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "capitalize transition-all duration-300",
                      collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                    )}
                  >
                    {theme} Theme
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={collapsed ? "center" : "end"} side="top" className="w-40">
                <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
                  <Monitor className="h-4 w-4" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* License */}
          <div
            className={cn(
              "mt-2 overflow-hidden px-3 py-2 transition-all duration-300",
              collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
            )}
          >
            <p className="text-[10px] leading-tight text-sidebar-foreground/40">
              Licensed to Ghazi Mabrouki
            </p>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
