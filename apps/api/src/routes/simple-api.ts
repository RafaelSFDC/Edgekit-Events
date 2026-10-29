import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { Env } from "../types/env";
import type { SimpleTriggerPayload } from "../types/pusher";
import { findApp, getApps, verifySimpleBearerAuth } from "../services/auth";
import { AUTH_COOKIE_NAME } from "./debug";

export const simpleApiRoute = new Hono<{ Bindings: Env }>();

/**
 * Simplified REST trigger endpoint for PHP, shared hosting, curl, and Web Dashboard
 * POST /api/v1/trigger
 */
simpleApiRoute.post("/api/v1/trigger", async (c) => {
  const authHeader = c.req.header("Authorization");
  const querySecret = c.req.query("secret");
  const headerSecret = c.req.header("X-App-Secret");
  const cookieSecret = getCookie(c, AUTH_COOKIE_NAME);
  const secretCandidate = querySecret || headerSecret || cookieSecret;

  let body: (SimpleTriggerPayload & { app_id?: string; channels?: string[] }) | null = null;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body) {
    return c.json({ error: "Empty request body" }, 400);
  }

  // Identify target app
  const apps = getApps(c.env);
  let targetApp = body.app_id ? findApp(c.env, body.app_id) : null;

  // If no app_id provided, attempt to authenticate against any matching configured app
  if (!targetApp) {
    for (const candidate of apps) {
      if (verifySimpleBearerAuth(candidate, authHeader, secretCandidate)) {
        targetApp = candidate;
        break;
      }
    }
  }

  if (!targetApp) {
    // If targetApp still not found, check default app
    targetApp = apps[0] || null;
  }

  if (!targetApp) {
    return c.json({ error: "No configured app found" }, 404);
  }

  // Validate authentication
  const isAuthenticated = verifySimpleBearerAuth(targetApp, authHeader, secretCandidate);
  if (!isAuthenticated) {
    return c.json(
      {
        error:
          "Unauthorized. Pass Authorization: Bearer <APP_SECRET>, X-App-Secret, or connect with HttpOnly session cookie",
      },
      401
    );
  }

  const channels = body.channels || (body.channel ? [body.channel] : []);
  if (channels.length === 0 || !body.event) {
    return c.json({ error: "channel (or channels) and event are required" }, 400);
  }

  // Route to Durable Object
  const doId = c.env.APP_SESSION.idFromName(targetApp.id);
  const stub = c.env.APP_SESSION.get(doId);

  const broadcastUrl = new URL(c.req.url);
  broadcastUrl.pathname = "/broadcast";

  const response = await stub.fetch(broadcastUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-id": targetApp.id,
      "x-app-key": targetApp.key,
      "x-app-secret": targetApp.secret,
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
