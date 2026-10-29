import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, AppConfig } from "../types/env";
import { getApps } from "../services/auth";
import { constantTimeEquals } from "../services/crypto";

export const AUTH_COOKIE_NAME = "edgekit_events_session";

export const debugRoute = new Hono<{ Bindings: Env }>();

/**
 * Autentica a requisição via:
 * 1. Cookie HttpOnly seguro (recomendado para a Dashboard Web)
 * 2. Header X-App-Secret
 * 3. Header Authorization: Bearer <secret>
 * 4. Query param ?secret=<secret> (fallback para ferramentas externas)
 */
export function authenticateRequest(
  c: Context<{ Bindings: Env }>,
  explicitSecret?: string | null
): AppConfig | null {
  const cookieSecret = getCookie(c, AUTH_COOKIE_NAME);
  const headerSecret = c.req.header("x-app-secret");
  const authHeader = c.req.header("authorization");
  let bearerSecret: string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    bearerSecret = authHeader.substring(7).trim();
  }
  const querySecret = c.req.query("secret");

  const secretToTest =
    explicitSecret || cookieSecret || headerSecret || bearerSecret || querySecret;

  if (!secretToTest) return null;

  const apps = getApps(c.env);
  for (const app of apps) {
    if (constantTimeEquals(app.secret, secretToTest)) {
      return app;
    }
  }
  return null;
}

// 1. Login: Valida a passkey e estabelece o cookie HttpOnly seguro
debugRoute.post("/api/v1/auth/login", async (c) => {
  let passkey: string | undefined;

  try {
    const body = (await c.req.json()) as { passkey?: string; secret?: string };
    passkey = body.passkey || body.secret;
  } catch {}

  if (!passkey) {
    passkey = c.req.header("x-app-secret");
  }

  const app = authenticateRequest(c, passkey);
  if (!app || !passkey) {
    return c.json(
      { authenticated: false, error: "Passkey inválida." },
      401
    );
  }

  const isLocalhost =
    c.req.url.includes("localhost") || c.req.url.includes("127.0.0.1");

  // Define cookie HttpOnly para nunca ser acessado por scripts do navegador (XSS protection)
  setCookie(c, AUTH_COOKIE_NAME, passkey.trim(), {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  return c.json({
    authenticated: true,
  });
});

// Alias para compatibilidade anterior de /api/v1/verify-secret
debugRoute.post("/api/v1/verify-secret", async (c) => {
  let passkey: string | undefined;

  try {
    const body = (await c.req.json()) as { passkey?: string; secret?: string };
    passkey = body.passkey || body.secret;
  } catch {}

  if (!passkey) {
    passkey = c.req.header("x-app-secret");
  }

  const app = authenticateRequest(c, passkey);
  if (!app || !passkey) {
    return c.json(
      { authenticated: false, error: "Passkey inválida." },
      401
    );
  }

  const isLocalhost =
    c.req.url.includes("localhost") || c.req.url.includes("127.0.0.1");

  setCookie(c, AUTH_COOKIE_NAME, passkey.trim(), {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: "Lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return c.json({
    authenticated: true,
  });
});

// 2. Verificar Sessão Atual (Usado pelo frontend ao carregar a página)
debugRoute.get("/api/v1/auth/me", (c) => {
  const app = authenticateRequest(c);
  if (!app) {
    return c.json({ authenticated: false });
  }

  return c.json({
    authenticated: true,
  });
});

// 3. Logout: Remove o cookie HttpOnly
debugRoute.post("/api/v1/auth/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, {
    path: "/",
  });

  return c.json({
    authenticated: false,
  });
});

// 4. Métricas e canais agregados para o dashboard (Autenticado via Cookie HttpOnly ou Header)
debugRoute.get("/api/v1/stats", async (c) => {
  const app = authenticateRequest(c);

  const apps = getApps(c.env);
  const targetApp = app || apps[0];
  if (!targetApp) {
    return c.json({ error: "Nenhum aplicativo configurado" }, 400);
  }

  const doId = c.env.APP_SESSION.idFromName(targetApp.id);
  const stub = c.env.APP_SESSION.get(doId);

  const res = await stub.fetch("https://internal/stats", {
    headers: {
      "x-app-id": targetApp.id,
      "x-app-key": targetApp.key,
      "x-app-secret": targetApp.secret,
    },
  });

  if (!res.ok) {
    return c.json({ error: "Falha ao obter métricas do Durable Object" }, 500);
  }

  const data = (await res.json()) as Record<string, any>;
  return c.json(data);
});

// 5. Conexão WebSocket para o Live Debug Console
// O navegador envia automaticamente o Cookie HttpOnly durante o handshake WebSocket HTTP Upgrade
debugRoute.get("/api/v1/debug/ws", async (c) => {
  const app = authenticateRequest(c);

  if (!app) {
    return new Response("Unauthorized: Chave secreta ou cookie de sessão ausente/inválido", {
      status: 401,
    });
  }

  const doId = c.env.APP_SESSION.idFromName(app.id);
  const stub = c.env.APP_SESSION.get(doId);

  return stub.fetch("https://internal/debug-websocket", {
    headers: {
      Upgrade: "websocket",
      "x-app-id": app.id,
      "x-app-key": app.key,
      "x-app-secret": app.secret,
    },
  });
});
