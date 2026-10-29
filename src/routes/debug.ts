import { Hono } from "hono";
import type { Env, AppConfig } from "../types/env";
import { getApps } from "../services/auth";
import { constantTimeEquals } from "../services/crypto";

export const debugRoute = new Hono<{ Bindings: Env }>();

function authenticateSecret(env: Env, secret?: string | null): AppConfig | null {
  if (!secret) return null;
  const apps = getApps(env);
  for (const app of apps) {
    if (constantTimeEquals(app.secret, secret)) {
      return app;
    }
  }
  return null;
}

// 1. Verificar chave secreta
debugRoute.post("/api/v1/verify-secret", async (c) => {
  let secret = c.req.header("x-app-secret");
  if (!secret) {
    const authHeader = c.req.header("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      secret = authHeader.substring(7).trim();
    }
  }

  if (!secret) {
    try {
      const body = (await c.req.json()) as { secret?: string };
      secret = body.secret;
    } catch {}
  }

  const app = authenticateSecret(c.env, secret);
  if (!app) {
    return c.json({ valid: false, error: "Credenciais inválidas. Verifique a Secret Key." }, 401);
  }

  return c.json({
    valid: true,
    app: {
      id: app.id,
      key: app.key,
    },
  });
});

// 2. Métricas e canais agregados para o dashboard
debugRoute.get("/api/v1/stats", async (c) => {
  const secret = c.req.query("secret") || c.req.header("x-app-secret");
  const app = authenticateSecret(c.env, secret);

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
  return c.json({
    app: {
      id: targetApp.id,
      key: targetApp.key,
    },
    ...data,
  });
});

// 3. Conexão WebSocket para o Live Debug Console
debugRoute.get("/api/v1/debug/ws", async (c) => {
  const secret = c.req.query("secret");
  const app = authenticateSecret(c.env, secret);

  if (!app) {
    return new Response("Unauthorized: Chave secreta inválida ou ausente", { status: 401 });
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
