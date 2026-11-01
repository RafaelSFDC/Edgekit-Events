import { Hono } from "hono";
import type { Env } from "../types/env";
import { findApp, getApps, verifyChannelAuth, verifySimpleBearerAuth } from "../services/auth";

export const sseRoute = new Hono<{ Bindings: Env }>();

/**
 * Universal Server-Sent Events (SSE) stream endpoint:
 * GET /events/stream?channel=orders,notifications&key=key-default
 * GET /api/v1/stream?channel=orders&key=key-default
 */
async function handleSseRequest(c: any) {
  const queryKey = c.req.query("app_key") || c.req.query("key");
  const headerKey = c.req.header("X-App-Key");
  const authHeader = c.req.header("Authorization");
  const keyCandidate = queryKey || headerKey;

  const apps = getApps(c.env);
  let app = null;

  if (keyCandidate) {
    app = findApp(c.env, keyCandidate);
  }

  // Se não foi encontrada por chave pública, tenta autenticação por Bearer secret
  if (!app && authHeader) {
    for (const candidate of apps) {
      if (verifySimpleBearerAuth(candidate, authHeader)) {
        app = candidate;
        break;
      }
    }
  }

  // Fallback para o app padrão se for o único configurado
  if (!app && apps.length > 0) {
    app = apps[0];
  }

  if (!app) {
    return c.text("App not found or not configured", 404);
  }

  const channelParam =
    c.req.query("channel") || c.req.query("channels") || "";
  const requestedChannels = channelParam
    .split(",")
    .map((ch: string) => ch.trim())
    .filter(Boolean);

  if (requestedChannels.length === 0) {
    return c.text("Missing 'channel' query parameter (e.g. ?channel=orders)", 400);
  }

  // Verificação de autorização para canais privados / presença
  const isBearerAdmin = verifySimpleBearerAuth(app, authHeader);
  const queryAuth = c.req.query("auth");

  for (const ch of requestedChannels) {
    if (ch.startsWith("private-") || ch.startsWith("presence-")) {
      if (!isBearerAdmin) {
        if (!queryAuth) {
          return c.text(`Unauthorized subscription to protected channel: ${ch}. Provide 'auth' parameter or Bearer token.`, 401);
        }

        const isValid = await verifyChannelAuth(app, "sse-client", ch, queryAuth);
        if (!isValid) {
          return c.text(`Invalid authorization signature for protected channel: ${ch}`, 403);
        }
      }
    }
  }

  // Obter Stub do Durable Object particionado por app
  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  const url = new URL(c.req.url);
  url.pathname = "/events/stream";

  const headers = new Headers(c.req.raw.headers);
  headers.set("x-app-id", app.id);
  headers.set("x-app-key", app.key);
  headers.set("x-app-secret", app.secret);

  const clientIp =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";
  headers.set("x-client-ip", clientIp);

  const doRequest = new Request(url.toString(), {
    method: "GET",
    headers,
  });

  return stub.fetch(doRequest);
}

sseRoute.get("/events/stream", handleSseRequest);
sseRoute.get("/api/v1/stream", handleSseRequest);
