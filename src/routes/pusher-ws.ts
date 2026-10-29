import { Hono } from "hono";
import type { Env } from "../types/env";
import { findApp } from "../services/auth";

export const pusherWsRoute = new Hono<{ Bindings: Env }>();

// Standard Pusher WebSocket connection endpoint: /app/:app_key
pusherWsRoute.get("/app/:app_key", async (c) => {
  const appKey = c.req.param("app_key");
  const upgradeHeader = c.req.header("Upgrade");

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
    return c.text("Expected WebSocket connection", 426);
  }

  const app = findApp(c.env, appKey);
  if (!app) {
    return c.text("App not found. Check your app key.", 404);
  }

  // Obtain Durable Object stub partitioned by app ID
  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  // Construct internal request for Durable Object
  const url = new URL(c.req.url);
  url.pathname = "/websocket";

  const headers = new Headers(c.req.raw.headers);
  headers.set("x-app-id", app.id);
  headers.set("x-app-key", app.key);
  headers.set("x-app-secret", app.secret);

  const doRequest = new Request(url.toString(), {
    method: "GET",
    headers,
  });

  return stub.fetch(doRequest);
});
