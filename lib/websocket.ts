"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

export type WSEventType =
  // Investigation events
  | "investigation_created"
  | "investigation_update"
  | "ai_started"
  | "ai_completed"
  | "auto_approved"
  | "investigation_updated"
  // Alert events
  | "alert_created"
  | "alert_update"
  // Incident events
  | "incident_created"
  | "incident_update"
  // Performance events
  | "performance_alert"
  | "metric_update"
  // System events
  | "system_health"
  | "service_status";

export interface WSMessage {
  type: WSEventType;
  data: unknown;
  timestamp: string;
}

interface WSOptions {
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

type WSChannel = "investigations" | "performance" | "system" | "all";

class WebSocketManager {
  private connections: Map<WSChannel, WebSocket | null> = new Map();
  private listeners: Map<WSEventType, Set<(message: WSMessage) => void>> = new Map();
  private reconnectAttempts: Map<WSChannel, number> = new Map();
  private reconnectTimeouts: Map<WSChannel, NodeJS.Timeout | null> = new Map();
  private options: WSOptions;
  private isConnecting: Map<WSChannel, boolean> = new Map();

  constructor(options: WSOptions = {}) {
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...options,
    };
  }

  connect(channel: WSChannel = "all"): void {
    if (typeof window === "undefined") return;
    if (this.isConnecting.get(channel)) return;
    
    const existingConnection = this.connections.get(channel);
    if (existingConnection?.readyState === WebSocket.OPEN) return;

    this.isConnecting.set(channel, true);
    
    const wsUrl = channel === "all" 
      ? `${WS_BASE}/ws`
      : `${WS_BASE}/ws/${channel}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${channel} channel`);
        this.reconnectAttempts.set(channel, 0);
        this.isConnecting.set(channel, false);
        this.options.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          this.notifyListeners(message);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from ${channel} channel`, event.code);
        this.isConnecting.set(channel, false);
        this.options.onClose?.();
        this.scheduleReconnect(channel);
      };

      ws.onerror = (error) => {
        console.error(`[WebSocket] Error on ${channel} channel:`, error);
        this.isConnecting.set(channel, false);
        this.options.onError?.(error);
      };

      this.connections.set(channel, ws);
    } catch (error) {
      console.error(`[WebSocket] Failed to connect to ${channel}:`, error);
      this.isConnecting.set(channel, false);
      this.scheduleReconnect(channel);
    }
  }

  private scheduleReconnect(channel: WSChannel): void {
    const attempts = this.reconnectAttempts.get(channel) || 0;
    const maxAttempts = this.options.maxReconnectAttempts || 10;

    if (attempts >= maxAttempts) {
      console.log(`[WebSocket] Max reconnect attempts reached for ${channel}`);
      return;
    }

    const existingTimeout = this.reconnectTimeouts.get(channel);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const delay = Math.min(
      (this.options.reconnectInterval || 3000) * Math.pow(1.5, attempts),
      30000
    );

    console.log(`[WebSocket] Scheduling reconnect for ${channel} in ${delay}ms (attempt ${attempts + 1})`);

    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(channel, attempts + 1);
      this.connect(channel);
    }, delay);

    this.reconnectTimeouts.set(channel, timeout);
  }

  disconnect(channel?: WSChannel): void {
    if (channel) {
      const ws = this.connections.get(channel);
      if (ws) {
        ws.close();
        this.connections.delete(channel);
      }
      const timeout = this.reconnectTimeouts.get(channel);
      if (timeout) {
        clearTimeout(timeout);
        this.reconnectTimeouts.delete(channel);
      }
    } else {
      // Disconnect all
      this.connections.forEach((ws, ch) => {
        ws?.close();
        this.connections.delete(ch);
      });
      this.reconnectTimeouts.forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
      this.reconnectTimeouts.clear();
    }
  }

  subscribe(eventType: WSEventType, callback: (message: WSMessage) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  private notifyListeners(message: WSMessage): void {
    const callbacks = this.listeners.get(message.type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(message);
        } catch (error) {
          console.error("[WebSocket] Error in listener callback:", error);
        }
      });
    }
  }

  isConnected(channel: WSChannel = "all"): boolean {
    const ws = this.connections.get(channel);
    return ws?.readyState === WebSocket.OPEN;
  }

  send(channel: WSChannel, data: unknown): boolean {
    const ws = this.connections.get(channel);
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null;

export function getWSManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

// React hooks
export function useWebSocket(channel: WSChannel = "all"): {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
} {
  const [isConnected, setIsConnected] = useState(false);
  const managerRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    managerRef.current = getWSManager();
    
    // Connect to the channel
    managerRef.current.connect(channel);

    // Check connection status periodically
    const checkConnection = () => {
      setIsConnected(managerRef.current?.isConnected(channel) || false);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [channel]);

  const connect = useCallback(() => {
    managerRef.current?.connect(channel);
  }, [channel]);

  const disconnect = useCallback(() => {
    managerRef.current?.disconnect(channel);
  }, [channel]);

  return { isConnected, connect, disconnect };
}

export function useWSSubscription(
  eventType: WSEventType,
  callback: (message: WSMessage) => void,
  deps: unknown[] = []
): void {
  const callbackRef = useRef(callback);
  
  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const manager = getWSManager();
    
    // Ensure connection is established
    manager.connect("all");

    const unsubscribe = manager.subscribe(eventType, (message) => {
      callbackRef.current(message);
    });

    return () => {
      unsubscribe();
    };
  }, [eventType]);
}

// Hook to subscribe to multiple events
export function useWSMultiSubscription(
  eventTypes: WSEventType[],
  callback: (message: WSMessage) => void,
  deps: unknown[] = []
): void {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback, ...deps]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const manager = getWSManager();
    manager.connect("all");

    const unsubscribes = eventTypes.map((eventType) =>
      manager.subscribe(eventType, (message) => {
        callbackRef.current(message);
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [eventTypes.join(",")]);
}

export { WS_BASE };
