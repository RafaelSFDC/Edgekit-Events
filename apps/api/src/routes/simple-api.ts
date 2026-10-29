import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types/env";
import type { SimpleTriggerPayload, CreateChannelPayload } from "../types/pusher";
import { findApp, getApps, verifySimpleBearerAuth } from "../services/auth";
import { AUTH_COOKIE_NAME } from "./debug";

export const simpleApiRoute = new Hono<{ Bindings: Env }>();

/**
 * Helper para autenticar a aplicação via Bearer token, X-App-Secret ou Cookie de sessão HttpOnly
 */
function resolveTargetApp(c: any) {
  const authHeader = c.req.header("Authorization");
  const querySecret = c.req.query("secret");
  const headerSecret = c.req.header("X-App-Secret");
  const cookieSecret = getCookie(c, AUTH_COOKIE_NAME);
  const secretCandidate = querySecret || headerSecret || cookieSecret;

  const apps = getApps(c.env);
  let targetApp = null;
  for (const candidate of apps) {
    if (verifySimpleBearerAuth(candidate, authHeader, secretCandidate)) {
      targetApp = candidate;
      break;
    }
  }

  if (!targetApp) {
    targetApp = apps[0] || null;
  }

  if (!targetApp) {
    return { app: null, error: "No configured app found", status: 404 };
  }

  const isAuthenticated = verifySimpleBearerAuth(targetApp, authHeader, secretCandidate);
  if (!isAuthenticated) {
    return {
      app: null,
      error:
        "Unauthorized. Pass Authorization: Bearer <APP_SECRET>, X-App-Secret, or connect with HttpOnly session cookie",
      status: 401,
    };
  }

  return { app: targetApp, error: null, status: 200 };
}

/**
 * 1. Simplified REST trigger endpoint for PHP, shared hosting, curl, and Web Dashboard
 * POST /api/v1/trigger
 */
simpleApiRoute.post("/api/v1/trigger", async (c) => {
  const auth = resolveTargetApp(c);
  if (!auth.app) {
    return c.json({ error: auth.error }, auth.status as any);
  }

  let body: (SimpleTriggerPayload & { app_id?: string; channels?: string[] }) | null = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body) {
    return c.json({ error: "Empty request body" }, 400);
  }

  const channels = body.channels || (body.channel ? [body.channel] : []);
  if (channels.length === 0 || !body.event) {
    return c.json({ error: "channel (or channels) and event are required" }, 400);
  }

  // Route to Durable Object
  const doId = c.env.APP_SESSION.idFromName(auth.app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const broadcastUrl = new URL(c.req.url);
  broadcastUrl.pathname = "/broadcast";

  const response = await stub.fetch(broadcastUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": auth.app.id,
      "x-app-key": auth.app.key,
      "x-app-secret": auth.app.secret,
    },
    body: JSON.stringify({
      channels,
      event: body.event,
      data: body.data,
      socket_id: body.socket_id,
    }),
  });

  const result = await response.json();
  return c.json(result);
});

/**
 * 2. List all registered & active channels from Durable Object storage
 * GET /api/v1/channels
 */
simpleApiRoute.get("/api/v1/channels", async (c) => {
  const auth = resolveTargetApp(c);
  if (!auth.app) {
    return c.json({ error: auth.error }, auth.status as any);
  }

  const doId = c.env.APP_SESSION.idFromName(auth.app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = "/channels";

  const response = await stub.fetch(internalUrl.toString(), {
    method: "GET",
    headers: {
      "x-app-id": auth.app.id,
      "x-app-key": auth.app.key,
      "x-app-secret": auth.app.secret,
    },
  });

  const result = await response.json();
  return c.json(result);
});

/**
 * 3. Register a new Channel in Durable Object SQLite with Archetype, IP Security & TTL
 * POST /api/v1/channels
 */
simpleApiRoute.post("/api/v1/channels", async (c) => {
  const auth = resolveTargetApp(c);
  if (!auth.app) {
    return c.json({ error: auth.error }, auth.status as any);
  }

  let body: CreateChannelPayload;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const doId = c.env.APP_SESSION.idFromName(auth.app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = "/channels";

  const response = await stub.fetch(internalUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": auth.app.id,
      "x-app-key": auth.app.key,
      "x-app-secret": auth.app.secret,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  return c.json(result, response.status as any);
});

/**
 * 4. Delete a registered Channel from Durable Object SQLite
 * DELETE /api/v1/channels/:name
 */
simpleApiRoute.delete("/api/v1/channels/:name", async (c) => {
  const auth = resolveTargetApp(c);
  if (!auth.app) {
    return c.json({ error: auth.error }, auth.status as any);
  }

  const channelName = c.req.param("name");
  const doId = c.env.APP_SESSION.idFromName(auth.app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = `/channels/${encodeURIComponent(channelName)}`;

  const response = await stub.fetch(internalUrl.toString(), {
    method: "DELETE",
    headers: {
      "x-app-id": auth.app.id,
      "x-app-key": auth.app.key,
      "x-app-secret": auth.app.secret,
    },
  });

  const result = await response.json();
  return c.json(result, response.status as any);
});
