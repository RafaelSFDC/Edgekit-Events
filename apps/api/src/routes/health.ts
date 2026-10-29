import { Hono } from "hono";
import type { Env } from "../types/env";
import { getApps } from "../services/auth";

export const healthRoute = new Hono<{ Bindings: Env }>();

healthRoute.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: Date.now() });
});

healthRoute.get("/api/info", (c) => {
  const apps = getApps(c.env);
  return c.json({
    status: "ok",
    service: "Edgekit Events (Cloudflare Realtime)",
    version: "1.0.0",
    configured_apps: apps.map((a) => ({
      id: a.id,
      key: a.key,
    })),
    endpoints: {
      websocket: "/app/:app_key",
      pusher_trigger: "POST /apps/:app_id/events",
      simple_trigger: "POST /api/v1/trigger",
      debug_websocket: "GET /api/v1/debug/ws",
      stats: "GET /api/v1/stats",
    },
  });
});
