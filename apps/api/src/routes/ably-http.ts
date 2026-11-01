import { Hono } from "hono";
import type { Env } from "../types/env";
import { getApps, verifyAblyAuth } from "../services/auth";

export const ablyHttpRoute = new Hono<{ Bindings: Env }>();

/**
 * Helper para resolver a aplicação via credenciais compatíveis com Ably:
 * Basic Auth base64(key:secret), X-Ably-Key header ou ?key=
 */
function resolveAblyApp(c: any) {
  const authHeader = c.req.header("Authorization");
  const ablyKeyHeader = c.req.header("X-Ably-Key");
  const queryKey = c.req.query("key");

  const apps = getApps(c.env);
  for (const app of apps) {
    if (verifyAblyAuth(app, authHeader, ablyKeyHeader, queryKey)) {
      return { app, error: null };
    }
  }

  // Se houver apenas uma app configurada e sem auth fornecida (para ambiente local / teste)
  if (apps.length === 1 && !authHeader && !ablyKeyHeader && !queryKey) {
    return { app: apps[0], error: null };
  }

  return {
    app: null,
    error: "Unauthorized. Provide Ably credentials via Authorization: Basic <base64>, X-Ably-Key, or ?key=",
  };
}

/**
 * 1. Ably REST Message Publish endpoint:
 * POST /channels/:channel_id/messages
 */
ablyHttpRoute.post("/channels/:channel_id/messages", async (c) => {
  const { app, error } = resolveAblyApp(c);
  if (!app) {
    return c.json({ error: { message: error, statusCode: 401, code: 40100 } }, 401);
  }

  const channelId = c.req.param("channel_id");
  let body: any = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { message: "Invalid JSON body", statusCode: 400, code: 40000 } },
      400
    );
  }

  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  // Mensagens em lote ou mensagem única
  if (Array.isArray(body)) {
    const batch = body.map((m) => ({
      channel: channelId,
      event: m.name || m.event || "message",
      data: m.data,
      socket_id: m.clientId,
    }));

    const broadcastUrl = new URL(c.req.url);
    broadcastUrl.pathname = "/broadcast-batch";

    await stub.fetch(broadcastUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": app.id,
        "x-app-key": app.key,
        "x-app-secret": app.secret,
      },
      body: JSON.stringify({ batch }),
    });

    const messageIds = batch.map(() => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    return c.json(
      { channel: channelId, messageIds, published: batch.length },
      201
    );
  }

  const eventName = body.name || body.event || "message";
  const broadcastUrl = new URL(c.req.url);
  broadcastUrl.pathname = "/broadcast";

  await stub.fetch(broadcastUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
    body: JSON.stringify({
      channels: [channelId],
      event: eventName,
      data: body.data,
      socket_id: body.clientId,
    }),
  });

  const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return c.json(
    { channel: channelId, messageId, success: true },
    201
  );
});

/**
 * 2. Ably REST Message History endpoint:
 * GET /channels/:channel_id/messages
 */
ablyHttpRoute.get("/channels/:channel_id/messages", async (c) => {
  const { app, error } = resolveAblyApp(c);
  if (!app) {
    return c.json({ error: { message: error, statusCode: 401, code: 40100 } }, 401);
  }

  const channelId = c.req.param("channel_id");
  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const historyUrl = new URL(c.req.url);
  historyUrl.pathname = "/history";
  historyUrl.searchParams.set("channel", channelId);

  const res = await stub.fetch(historyUrl.toString(), {
    method: "GET",
    headers: {
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
  });

  const data: any = await res.json();
  const messages = (data.messages || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    data: m.data,
    timestamp: m.timestamp,
  }));

  return c.json(messages);
});

/**
 * 3. Ably REST Channels Query endpoint:
 * GET /channels
 */
ablyHttpRoute.get("/channels", async (c) => {
  const { app, error } = resolveAblyApp(c);
  if (!app) {
    return c.json({ error: { message: error, statusCode: 401, code: 40100 } }, 401);
  }

  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const channelsUrl = new URL(c.req.url);
  channelsUrl.pathname = "/channels";

  const res = await stub.fetch(channelsUrl.toString(), {
    method: "GET",
    headers: {
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
  });

  const channelsData = await res.json();
  return c.json(channelsData);
});

/**
 * 4. Ably Token Request endpoint:
 * POST /keys/:key/requestToken
 */
ablyHttpRoute.post("/keys/:key/requestToken", async (c) => {
  const { app, error } = resolveAblyApp(c);
  if (!app) {
    return c.json({ error: { message: error, statusCode: 401, code: 40100 } }, 401);
  }

  return c.json({
    token: app.secret,
    keyName: app.key,
    issued: Date.now(),
    expires: Date.now() + 3600 * 1000,
    capability: { "*": ["*"] },
  });
});
