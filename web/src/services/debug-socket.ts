import { queryClient } from '../lib/query-client';
import { queryKeys } from '../hooks/api/query-keys';
import type { DebugEvent } from '../types';

export type DebugConnectionStatus = 'connected' | 'connecting' | 'disconnected';

class DebugSocketManager {
  private ws: WebSocket | null = null;
  private status: DebugConnectionStatus = 'disconnected';
  private listeners = new Set<(status: DebugConnectionStatus) => void>();
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isPaused = false;
  private shouldConnect = false;

  getStatus(): DebugConnectionStatus {
    return this.status;
  }

  setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  getPaused(): boolean {
    return this.isPaused;
  }

  subscribe(listener: (status: DebugConnectionStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setStatus(status: DebugConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  connect(): void {
    this.shouldConnect = true;

    // Prevent duplicate socket initialization (0: CONNECTING, 1: OPEN)
    if (
      this.ws &&
      (this.ws.readyState === 0 || this.ws.readyState === 1)
    ) {
      return;
    }

    this.cleanupSocket();
    this.setStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/debug/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.setStatus('connected');
        this.startPing();
      };

      ws.onmessage = (event) => {
        if (this.ws !== ws) return;
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'connected' || raw.type === 'pong') return;

          if (this.isPaused) return;

          const newEvent: DebugEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            type: raw.type,
            channel: raw.channel,
            event: raw.event,
            data: raw.data,
            socket_id: raw.socket_id,
            delivered_to: raw.delivered_to,
            is_presence: raw.is_presence,
            presence_user_id: raw.presence_user_id,
            timestamp: raw.timestamp || Date.now(),
          };

          // Update TanStack Query cache directly - single source of truth!
          queryClient.setQueryData<DebugEvent[]>(queryKeys.events.all, (prev = []) => [
            newEvent,
            ...prev.slice(0, 499),
          ]);

          // Invalidate stats so metrics and channel list are fresh
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        } catch (e) {
          console.error('Error parsing debug frame:', e);
        }
      };

      ws.onerror = () => {
        if (this.ws !== ws) return;
        this.setStatus('disconnected');
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.setStatus('disconnected');
        this.stopPing();
        if (this.shouldConnect) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.setStatus('disconnected');
      if (this.shouldConnect) {
        this.scheduleReconnect();
      }
    }
  }

  disconnect(): void {
    this.shouldConnect = false;
    this.cleanupSocket();
    this.setStatus('disconnected');
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldConnect) {
        this.connect();
      }
    }, 2500);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send('ping');
        } catch {}
      }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private cleanupSocket(): void {
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export const debugSocketManager = new DebugSocketManager();
