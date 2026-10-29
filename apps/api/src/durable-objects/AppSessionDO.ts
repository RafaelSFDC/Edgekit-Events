import { DurableObject } from "cloudflare:workers";
import type { AppConfig, Env } from "../types/env";
import type {
  PusherMessage,
  PusherSubscribePayload,
  PusherUnsubscribePayload,
  SocketAttachment,
  ChannelRecord,
  ChannelCategory,
  ChannelVisibility,
  CreateChannelPayload,
} from "../types/pusher";
import { generateSocketId } from "../services/crypto";
import { verifyChannelAuth } from "../services/auth";

function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  if (!allowedIps || allowedIps.length === 0) return true;
  const client = clientIp.trim();
  return allowedIps.some((rule) => {
    const r = rule.trim();
    if (!r) return false;
    if (r === "*" || r === client) return true;
    if (r.endsWith(".*")) {
      const prefix = r.slice(0, -2);
      return client.startsWith(prefix);
    }
    return false;
  });
}

export class AppSessionDO extends DurableObject<Env> {
  private appConfig: AppConfig | null = null;
  // In-memory cache of subscribers per channel while DO is awake
  private channelMap: Map<string, Set<WebSocket>> = new Map();
  private isMapHydrated = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    try {
      if (typeof WebSocketRequestResponsePair !== "undefined") {
        this.ctx.setWebSocketAutoResponse(
          new WebSocketRequestResponsePair("ping", "pong")
        );
      }
    } catch {}
  }

  /**
   * Helper methods for Channel Storage and DO Alarms Lifecycle
   */
  async getChannelConfig(name: string): Promise<ChannelRecord | null> {
    return (await this.ctx.storage.get<ChannelRecord>(`chan:${name}`)) || null;
  }

  async saveChannelConfig(record: ChannelRecord): Promise<void> {
    await this.ctx.storage.put(`chan:${record.name}`, record);
  }

  async deleteChannelConfig(name: string): Promise<boolean> {
    return await this.ctx.storage.delete(`chan:${name}`);
  }

  async listChannelConfigs(): Promise<ChannelRecord[]> {
    const map = await this.ctx.storage.list<ChannelRecord>({ prefix: "chan:" });
    return Array.from(map.values());
  }

  private async sendWebhookNotification(
    webhookUrl: string | undefined,
    event: "channel_occupied" | "channel_vacated" | "channel_destroyed",
    data: Record<string, any>
  ): Promise<void> {
    if (!webhookUrl) return;
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Edgekit-Realtime-DO/1.0",
        },
        body: JSON.stringify({
          event,
          timestamp: Date.now(),
          ...data,
        }),
      });
    } catch (err) {
      console.error(`[Webhook] Falha ao enviar ${event} para ${webhookUrl}:`, err);
    }
  }

  private async handleChannelVacated(channel: string): Promise<void> {
    const config = await this.getChannelConfig(channel);
    if (!config) return;

    config.vacatedAt = Date.now();
    await this.saveChannelConfig(config);

    if (config.autoDestructMinutes && config.autoDestructMinutes > 0) {
      const ttlMs = config.autoDestructMinutes * 60 * 1000;
      await this.ctx.storage.setAlarm(Date.now() + ttlMs);
    }

    if (config.webhookUrl) {
      this.sendWebhookNotification(config.webhookUrl, "channel_vacated", {
        channel,
      });
    }
  }

  private async handleChannelOccupied(channel: string): Promise<void> {
    const config = await this.getChannelConfig(channel);
    if (!config) return;

    if (config.vacatedAt) {
      config.vacatedAt = undefined;
      await this.saveChannelConfig(config);
    }

    if (config.webhookUrl) {
      this.sendWebhookNotification(config.webhookUrl, "channel_occupied", {
        channel,
      });
    }
  }

  /**
   * Cloudflare DO Alarms Handler for Channel Idle TTL and Auto-Destruction
   */
  async alarm(): Promise<void> {
    this.ensureChannelMapHydrated();
    const channels = await this.listChannelConfigs();
    const now = Date.now();
    let nextAlarmTime: number | null = null;

    for (const ch of channels) {
      if (ch.autoDestructMinutes && ch.autoDestructMinutes > 0 && ch.vacatedAt) {
        const subscribers = this.channelMap.get(ch.name);
        const userCount = subscribers ? subscribers.size : 0;

        if (userCount === 0) {
          const ttlMs = ch.autoDestructMinutes * 60 * 1000;
          const expiresAt = ch.vacatedAt + ttlMs;

          if (now >= expiresAt) {
            await this.deleteChannelConfig(ch.name);

            this.notifyDebugListeners({
              type: "channel_destroyed",
              channel: ch.name,
              reason: "idle_timeout",
              timestamp: now,
            });

            if (ch.webhookUrl) {
              await this.sendWebhookNotification(ch.webhookUrl, "channel_destroyed", {
                channel: ch.name,
                reason: "idle_timeout",
              });
            }
          } else {
            if (nextAlarmTime === null || expiresAt < nextAlarmTime) {
              nextAlarmTime = expiresAt;
            }
          }
        }
      }
    }

    if (nextAlarmTime !== null) {
      await this.ctx.storage.setAlarm(nextAlarmTime);
    }
  }

  /**
   * Dispatches real-time debug telemetry to connected Dashboard clients.
   * Uses tagged WebSockets via Cloudflare Hibernation API so listeners
   * survive DO hibernation and waking cycles seamlessly.
   */
  private notifyDebugListeners(eventData: Record<string, any>): void {
    const debugSockets = this.ctx.getWebSockets("debug");
    if (debugSockets.length === 0) return;
    const payload = JSON.stringify(eventData);
    for (const ws of debugSockets) {
      try {
        ws.send(payload);
      } catch {
        try {
          ws.close();
        } catch {}
      }
    }
  }

  /**
   * Rehydrate the in-memory channel map from hibernated socket attachments
   */
  private ensureChannelMapHydrated(): void {
    if (this.isMapHydrated) return;

    this.channelMap.clear();
    // Only rehydrate client sockets (avoid inspecting debug sockets)
    const sockets = this.ctx.getWebSockets("client");

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
      const clientIp = request.headers.get("x-client-ip") || "127.0.0.1";
      const attachment: SocketAttachment = {
        socketId,
        clientIp,
        channels: {},
      };

      // Server accepts WebSocket with Cloudflare Hibernation API tagged as "client"
      this.ctx.acceptWebSocket(server, ["client"]);
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

      // Server accepts debug WebSocket with Cloudflare Hibernation API tagged as "debug"
      this.ctx.acceptWebSocket(server, ["debug"]);
      server.serializeAttachment({ type: "debug" });

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

    // Route 3: Channel query (registered in SQLite + in-memory live sockets)
    if (url.pathname === "/channels" && request.method === "GET") {
      this.ensureChannelMapHydrated();

      const prefix = url.searchParams.get("filter_by_prefix") || "";
      const registeredList = await this.listChannelConfigs();
      const channelsData: Record<string, any> = {};

      // 1. Incluir canais registrados no SQLite
      for (const reg of registeredList) {
        if (!prefix || reg.name.startsWith(prefix)) {
          const subscribers = this.channelMap.get(reg.name);
          channelsData[reg.name] = {
            user_count: subscribers ? subscribers.size : 0,
            category: reg.category,
            visibility: reg.visibility,
            description: reg.description,
            allowedIps: reg.allowedIps,
            events: reg.events,
            autoDestructMinutes: reg.autoDestructMinutes,
            webhookUrl: reg.webhookUrl,
            vacatedAt: reg.vacatedAt,
            createdAt: reg.createdAt,
            isRegistered: true,
          };
        }
      }

      // 2. Mesclar canais voláteis na memória
      for (const [ch, subscribers] of this.channelMap.entries()) {
        if (!prefix || ch.startsWith(prefix)) {
          if (!channelsData[ch] && subscribers.size > 0) {
            channelsData[ch] = {
              user_count: subscribers.size,
              category: ch.startsWith("presence-")
                ? "presence"
                : "custom",
              visibility: (ch.startsWith("private-") || ch.startsWith("presence-"))
                ? "private"
                : "public",
              events: [],
              isRegistered: false,
            };
          }
        }
      }

      return Response.json({ channels: channelsData });
    }

    // Route 3B: Register / Create Channel in SQLite
    if (url.pathname === "/channels" && request.method === "POST") {
      let body: CreateChannelPayload;
      try {
        body = (await request.json()) as CreateChannelPayload;
      } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
      }

      if (!body.name || typeof body.name !== "string") {
        return Response.json({ error: "Nome do canal é obrigatório" }, { status: 400 });
      }

      const name = body.name.trim();
      const category: ChannelCategory =
        body.category || (name.startsWith("presence-") ? "presence" : "custom");
      const visibility: ChannelVisibility =
        body.visibility ||
        (name.startsWith("private-") || name.startsWith("presence-")
          ? "private"
          : "public");
      const events =
        Array.isArray(body.events) && body.events.length > 0
          ? body.events
          : ["channel:init"];

      const record: ChannelRecord = {
        name,
        category,
        visibility,
        description: body.description?.trim(),
        allowedIps: body.allowedIps?.map((ip) => ip.trim()).filter(Boolean),
        events,
        autoDestructMinutes:
          body.autoDestructMinutes !== undefined
            ? Number(body.autoDestructMinutes)
            : 0,
        webhookUrl: body.webhookUrl?.trim(),
        vacatedAt: Date.now(),
        createdAt: Date.now(),
      };

      await this.saveChannelConfig(record);

      if (record.autoDestructMinutes && record.autoDestructMinutes > 0) {
        const ttlMs = record.autoDestructMinutes * 60 * 1000;
        await this.ctx.storage.setAlarm(Date.now() + ttlMs);
      }

      this.notifyDebugListeners({
        type: "channel_created",
        channel: record.name,
        config: record,
        timestamp: Date.now(),
      });

      return Response.json({ success: true, channel: record });
    }

    // Route 3C: Delete registered Channel from SQLite
    if (
      url.pathname.startsWith("/channels/") &&
      !url.pathname.endsWith("/users") &&
      request.method === "DELETE"
    ) {
      const channelName = decodeURIComponent(url.pathname.replace("/channels/", ""));
      const deleted = await this.deleteChannelConfig(channelName);

      this.notifyDebugListeners({
        type: "channel_destroyed",
        channel: channelName,
        reason: "manual_deletion",
        timestamp: Date.now(),
      });

      return Response.json({ success: deleted });
    }

    // Route 3D: Aggregated stats for Dashboard
    if (url.pathname === "/stats" && request.method === "GET") {
      this.ensureChannelMapHydrated();

      const registeredList = await this.listChannelConfigs();
      const channelsData: Record<string, { user_count: number }> = {};

      for (const reg of registeredList) {
        const subscribers = this.channelMap.get(reg.name);
        channelsData[reg.name] = { user_count: subscribers ? subscribers.size : 0 };
      }

      for (const [ch, subscribers] of this.channelMap.entries()) {
        if (!channelsData[ch] && subscribers.size > 0) {
          channelsData[ch] = { user_count: subscribers.size };
        }
      }

      const clientSockets = this.ctx.getWebSockets("client");
      const debugSockets = this.ctx.getWebSockets("debug");

      return Response.json({
        active_sockets: clientSockets.length,
        channels_count: Object.keys(channelsData).length,
        channels: channelsData,
        debug_listeners: debugSockets.length,
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

    // If this is a debug listener socket, handle ping / pong
    const tags = this.ctx.getTags(ws);
    if (tags.includes("debug")) {
      if (raw === "ping" || raw.includes('"ping"')) {
        try {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        } catch {}
      }
      return;
    }

    let parsed: PusherMessage;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    const { event, data } = parsed;

    // 1. Heartbeat Ping
    if (event === "pusher:ping" || (parsed as any).type === "ping") {
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
    const tags = this.ctx.getTags(ws);
    if (tags.includes("debug")) {
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
          await this.handleChannelVacated(channel);
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

    // Verify auth and IP restrictions for channels
    const channelConfig = await this.getChannelConfig(channel);
    const isPrivate =
      channel.startsWith("private-") || channelConfig?.visibility === "private";
    const isPresence =
      channel.startsWith("presence-") || channelConfig?.category === "presence";

    // Validação de IP para canais privados com allowedIps
    if (
      channelConfig?.visibility === "private" &&
      channelConfig.allowedIps &&
      channelConfig.allowedIps.length > 0
    ) {
      const clientIp = attachment.clientIp || "127.0.0.1";
      const allowed = isIpAllowed(clientIp, channelConfig.allowedIps);
      if (!allowed && !auth) {
        this.sendError(
          ws,
          `Subscription authorization rejected: IP ${clientIp} is not authorized for channel ${channel}`,
          4009
        );
        return;
      }
    }

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
    const isFirstSubscriber = !set || set.size === 0;
    if (!set) {
      set = new Set();
      this.channelMap.set(channel, set);
    }
    set.add(ws);

    if (isFirstSubscriber) {
      await this.handleChannelOccupied(channel);
    }

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
        this.handleChannelVacated(channel);
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
