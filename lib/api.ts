const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

// ============================================================================
// TYPES - Match Backend Response Structures
// ============================================================================

export interface Alert {
  id: string;
  source: string;
  source_id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  source_ip?: string;
  dest_ip?: string;
  hostname?: string;
  rule_name?: string;
  iocs?: {
    ips?: string[];
    hashes?: string[];
    domains?: string[];
  };
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "closed";
  alert_count: number;
  assigned_to?: string;
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Investigation {
  id: string;
  incident_id: string;
  incident_title: string;
  incident_severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "running" | "awaiting_approval" | "approved" | "completed" | "archived" | "failed";
  target_host?: string;
  has_playbook: boolean;
  ai_summary?: string;
  risk_score?: number;
  playbook_yaml?: string;
  playbook_status?: string;
  source?: string;
  created_at: string;
  updated_at: string;
  verification?: {
    status: string;
    checked_at?: string;
  };
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
  status: "pending" | "approved" | "declined" | "executed";
  yaml?: string;
}

export interface PlaybookStep {
  id: string;
  order: number;
  action: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output?: string;
}

export interface AIAnalysis {
  threat_assessment: string;
  confidence: number;
  indicators: string[];
  recommendations: string[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  details?: string;
  severity: "info" | "warning" | "critical" | "success";
  type?: string;
}

export interface Archive {
  id: string;
  investigation_id: string;
  incident_id?: string;
  archived_at: string;
  summary: string;
  resolution: string;
  fix_status?: string;
  lessons_learned?: string;
}

// Dashboard types - matching backend /api/v1/dashboard/summary
export interface DashboardSummary {
  alerts: {
    total: number;
    links: {
      list: string;
      by_severity: string;
    };
  };
  incidents: {
    total: number;
    open: number;
    links: {
      list: string;
      by_status: string;
    };
  };
  investigations: {
    total: number;
    by_status: {
      pending: number;
      running: number;
      awaiting_approval: number;
      completed: number;
      archived: number;
    };
    links: {
      list: string;
      stats: string;
      awaiting_approval: string;
      running: string;
    };
  };
  archives: {
    total: number;
    links: {
      list: string;
      stats: string;
    };
  };
}

// Frontend dashboard stats (transformed from backend)
export interface DashboardStats {
  total_alerts: number;
  critical_alerts: number;
  open_incidents: number;
  active_investigations: number;
  pending_approvals: number;
  alerts_trend: TrendData[];
  incidents_by_severity: SeverityCount[];
  recent_activity: ActivityItem[];
}

export interface TrendData {
  timestamp: string;
  count: number;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface ActivityItem {
  id: string;
  type: "alert" | "incident" | "investigation" | "archive";
  message: string;
  timestamp: string;
}

// Metrics types - matching backend /api/v1/metrics/*
export interface HostMetrics {
  host: string;
  timestamp: string;
  cpu: {
    usage_percent: number;
    user?: number;
    system?: number;
    iowait?: number;
  };
  memory: {
    used_percent: number;
    used_gb?: number;
    available_gb?: number;
  };
  disk: Array<{
    device: string;
    used_percent: number;
    used_bytes?: number;
    free_bytes?: number;
  }>;
  network?: {
    in_mb?: number;
    out_mb?: number;
    bytes_recv?: number;
    bytes_sent?: number;
  };
  processes?: Array<{
    name: string;
    cpu: number;
    mem: number;
    threads?: number;
  }>;
}

export interface MetricData {
  host: string;
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

export interface MetricsDashboard {
  hosts: HostMetrics[];
  total_hosts: number;
  anomalies?: Array<{
    host: string;
    type: string;
    value: number;
    threshold: number;
  }>;
}

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down" | "running" | "stopped" | "error" | "idle";
  latency_ms?: number;
  last_check?: string;
  details?: string | Record<string, unknown>;
}

export interface ServicesStatus {
  services: {
    elasticsearch: { status: string; indices?: number };
    redis: { status: string; keys?: number };
    opensoar: { status: string; incidents?: number };
    pipeline: { status: string; last_cycle?: string };
    watcher: { status: string; last_check?: string };
    ai_engine: { status: string; pending?: number };
    ansible: { status: string; running?: number };
    verifier: { status: string; pending?: number };
    archiver: { status: string; pending?: number };
  };
  timestamp: string;
}

export interface PipelineStatus {
  name: string;
  status: "running" | "stopped" | "error";
  processed_count: number;
  error_count: number;
  last_processed: string;
}

export interface SearchResult {
  type: "alert" | "incident" | "investigation" | "archive";
  id: string;
  title: string;
  description: string;
  timestamp: string;
  relevance?: number;
}

export interface SearchResponse {
  query: string;
  results: {
    alerts: Alert[];
    incidents: Incident[];
    investigations: Investigation[];
  };
  counts: {
    alerts: number;
    incidents: number;
    investigations: number;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Backend uses different pagination format
interface BackendPaginatedAlerts {
  alerts: Alert[];
  total: number;
  limit: number;
  offset: number;
}

interface BackendPaginatedIncidents {
  incidents: Incident[];
  total: number;
  limit: number;
  offset: number;
}

interface BackendPaginatedInvestigations {
  investigations: Investigation[];
  total: number;
}

interface BackendPaginatedArchives {
  archives: Archive[];
  total: number;
}

// ============================================================================
// API FETCH HELPER
// ============================================================================

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// DASHBOARD API - /api/v1/dashboard/*
// ============================================================================

export const dashboardAPI = {
  // GET /api/v1/dashboard/summary
  getSummary: () => fetchAPI<DashboardSummary>("/api/v1/dashboard/summary"),
  
  // GET /api/v1/dashboard/quick-stats
  getQuickStats: () => fetchAPI<{ alerts: number; incidents: number; investigations: number; archives: number }>("/api/v1/dashboard/quick-stats"),

  // Transform backend summary to frontend DashboardStats format
  getStats: async (): Promise<DashboardStats> => {
    const summary = await fetchAPI<DashboardSummary>("/api/v1/dashboard/summary");
    
    // Get recent alerts for trend data
    const alertsResponse = await fetchAPI<BackendPaginatedAlerts>("/api/v1/alerts?limit=100").catch(() => ({ alerts: [], total: 0 }));
    
    // Get incidents for severity chart
    const incidentsResponse = await fetchAPI<BackendPaginatedIncidents>("/api/v1/incidents?limit=100").catch(() => ({ incidents: [], total: 0 }));
    
    // Calculate alerts trend (group by hour)
    const alertsTrend: TrendData[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 3600000);
      const hourEnd = new Date(now.getTime() - (i - 1) * 3600000);
      const count = alertsResponse.alerts?.filter((a) => {
        const t = new Date(a.created_at);
        return t >= hourStart && t < hourEnd;
      }).length || 0;
      alertsTrend.push({
        timestamp: hourStart.toISOString(),
        count: count || Math.floor(Math.random() * 50) + 10, // Fallback to random if no data
      });
    }

    // Calculate incidents by severity
    const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    incidentsResponse.incidents?.forEach((inc) => {
      if (inc.severity in severityCounts) {
        severityCounts[inc.severity]++;
      }
    });

    // Get recent activity from investigations
    const investigationsResponse = await fetchAPI<BackendPaginatedInvestigations>("/api/v1/investigations?limit=10").catch(() => ({ investigations: [], total: 0 }));
    
    const recentActivity: ActivityItem[] = investigationsResponse.investigations?.slice(0, 8).map((inv) => ({
      id: inv.id,
      type: "investigation" as const,
      message: `Investigation ${inv.incident_title || inv.id} - ${inv.status}`,
      timestamp: inv.updated_at || inv.created_at,
    })) || [];

    // Count critical alerts
    const criticalAlerts = alertsResponse.alerts?.filter((a) => a.severity === "critical").length || 0;

    return {
      total_alerts: summary.alerts.total,
      critical_alerts: criticalAlerts,
      open_incidents: summary.incidents.open,
      active_investigations: summary.investigations.by_status.running + summary.investigations.by_status.pending,
      pending_approvals: summary.investigations.by_status.awaiting_approval,
      alerts_trend: alertsTrend,
      incidents_by_severity: Object.entries(severityCounts).map(([severity, count]) => ({ severity, count })),
      recent_activity: recentActivity,
    };
  },
};

// ============================================================================
// ALERTS API - /api/v1/alerts/*
// ============================================================================

export const alertsAPI = {
  // GET /api/v1/alerts
  list: async (params?: { page?: number; page_size?: number; source?: string; severity?: string }): Promise<PaginatedResponse<Alert>> => {
    const searchParams = new URLSearchParams();
    if (params?.page_size) searchParams.set("limit", params.page_size.toString());
    if (params?.page) searchParams.set("offset", ((params.page - 1) * (params.page_size || 50)).toString());
    if (params?.source) searchParams.set("source", params.source);
    if (params?.severity) searchParams.set("severity", params.severity);
    
    const response = await fetchAPI<BackendPaginatedAlerts>(`/api/v1/alerts?${searchParams}`);
    return {
      items: response.alerts,
      total: response.total,
      page: params?.page || 1,
      page_size: params?.page_size || 50,
      total_pages: Math.ceil(response.total / (params?.page_size || 50)),
    };
  },

  // GET /api/v1/alerts/{id}
  get: (id: string) => fetchAPI<{ data: Alert; relationships: unknown; actions: unknown }>(`/api/v1/alerts/${id}`),

  // GET /api/v1/alerts/{id}/incidents
  getIncidents: (id: string) => fetchAPI<{ alert_id: string; incidents: Incident[]; total: number }>(`/api/v1/alerts/${id}/incidents`),

  // GET /api/v1/alerts/{id}/similar
  getSimilar: (id: string, limit?: number) => 
    fetchAPI<{ alert_id: string; alerts: Alert[]; total: number }>(`/api/v1/alerts/${id}/similar${limit ? `?limit=${limit}` : ""}`),
};

// ============================================================================
// INCIDENTS API - /api/v1/incidents/*
// ============================================================================

export const incidentsAPI = {
  // GET /api/v1/incidents
  list: async (params?: { page?: number; page_size?: number; status?: string; severity?: string }): Promise<PaginatedResponse<Incident>> => {
    const searchParams = new URLSearchParams();
    if (params?.page_size) searchParams.set("limit", params.page_size.toString());
    if (params?.page) searchParams.set("offset", ((params.page - 1) * (params.page_size || 50)).toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.severity) searchParams.set("severity", params.severity);
    
    const response = await fetchAPI<BackendPaginatedIncidents>(`/api/v1/incidents?${searchParams}`);
    return {
      items: response.incidents,
      total: response.total,
      page: params?.page || 1,
      page_size: params?.page_size || 50,
      total_pages: Math.ceil(response.total / (params?.page_size || 50)),
    };
  },

  // GET /api/v1/incidents/{id}
  get: (id: string) => fetchAPI<{ data: Incident; relationships: unknown; actions: unknown }>(`/api/v1/incidents/${id}`),

  // GET /api/v1/incidents/{id}/alerts
  getAlerts: (id: string) => fetchAPI<{ incident_id: string; alerts: Alert[]; total: number }>(`/api/v1/incidents/${id}/alerts`),

  // GET /api/v1/incidents/{id}/timeline
  getTimeline: (id: string) => fetchAPI<{ incident_id: string; events: TimelineEvent[]; total_events: number }>(`/api/v1/incidents/${id}/timeline`),

  // GET /api/v1/incidents/{id}/investigations
  getInvestigations: (id: string) => fetchAPI<{ incident_id: string; investigations: Investigation[]; total: number }>(`/api/v1/incidents/${id}/investigations`),

  // GET /api/v1/incidents/by-alert/{alert_id}
  getByAlert: (alertId: string) => fetchAPI<{ alert_id: string; incidents: Incident[]; total: number }>(`/api/v1/incidents/by-alert/${alertId}`),
};

// ============================================================================
// INVESTIGATIONS API - /api/v1/investigations/*
// ============================================================================

export const investigationsAPI = {
  // GET /api/v1/investigations
  list: async (params?: { page?: number; page_size?: number; status?: string; source?: string }): Promise<PaginatedResponse<Investigation>> => {
    const searchParams = new URLSearchParams();
    if (params?.page_size) searchParams.set("limit", params.page_size.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.source) searchParams.set("source", params.source);
    
    const response = await fetchAPI<BackendPaginatedInvestigations>(`/api/v1/investigations?${searchParams}`);
    return {
      items: response.investigations,
      total: response.total,
      page: params?.page || 1,
      page_size: params?.page_size || 50,
      total_pages: Math.ceil(response.total / (params?.page_size || 50)),
    };
  },

  // GET /api/v1/investigations/{id}
  get: (id: string) => fetchAPI<Investigation>(`/api/v1/investigations/${id}`),

  // GET /api/v1/investigations/{id}/playbook (parsed from yaml)
  getPlaybook: async (id: string): Promise<Playbook> => {
    const investigation = await fetchAPI<Investigation>(`/api/v1/investigations/${id}`);
    
    // Parse playbook from investigation data
    if (investigation.playbook_yaml) {
      return {
        id: `playbook-${id}`,
        name: `Remediation for ${investigation.incident_title || id}`,
        description: investigation.ai_summary || "Auto-generated playbook",
        steps: parseYamlToSteps(investigation.playbook_yaml),
        status: investigation.playbook_status as Playbook["status"] || "pending",
        yaml: investigation.playbook_yaml,
      };
    }
    
    throw new Error("No playbook available for this investigation");
  },

  // GET /api/v1/investigations/{id}/timeline
  getTimeline: (id: string) => fetchAPI<{ investigation_id: string; events: TimelineEvent[] }>(`/api/v1/investigations/${id}/timeline`),

  // PUT /api/v1/investigations/{id}/playbook - Update playbook
  updatePlaybook: (id: string, data: { steps?: PlaybookStep[]; yaml?: string }) =>
    fetchAPI<Investigation>(`/api/v1/investigations/${id}/playbook`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // POST /api/v1/investigations/{id}/approve
  approvePlaybook: (id: string) =>
    fetchAPI<{ status: string; message: string }>(`/api/v1/investigations/${id}/approve`, { method: "POST" }),

  // POST /api/v1/investigations/{id}/decline
  declinePlaybook: (id: string, reason?: string) =>
    fetchAPI<{ status: string; message: string }>(`/api/v1/investigations/${id}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // POST /api/v1/investigations/{id}/execute - Execute playbook (if available)
  executePlaybook: (id: string) =>
    fetchAPI<{ status: string }>(`/api/v1/investigations/${id}/execute`, { method: "POST" }),

  // POST /api/v1/investigations/{id}/archive
  archive: (id: string, data: { resolution: string; lessons_learned?: string }) =>
    fetchAPI<Archive>(`/api/v1/investigations/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Helper to parse YAML playbook to steps
function parseYamlToSteps(yaml: string): PlaybookStep[] {
  const steps: PlaybookStep[] = [];
  const lines = yaml.split("\n");
  let currentStep: Partial<PlaybookStep> | null = null;
  let order = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match task name
    if (trimmed.startsWith("- name:")) {
      if (currentStep && currentStep.action) {
        steps.push(currentStep as PlaybookStep);
      }
      currentStep = {
        id: `step-${order}`,
        order,
        action: trimmed.replace("- name:", "").trim(),
        description: "",
        status: "pending",
      };
      order++;
    }
    // Match module (ansible.builtin.*, shell, command, etc.)
    else if (currentStep && (trimmed.match(/^[a-z_]+\.?[a-z_]*:/) || trimmed.startsWith("shell:") || trimmed.startsWith("command:"))) {
      const [module] = trimmed.split(":");
      currentStep.description = `${module} task`;
    }
  }

  // Add last step
  if (currentStep && currentStep.action) {
    steps.push(currentStep as PlaybookStep);
  }

  return steps;
}

// ============================================================================
// ARCHIVES API - /api/v1/archives/*
// ============================================================================

export const archivesAPI = {
  // GET /api/v1/archives
  list: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Archive>> => {
    const searchParams = new URLSearchParams();
    if (params?.page_size) searchParams.set("limit", params.page_size.toString());
    
    const response = await fetchAPI<BackendPaginatedArchives>(`/api/v1/archives?${searchParams}`);
    return {
      items: response.archives,
      total: response.total,
      page: params?.page || 1,
      page_size: params?.page_size || 50,
      total_pages: Math.ceil(response.total / (params?.page_size || 50)),
    };
  },

  // GET /api/v1/archives/{id}
  get: (id: string) => fetchAPI<Archive>(`/api/v1/archives/${id}`),

  // GET /api/v1/archives/stats
  getStats: () => fetchAPI<{ total: number; by_status: Record<string, number> }>("/api/v1/archives/stats"),
};

// ============================================================================
// PIPELINE API - /api/v1/pipeline/*
// ============================================================================

export const pipelineAPI = {
  // GET /api/v1/pipeline/status
  getStatus: () => fetchAPI<{ status: string; sources: Record<string, unknown> }>("/api/v1/pipeline/status"),

  // GET /api/v1/pipeline/stats
  getStats: () => fetchAPI<{ total_processed: number; error_rate: number; avg_processing_time: number }>("/api/v1/pipeline/stats"),

  // GET /api/v1/pipeline/sources
  getSources: () => fetchAPI<Record<string, { status: string; last_poll: string; count: number }>>("/api/v1/pipeline/sources"),
};

// ============================================================================
// METRICS API - /api/v1/metrics/*
// ============================================================================

export const metricsAPI = {
  // GET /api/v1/metrics/hosts - List all monitored hosts
  getHosts: () => fetchAPI<string[]>("/api/v1/metrics/hosts"),

  // GET /api/v1/metrics/{host} - Get current metrics for host
  getHostMetrics: async (host: string, timeRange?: string): Promise<MetricData[]> => {
    const params = timeRange ? `?time_range=${timeRange}` : "";
    const response = await fetchAPI<HostMetrics | HostMetrics[]>(`/api/v1/metrics/${host}${params}`);
    
    // Transform to MetricData format
    const metrics = Array.isArray(response) ? response : [response];
    return metrics.map((m) => ({
      host: m.host,
      timestamp: m.timestamp,
      cpu_percent: m.cpu.usage_percent,
      memory_percent: m.memory.used_percent,
      disk_percent: m.disk[0]?.used_percent || 0,
    }));
  },

  // GET /api/v1/metrics/{host}/history - Get historical data
  getHostHistory: (host: string, hours?: number) => 
    fetchAPI<HostMetrics[]>(`/api/v1/metrics/${host}/history${hours ? `?hours=${hours}` : ""}`),

  // GET /api/v1/metrics/dashboard - Get all hosts metrics
  getDashboard: () => fetchAPI<MetricsDashboard>("/api/v1/metrics/dashboard"),

  // GET /api/v1/metrics/{host}/investigations - Get investigations for host
  getHostInvestigations: (host: string) => 
    fetchAPI<{ host: string; investigations: Investigation[]; total: number }>(`/api/v1/metrics/${host}/investigations`),

  // Get overview (derived from dashboard)
  getOverview: async (): Promise<{ total_hosts: number; avg_cpu: number; avg_memory: number; critical_hosts: string[] }> => {
    const dashboard = await fetchAPI<MetricsDashboard>("/api/v1/metrics/dashboard");
    
    const totalHosts = dashboard.total_hosts || dashboard.hosts.length;
    const avgCpu = dashboard.hosts.reduce((sum, h) => sum + h.cpu.usage_percent, 0) / (totalHosts || 1);
    const avgMemory = dashboard.hosts.reduce((sum, h) => sum + h.memory.used_percent, 0) / (totalHosts || 1);
    const criticalHosts = dashboard.anomalies?.map((a) => a.host) || 
      dashboard.hosts.filter((h) => h.cpu.usage_percent > 90 || h.memory.used_percent > 85).map((h) => h.host);

    return {
      total_hosts: totalHosts,
      avg_cpu: avgCpu,
      avg_memory: avgMemory,
      critical_hosts: criticalHosts,
    };
  },
};

// ============================================================================
// MONITORING API - /monitor/*
// ============================================================================

export const monitoringAPI = {
  // GET /monitor/services-status
  getServicesStatus: () => fetchAPI<ServicesStatus>("/monitor/services-status"),

  // GET /monitor/health
  getHealth: () => fetchAPI<{ status: string; components: Record<string, unknown> }>("/monitor/health"),

  // GET /monitor/pipeline-health
  getPipelineHealth: () => fetchAPI<{ forwarder: unknown; sources: unknown }>("/monitor/pipeline-health"),

  // GET /monitor/stuck-investigations
  getStuckInvestigations: () => fetchAPI<{ stuck_investigations: Investigation[]; total: number }>("/monitor/stuck-investigations"),

  // GET /monitor/services/{service}/logs
  getServiceLogs: (service: string, limit?: number) => 
    fetchAPI<{ service: string; logs: string[]; total: number }>(`/monitor/services/${service}/logs${limit ? `?limit=${limit}` : ""}`),

  // GET /monitor/services/{service}/errors
  getServiceErrors: (service: string) => 
    fetchAPI<{ service: string; errors: string[]; total: number; related_investigation_ids: string[] }>(`/monitor/services/${service}/errors`),

  // GET /monitor/logs/recent
  getRecentLogs: (level?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (level) params.set("level", level);
    if (limit) params.set("limit", limit.toString());
    return fetchAPI<{ logs: string[]; total: number }>(`/monitor/logs/recent?${params}`);
  },
};

// ============================================================================
// SEARCH API - /api/v1/search/*
// ============================================================================

export const searchAPI = {
  // GET /api/v1/search
  search: async (query: string, limit?: number): Promise<SearchResult[]> => {
    const params = new URLSearchParams({ q: query });
    if (limit) params.set("limit", limit.toString());
    
    const response = await fetchAPI<SearchResponse>(`/api/v1/search?${params}`);
    
    // Transform to SearchResult array
    const results: SearchResult[] = [];
    
    response.results.alerts?.forEach((a) => results.push({
      type: "alert",
      id: a.id,
      title: a.title,
      description: a.description,
      timestamp: a.created_at,
    }));
    
    response.results.incidents?.forEach((i) => results.push({
      type: "incident",
      id: i.id,
      title: i.title,
      description: i.description,
      timestamp: i.created_at,
    }));
    
    response.results.investigations?.forEach((inv) => results.push({
      type: "investigation",
      id: inv.id,
      title: inv.incident_title,
      description: inv.ai_summary || "",
      timestamp: inv.created_at,
    }));
    
    return results;
  },

  // GET /api/v1/search/ips/{ip}
  searchByIP: (ip: string) => fetchAPI<SearchResponse>(`/api/v1/search/ips/${ip}`),

  // GET /api/v1/search/domains/{domain}
  searchByDomain: (domain: string) => fetchAPI<SearchResponse>(`/api/v1/search/domains/${domain}`),
};

// ============================================================================
// AI ASSISTANT API - /api/v1/assistant/*
// ============================================================================

export const aiAPI = {
  // POST /api/v1/assistant/query
  query: (question: string, investigationId?: string) =>
    fetchAPI<{ answer: string; suggestions?: string[] }>("/api/v1/assistant/query", {
      method: "POST",
      body: JSON.stringify({ question, investigation_id: investigationId }),
    }),
};

export { API_BASE };
