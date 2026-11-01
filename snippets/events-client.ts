/**
 * Edgekit Events Client (Browser & React Zero-Dependency Snippet)
 * 
 * Copy this file directly into your frontend project (e.g., `lib/events-client.ts` or `hooks/use-events.ts`).
 * Zero external NPM dependencies! Uses browser-native WebSocket and EventSource (SSE).
 * Works with React, Vue, Svelte, Next.js (Client Components), and Vanilla JS.
 */

export type TransportType = "ws" | "sse";

export interface ClientConfig {
  /**
   * Host of your Edgekit Events Worker (without protocol)
   * Example: "realtime.yourdomain.com" or "localhost:8787"
   */
  host: string;

  /**
   * Public App Key
   */
  appKey: string;

  /**
   * Transport mode: "ws" (WebSocket, full duplex) or "sse" (Server-Sent Events, ultra-light)
   * Defaults to "ws".
   */
  transport?: TransportType;

  /**
   * Use WSS/HTTPS (defaults to true for non-localhost)
   */
  useTls?: boolean;

  /**
   * Custom port (optional)
   */
  port?: number;

  /**
   * Custom endpoint for private/presence channel authorization (e.g. `/api/broadcasting/auth`)
   */
  authEndpoint?: string;

  /**
   * Headers to pass to the authEndpoint (e.g. CSRF token or Bearer token)
   */
  authHeaders?: Record<string, string>;
}

export type EventCallback = (data: any) => void;

export interface ChannelSubscription {
  name: string;
  bind: (event: string, callback: EventCallback) => () => void;
  unbind: (event: string, callback?: EventCallback) => void;
  trigger?: (event: string, data: any) => void;
}

/**
 * Creates an Edgekit Events browser client instance.
 */
export function createEdgekitClient(config: ClientConfig) {
  const host = config.host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const useTls = config.useTls ?? !isLocal;
  const portSuffix = config.port ? `:${config.port}` : "";
  const transport = config.transport || "ws";

  const listeners = new Map<string, Map<string, Set<EventCallback>>>();
  const activeChannels = new Set<string>();

  let socket: WebSocket | null = null;
  let eventSource: EventSource | null = null;
  let socketId: string | null = null;
  let isConnected = false;
  let reconnectTimer: any = null;

  function getChannelListeners(channel: string): Map<string, Set<EventCallback>> {
    let map = listeners.get(channel);
    if (!map) {
      map = new Map();
      listeners.set(channel, map);
    }
    return map;
  }

  function emitEvent(channel: string, event: string, data: any) {
    const channelMap = listeners.get(channel);
    if (!channelMap) return;

    const callbacks = channelMap.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EdgekitClient] Error in callback for ${channel}:${event}:`, err);
        }
      }
    }
  }

  // --- Transports ---

  function connectWs() {
    if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
      return;
    }

    const wsProto = useTls ? "wss" : "ws";
    const url = `${wsProto}://${host}${portSuffix}/app/${config.appKey}`;

    socket = new WebSocket(url);

    socket.onopen = () => {
      isConnected = true;
    };

    socket.onmessage = async (evt) => {
      let message: any;
      try {
        message = JSON.parse(evt.data);
      } catch {
        return;
      }

      const { event, channel, data } = message;

      if (event === "pusher:connection_established") {
        const connData = typeof data === "string" ? JSON.parse(data) : data;
        socketId = connData.socket_id;
        // Re-subscribe all active channels
        for (const ch of activeChannels) {
          await subscribeChannelWs(ch);
        }
        return;
      }

      if (event === "pusher:ping") {
        socket?.send(JSON.stringify({ event: "pusher:pong", data: {} }));
        return;
      }

      if (channel && event) {
        let parsedData = data;
        if (typeof data === "string") {
          try {
            parsedData = JSON.parse(data);
          } catch {}
        }
        emitEvent(channel, event, parsedData);
      }
    };

    socket.onclose = () => {
      isConnected = false;
      socketId = null;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectWs, 3000);
    };

    socket.onerror = () => {
      try {
        socket?.close();
      } catch {}
    };
  }

  async function subscribeChannelWs(channel: string) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    const payload: { channel: string; auth?: string; channel_data?: string } = { channel };

    // Se for canal privado ou presença, autenticar via authEndpoint
    if (channel.startsWith("private-") || channel.startsWith("presence-")) {
      if (config.authEndpoint && socketId) {
        try {
          const authRes = await fetch(config.authEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...config.authHeaders,
            },
            body: JSON.stringify({ socket_id: socketId, channel_name: channel }),
          });
          const authData = await authRes.json();
          payload.auth = authData.auth;
          payload.channel_data = authData.channel_data;
        } catch (e) {
          console.error(`[EdgekitClient] Auth failed for ${channel}:`, e);
          return;
        }
      }
    }

    socket.send(
      JSON.stringify({
        event: "pusher:subscribe",
        data: payload,
      })
    );
  }

  function connectSse() {
    if (activeChannels.size === 0) return;
    if (eventSource) {
      eventSource.close();
    }

    const httpProto = useTls ? "https" : "http";
    const channelList = Array.from(activeChannels).join(",");
    const url = `${httpProto}://${host}${portSuffix}/events/stream?channel=${encodeURIComponent(
      channelList
    )}&key=${encodeURIComponent(config.appKey)}`;

    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      isConnected = true;
    };

    eventSource.onmessage = (evt) => {
      let parsed = evt.data;
      try {
        parsed = JSON.parse(evt.data);
      } catch {}
      // Broadcast genérico
      for (const ch of activeChannels) {
        emitEvent(ch, "message", parsed);
      }
    };

    // Escuta eventos tipados pelo nome
    for (const ch of activeChannels) {
      const channelMap = listeners.get(ch);
      if (channelMap) {
        for (const eventName of channelMap.keys()) {
          eventSource.addEventListener(eventName, (evt: any) => {
            let parsed = evt.data;
            try {
              parsed = JSON.parse(evt.data);
            } catch {}
            emitEvent(ch, eventName, parsed);
          });
        }
      }
    }

    eventSource.onerror = () => {
      isConnected = false;
      eventSource?.close();
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connectSse, 3000);
    };
  }

  // Inicializa o transporte escolhido
  if (transport === "ws") {
    connectWs();
  }

  return {
    /**
     * Subscribe to a channel and obtain a handle to bind callbacks.
     */
    subscribe(channelName: string): ChannelSubscription {
      activeChannels.add(channelName);

      if (transport === "ws") {
        if (isConnected && socketId) {
          subscribeChannelWs(channelName).catch(() => {});
        }
      } else {
        connectSse();
      }

      return {
        name: channelName,
        bind(event: string, callback: EventCallback) {
          const channelMap = getChannelListeners(channelName);
          let set = channelMap.get(event);
          if (!set) {
            set = new Set();
            channelMap.set(event, set);
          }
          set.add(callback);

          if (transport === "sse" && eventSource) {
            eventSource.addEventListener(event, (evt: any) => {
              let parsed = evt.data;
              try {
                parsed = JSON.parse(evt.data);
              } catch {}
              callback(parsed);
            });
          }

          // Unbind callback
          return () => {
            set?.delete(callback);
          };
        },
        unbind(event: string, callback?: EventCallback) {
          const channelMap = getChannelListeners(channelName);
          if (!callback) {
            channelMap.delete(event);
          } else {
            channelMap.get(event)?.delete(callback);
          }
        },
        trigger(event: string, data: any) {
          if (transport === "ws" && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({
                event: event.startsWith("client-") ? event : `client-${event}`,
                channel: channelName,
                data,
              })
            );
          }
        },
      };
    },

    /**
     * Unsubscribe from a channel.
     */
    unsubscribe(channelName: string) {
      activeChannels.delete(channelName);
      listeners.delete(channelName);

      if (transport === "ws" && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            event: "pusher:unsubscribe",
            data: { channel: channelName },
          })
        );
      } else if (transport === "sse") {
        connectSse();
      }
    },

    /**
     * Disconnects the socket / EventSource and cleans up timers.
     */
    disconnect() {
      clearTimeout(reconnectTimer);
      if (socket) {
        socket.close();
        socket = null;
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      isConnected = false;
      socketId = null;
    },

    get isConnected() {
      return isConnected;
    },

    get socketId() {
      return socketId;
    },
  };
}

export type EdgekitClient = ReturnType<typeof createEdgekitClient>;

/**
 * Universal React Hook for subscribing to Edgekit Events.
 * Can be used in Next.js Client Components ('use client'), Vite, CRA, etc.
 *
 * Example:
 * ```tsx
 * useEdgekitEvent(client, 'orders', 'order.created', (order) => {
 *   toast.success(`Novo pedido #${order.id}`);
 * });
 * ```
 */
export function useEdgekitEvent(
  client: EdgekitClient | null | undefined,
  channel: string,
  event: string,
  callback: EventCallback
) {
  // We use standard effect if React is available in the consumer environment
  if (typeof window !== "undefined" && (window as any).React) {
    const React = (window as any).React;
    React.useEffect(() => {
      if (!client) return;
      const sub = client.subscribe(channel);
      const unbind = sub.bind(event, callback);
      return () => {
        unbind();
        client.unsubscribe(channel);
      };
    }, [client, channel, event, callback]);
  }
}
