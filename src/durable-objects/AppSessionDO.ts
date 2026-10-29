import { DurableObject } from "cloudflare:workers";
import type { AppConfig, Env } from "../types/env";
import type {
  PusherMessage,
  PusherSubscribePayload,
  PusherUnsubscribePayload,
  SocketAttachment,
} from "../types/pusher";
import { generateSocketId } from "../services/crypto";
import { verifyChannelAuth } from "../services/auth";

export class AppSessionDO extends DurableObject<Env> {
  private appConfig: AppConfig | null = null;
  // In-memory cache of subscribers per channel while DO is awake
  private channelMap: Map<string, Set<WebSocket>> = new Map();
  private isMapHydrated = false;
  // Active dashboard live debug inspector sockets
  private debugListeners: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /**
   * Dispatches real-time debug telemetry to connected Dashboard clients
   */
  private notifyDebugListeners(eventData: Record<string, any>): void {
    if (this.debugListeners.size === 0) return;
    const payload = JSON.stringify(eventData);
    for (const ws of this.debugListeners) {
      try {
        ws.send(payload);
      } catch {
        this.debugListeners.delete(ws);
      }
    }
  }

  /**
   * Rehydrate the in-memory channel map from hibernated socket attachments
   */
  private ensureChannelMapHydrated(): void {
    if (this.isMapHydrated) return;

    this.channelMap.clear();
    const sockets = this.ctx.getWebSockets();

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as SocketAttachment | null;
      if (attachment && attachment.channels) {
        for (const channel of Object.keys(attachment.channels)) {
          let set = this.channelMap.get(channel);
          if (!set) {
            set = new Set();
            this.channelMap.set(channel, set);
          }
          set.add(ws);
        }
      }
    }

    this.isMapHydrated = true;
  }

  /**
   * Internal HTTP router for the Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Sync app credentials passed from the Worker
    const appId = request.headers.get("x-app-id");
    const appKey = request.headers.get("x-app-key");
    const appSecret = request.headers.get("x-app-secret");

    if (appId && appKey && appSecret) {
      this.appConfig = { id: appId, key: appKey, secret: appSecret };
    }

    // Route 1: WebSocket upgrade
    if (url.pathname === "/websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const socketId = generateSocketId();
      const attachment: SocketAttachment = {
        socketId,
        channels: {},
      };

      // Server accepts WebSocket with Cloudflare Hibernation API
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment(attachment);

      // Send initial handshake message (Pusher protocol v7)
      server.send(
        JSON.stringify({
          event: "pusher:connection_established",
          data: JSON.stringify({
            socket_id: socketId,
            activity_timeout: 120,
          }),
        })
      );

      this.notifyDebugListeners({
        type: "client_connected",
        socket_id: socketId,
        timestamp: Date.now(),
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    // Route 1B: Dashboard Live Debug Inspector WebSocket
    if (url.pathname === "/debug-websocket") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      this.ctx.acceptWebSocket(server);
      this.debugListeners.add(server);

      server.send(
        JSON.stringify({
          type: "connected",
          message: "Conectado ao Debug Stream do Edgekit Events",
          timestamp: Date.now(),
        })
      );

      return new Response(null, { status: 101, webSocket: client });
    }

    // Route 2: Internal broadcast route
    if (url.pathname === "/broadcast" && request.method === "POST") {
      const payload = (await request.json()) as {
        channels: string[];
        event: string;
        data: any;
        socket_id?: string;
      };

      this.ensureChannelMapHydrated();

      let recipientsCount = 0;
      for (const channel of payload.channels) {
        recipientsCount += this.broadcastToChannel(
          channel,
          payload.event,
          payload.data,
          payload.socket_id
        );
      }

      return Response.json({ success: true, delivered_to: recipientsCount });
    }

    // Route 3: Channel stats query
    if (url.pathname === "/channels" && request.method === "GET") {
      this.ensureChannelMapHydrated();

      const prefix = url.searchParams.get("filter_by_prefix") || "";
      const channelsData: Record<string, { user_count: number }> = {};

      for (const [ch, subscribers] of this.channelMap.entries()) {
        if (!prefix || ch.startsWith(prefix)) {
          if (subscribers.size > 0) {
            channelsData[ch] = { user_count: subscribers.size };
          }
        }
      }

      return Response.json({ channels: channelsData });
    }

    // Route 3B: Aggregated stats for Dashboard
    if (url.pathname === "/stats" && request.method === "GET") {
      this.ensureChannelMapHydrated();

      const channelsData: Record<string, { user_count: number }> = {};
      for (const [ch, subscribers] of this.channelMap.entries()) {
        if (subscribers.size > 0) {
          channelsData[ch] = { user_count: subscribers.size };
        }
      }

      const rawSockets = this.ctx.getWebSockets();
      const activeSockets = Math.max(0, rawSockets.length - this.debugListeners.size);

      return Response.json({
        active_sockets: activeSockets,
        channels_count: Object.keys(channelsData).length,
        channels: channelsData,
        debug_listeners: this.debugListeners.size,
        timestamp: Date.now(),
      });
    }

    // Route 4: Presence channel users query
    if (url.pathname.startsWith("/channels/") && url.pathname.endsWith("/users")) {
      const channelName = decodeURIComponent(
        url.pathname.replace("/channels/", "").replace("/users", "")
      );

      this.ensureChannelMapHydrated();

      const sockets = this.channelMap.get(channelName) || new Set();
      const users: { id: string }[] = [];
      const seenIds = new Set<string>();

      for (const ws of sockets) {
        const attachment = ws.deserializeAttachment() as SocketAttachment | null;
        const presence = attachment?.channels[channelName]?.presenceData;
        if (presence?.user_id && !seenIds.has(presence.user_id)) {
          seenIds.add(presence.user_id);
          users.push({ id: presence.user_id });
        }
      }

      return Response.json({ users });
    }

    return new Response("Not found", { status: 404 });
  }

  /**
   * Handle incoming WebSocket messages (Hibernation API callback)
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);

    let parsed: PusherMessage;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const { event, data } = parsed;

    // 1. Heartbeat Ping
    if (event === "pusher:ping") {
      ws.send(JSON.stringify({ event: "pusher:pong", data: "{}" }));
      return;
    }

    // 2. Channel Subscription
    if (event === "pusher:subscribe") {
      await this.handleSubscribe(ws, data);
      return;
    }

    // 3. Channel Unsubscribe
    if (event === "pusher:unsubscribe") {
      this.handleUnsubscribe(ws, data);
      return;
    }

    // 4. Client Events (Whisper) - e.g. client-typing
    if (event.startsWith("client-") && parsed.channel) {
      this.handleClientEvent(ws, parsed.channel, event, data);
      return;
    }
  }

  /**
   * Handle WebSocket disconnect (Hibernation API callback)
   */
  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    if (this.debugListeners.has(ws)) {
      this.debugListeners.delete(ws);
      return;
    }

    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (!attachment) return;

    this.notifyDebugListeners({
      type: "client_disconnected",
      socket_id: attachment.socketId,
      timestamp: Date.now(),
    });

    this.ensureChannelMapHydrated();

    // Clean up channel memberships and notify presence channels
    for (const [channel, info] of Object.entries(attachment.channels)) {
      const set = this.channelMap.get(channel);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          this.channelMap.delete(channel);
        }
      }

      if (channel.startsWith("presence-") && info.presenceData) {
        this.broadcastToChannel(
          channel,
          "pusher_internal:member_removed",
          { user_id: info.presenceData.user_id },
          attachment.socketId
        );
      }
    }
  }

  /**
   * Handle WebSocket errors
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    if (this.debugListeners.has(ws)) {
      this.debugListeners.delete(ws);
    }
    console.error("WebSocket error:", error);
    try {
      ws.close(1011, "Internal Server Error");
    } catch {}
  }

  /**
   * Internal helper to broadcast a message to all sockets subscribed to a channel
   */
  private broadcastToChannel(
    channel: string,
    event: string,
    data: any,
    excludeSocketId?: string
  ): number {
    const sockets = this.channelMap.get(channel);
    if (!sockets || sockets.size === 0) {
      this.notifyDebugListeners({
        type: "event_triggered",
        channel,
        event,
        data,
        socket_id: excludeSocketId,
        delivered_to: 0,
        timestamp: Date.now(),
      });
      return 0;
    }

    // Standard Pusher protocol expects data to be stringified JSON or string
    const formattedData = typeof data === "string" ? data : JSON.stringify(data);
    const messagePayload = JSON.stringify({
      channel,
      event,
      data: formattedData,
    });

    let sent = 0;
    for (const ws of sockets) {
      if (excludeSocketId) {
        const attachment = ws.deserializeAttachment() as SocketAttachment | null;
        if (attachment?.socketId === excludeSocketId) {
          continue;
        }
      }

      try {
        ws.send(messagePayload);
        sent++;
      } catch (err) {
        console.error("Failed to send message to socket:", err);
      }
    }

    this.notifyDebugListeners({
      type: "event_triggered",
      channel,
      event,
      data,
      socket_id: excludeSocketId,
      delivered_to: sent,
      timestamp: Date.now(),
    });

    return sent;
  }

  /**
   * Process `pusher:subscribe` event
   */
  private async handleSubscribe(ws: WebSocket, rawPayload: any): Promise<void> {
    let payload: PusherSubscribePayload;
    if (typeof rawPayload === "string") {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        return;
      }
    } else {
      payload = rawPayload;
    }

    const { channel, auth, channel_data } = payload;
    if (!channel) return;

    const attachment =
      (ws.deserializeAttachment() as SocketAttachment | null) || {
        socketId: "",
        channels: {},
      };

    // Verify auth for private and presence channels
    const isPrivate = channel.startsWith("private-");
    const isPresence = channel.startsWith("presence-");

    if (isPrivate || isPresence) {
      if (!this.appConfig) {
        this.sendError(ws, "Application configuration not loaded", 4001);
        return;
      }

      const isValid = await verifyChannelAuth(
        this.appConfig,
        attachment.socketId,
        channel,
        auth,
        channel_data
      );

      if (!isValid) {
        this.sendError(ws, `Subscription authorization failed for: ${channel}`, 4009);
        return;
      }
    }

    this.ensureChannelMapHydrated();

    // Register subscriber in memory
    let set = this.channelMap.get(channel);
    if (!set) {
      set = new Set();
      this.channelMap.set(channel, set);
    }
    set.add(ws);

    // Parse presence data if applicable
    let parsedPresence: { user_id: string; user_info?: any } | undefined;
    if (isPresence && channel_data) {
      try {
        parsedPresence =
          typeof channel_data === "string" ? JSON.parse(channel_data) : channel_data;
      } catch {}
    }

    // Update socket attachment state
    attachment.channels[channel] = {
      presenceData: parsedPresence,
    };
    ws.serializeAttachment(attachment);

    // If presence channel, build member list and notify others
    if (isPresence) {
      const channelSockets = set;
      const ids: string[] = [];
      const hash: Record<string, any> = {};

      for (const s of channelSockets) {
        const att = s.deserializeAttachment() as SocketAttachment | null;
        const p = att?.channels[channel]?.presenceData;
        if (p?.user_id) {
          if (!ids.includes(p.user_id)) {
            ids.push(p.user_id);
            hash[p.user_id] = p.user_info || {};
          }
        }
      }

      const presenceSuccessPayload = {
        presence: {
          ids,
          hash,
          count: ids.length,
        },
      };

      ws.send(
        JSON.stringify({
          event: "pusher_internal:subscription_succeeded",
          channel,
          data: JSON.stringify(presenceSuccessPayload),
        })
      );

      // Notify other members that this member was added
      if (parsedPresence) {
        this.broadcastToChannel(
          channel,
          "pusher_internal:member_added",
          parsedPresence,
          attachment.socketId
        );
      }
    } else {
      // Normal public or private channel success
      ws.send(
        JSON.stringify({
          event: "pusher_internal:subscription_succeeded",
          channel,
          data: "{}",
        })
      );
    }

    this.notifyDebugListeners({
      type: "channel_subscribed",
      channel,
      socket_id: attachment.socketId,
      is_presence: isPresence,
      presence_user_id: parsedPresence?.user_id,
      timestamp: Date.now(),
    });
  }

  /**
   * Process `pusher:unsubscribe` event
   */
  private handleUnsubscribe(ws: WebSocket, rawPayload: any): void {
    let payload: PusherUnsubscribePayload;
    if (typeof rawPayload === "string") {
      try {
        payload = JSON.parse(rawPayload);
      } catch {
        return;
      }
    } else {
      payload = rawPayload;
    }

    const { channel } = payload;
    if (!channel) return;

    this.ensureChannelMapHydrated();

    const set = this.channelMap.get(channel);
    if (set) {
      set.delete(ws);
      if (set.size === 0) {
        this.channelMap.delete(channel);
      }
    }

    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    if (attachment && attachment.channels[channel]) {
      const presence = attachment.channels[channel].presenceData;
      delete attachment.channels[channel];
      ws.serializeAttachment(attachment);

      // Notify others if leaving presence channel
      if (channel.startsWith("presence-") && presence) {
        this.broadcastToChannel(
          channel,
          "pusher_internal:member_removed",
          { user_id: presence.user_id },
          attachment.socketId
        );
      }
    }

    if (attachment) {
      this.notifyDebugListeners({
        type: "channel_unsubscribed",
        channel,
        socket_id: attachment.socketId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Process client-* event (whisper)
   */
  private handleClientEvent(
    ws: WebSocket,
    channel: string,
    event: string,
    data: any
  ): void {
    // Client events only allowed on private and presence channels
    if (!channel.startsWith("private-") && !channel.startsWith("presence-")) {
      return;
    }

    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    const socketId = attachment?.socketId;

    this.broadcastToChannel(channel, event, data, socketId);
  }

  /**
   * Send Pusher error message to socket
   */
  private sendError(ws: WebSocket, message: string, code?: number): void {
    ws.send(
      JSON.stringify({
        event: "pusher:error",
        data: JSON.stringify({ message, code }),
      })
    );
  }
}
