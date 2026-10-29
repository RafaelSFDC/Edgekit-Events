import { Hono } from "hono";
import type { Env } from "../types/env";
import type { TriggerEventPayload } from "../types/pusher";
import { findApp, verifyPusherHttpSignature } from "../services/auth";

export const pusherHttpRoute = new Hono<{ Bindings: Env }>();

/**
 * Standard Pusher REST trigger endpoint:
 * POST /apps/:app_id/events
 */
pusherHttpRoute.post("/apps/:app_id/events", async (c) => {
  const appId = c.req.param("app_id");
  const app = findApp(c.env, appId);

  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }

  const rawBody = await c.req.text();
  const url = new URL(c.req.url);

  // Pusher signature verification
  const verification = await verifyPusherHttpSignature(
    app,
    "POST",
    url.pathname,
    url.searchParams,
    rawBody
  );

  if (!verification.valid) {
    return c.json({ error: verification.reason || "Unauthorized" }, 401);
  }

  let body: TriggerEventPayload;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  // Support both single `channel` and multiple `channels` array
  const channels = body.channels || (body.channel ? [body.channel] : []);
  if (channels.length === 0 || !body.name) {
    return c.json({ error: "Channels and event name are required" }, 400);
  }

  // Obtain DO instance
  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

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
      channels,
      event: body.name,
      data: body.data,
      socket_id: body.socket_id,
    }),
  });

  // Pusher returns an empty object {} on success
  return c.json({});
});

/**
 * Query channel stats:
 * GET /apps/:app_id/channels
 */
pusherHttpRoute.get("/apps/:app_id/channels", async (c) => {
  const appId = c.req.param("app_id");
  const app = findApp(c.env, appId);

  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }

  const url = new URL(c.req.url);
  const verification = await verifyPusherHttpSignature(
    app,
    "GET",
    url.pathname,
    url.searchParams,
    ""
  );

  if (!verification.valid) {
    return c.json({ error: verification.reason || "Unauthorized" }, 401);
  }

  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = "/channels";

  return stub.fetch(internalUrl.toString(), {
    method: "GET",
    headers: {
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
  });
});

/**
 * Query presence channel users:
 * GET /apps/:app_id/channels/:channel_name/users
 */
pusherHttpRoute.get("/apps/:app_id/channels/:channel_name/users", async (c) => {
  const appId = c.req.param("app_id");
  const channelName = c.req.param("channel_name");
  const app = findApp(c.env, appId);

  if (!app) {
    return c.json({ error: "App not found" }, 404);
  }

  const url = new URL(c.req.url);
  const verification = await verifyPusherHttpSignature(
    app,
    "GET",
    url.pathname,
    url.searchParams,
    ""
  );

  if (!verification.valid) {
    return c.json({ error: verification.reason || "Unauthorized" }, 401);
  }

  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = `/channels/${encodeURIComponent(channelName)}/users`;

  return stub.fetch(internalUrl.toString(), {
    method: "GET",
    headers: {
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
  });
});
