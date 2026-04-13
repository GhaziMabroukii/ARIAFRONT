const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface Alert {
  id: string;
  alert_id: string;
  timestamp: string;
  rule_level: number;
  rule_description: string;
  agent_name: string;
  agent_ip: string;
  source: string;
  incident_id?: string;
  investigation_id?: string;
}

export interface Incident {
  id: string;
  incident_id: string;
  created_at: string;
  updated_at: string;
  status: "open" | "investigating" | "resolved" | "closed";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  alert_count: number;
  investigation_id?: string;
}

export interface Investigation {
  id: string;
  investigation_id: string;
  created_at: string;
  updated_at: string;
  status: "pending" | "running" | "awaiting_approval" | "completed" | "archived" | "failed";
  incident_id: string;
  summary?: string;
  playbook?: Playbook;
  ai_analysis?: AIAnalysis;
}

export interface Playbook {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
  status: "pending" | "approved" | "declined" | "executed";
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
  severity: "info" | "warning" | "critical";
}

export interface Archive {
  id: string;
  archive_id: string;
  investigation_id: string;
  archived_at: string;
  summary: string;
  resolution: string;
  lessons_learned?: string;
}

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

export interface MetricData {
  host: string;
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  latency_ms: number;
  last_check: string;
  details?: string;
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
  relevance: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

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

// Dashboard
export const dashboardAPI = {
  getStats: () => fetchAPI<DashboardStats>("/api/dashboard/stats"),
  getSummary: () => fetchAPI<{ summary: string }>("/api/dashboard/summary"),
};

// Alerts
export const alertsAPI = {
  list: (params?: { page?: number; page_size?: number; source?: string; level?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    if (params?.source) searchParams.set("source", params.source);
    if (params?.level) searchParams.set("level", params.level.toString());
    return fetchAPI<PaginatedResponse<Alert>>(`/api/alerts?${searchParams}`);
  },
  get: (id: string) => fetchAPI<Alert>(`/api/alerts/${id}`),
  getRelationships: (id: string) =>
    fetchAPI<{ incident?: Incident; investigation?: Investigation }>(`/api/alerts/${id}/relationships`),
};

// Incidents
export const incidentsAPI = {
  list: (params?: { page?: number; page_size?: number; status?: string; severity?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.severity) searchParams.set("severity", params.severity);
    return fetchAPI<PaginatedResponse<Incident>>(`/api/incidents?${searchParams}`);
  },
  get: (id: string) => fetchAPI<Incident>(`/api/incidents/${id}`),
  getAlerts: (id: string) => fetchAPI<Alert[]>(`/api/incidents/${id}/alerts`),
  getTimeline: (id: string) => fetchAPI<TimelineEvent[]>(`/api/incidents/${id}/timeline`),
};

// Investigations
export const investigationsAPI = {
  list: (params?: { page?: number; page_size?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    if (params?.status) searchParams.set("status", params.status);
    return fetchAPI<PaginatedResponse<Investigation>>(`/api/investigations?${searchParams}`);
  },
  get: (id: string) => fetchAPI<Investigation>(`/api/investigations/${id}`),
  getPlaybook: (id: string) => fetchAPI<Playbook>(`/api/investigations/${id}/playbook`),
  approvePlaybook: (id: string) =>
    fetchAPI<{ status: string }>(`/api/investigations/${id}/playbook/approve`, { method: "POST" }),
  declinePlaybook: (id: string, reason: string) =>
    fetchAPI<{ status: string }>(`/api/investigations/${id}/playbook/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  executePlaybook: (id: string) =>
    fetchAPI<{ status: string }>(`/api/investigations/${id}/playbook/execute`, { method: "POST" }),
  archive: (id: string, data: { resolution: string; lessons_learned?: string }) =>
    fetchAPI<Archive>(`/api/investigations/${id}/archive`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Archives
export const archivesAPI = {
  list: (params?: { page?: number; page_size?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    return fetchAPI<PaginatedResponse<Archive>>(`/api/archives?${searchParams}`);
  },
  get: (id: string) => fetchAPI<Archive>(`/api/archives/${id}`),
  getFullContext: (id: string) =>
    fetchAPI<{ archive: Archive; investigation: Investigation; incident: Incident; alerts: Alert[] }>(
      `/api/archives/${id}/context`
    ),
};

// Pipeline
export const pipelineAPI = {
  getStatus: () => fetchAPI<PipelineStatus[]>("/api/pipeline/status"),
  getStats: () =>
    fetchAPI<{ total_processed: number; error_rate: number; avg_processing_time: number }>("/api/pipeline/stats"),
};

// Metrics
export const metricsAPI = {
  getHosts: () => fetchAPI<string[]>("/api/metrics/hosts"),
  getHostMetrics: (host: string, timeRange?: string) => {
    const params = timeRange ? `?time_range=${timeRange}` : "";
    return fetchAPI<MetricData[]>(`/api/metrics/hosts/${host}${params}`);
  },
  getOverview: () =>
    fetchAPI<{ total_hosts: number; avg_cpu: number; avg_memory: number; critical_hosts: string[] }>(
      "/api/metrics/overview"
    ),
};

// Monitoring
export const monitoringAPI = {
  getHealth: () => fetchAPI<ServiceHealth[]>("/api/monitoring/health"),
  getService: (name: string) => fetchAPI<ServiceHealth>(`/api/monitoring/services/${name}`),
};

// Search
export const searchAPI = {
  search: (query: string, types?: string[]) => {
    const params = new URLSearchParams({ q: query });
    if (types?.length) params.set("types", types.join(","));
    return fetchAPI<SearchResult[]>(`/api/search?${params}`);
  },
};

// AI Assistant
export const aiAPI = {
  query: (message: string, context?: { investigation_id?: string; incident_id?: string }) =>
    fetchAPI<{ response: string; suggestions?: string[] }>("/api/ai/query", {
      method: "POST",
      body: JSON.stringify({ message, context }),
    }),
};

export { API_BASE };
