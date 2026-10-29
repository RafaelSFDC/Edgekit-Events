import { Hono } from "hono";
import type { Env } from "../types/env";
import { getApps } from "../services/auth";

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/", (c) => {
  const apps = getApps(c.env);
  return c.json({
    status: "ok",
    service: "cloudflare-realtime (Pusher Clone)",
    version: "1.0.0",
    docs: "https://github.com/cloudflare-realtime",
    configured_apps: apps.map((a) => ({
      id: a.id,
      key: a.key,
    })),
    endpoints: {
      websocket: "/app/:app_key",
      pusher_trigger: "POST /apps/:app_id/events",
      simple_trigger: "POST /api/v1/trigger",
    },
  });
});

healthRoute.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: Date.now() });
});
