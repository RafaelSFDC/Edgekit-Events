import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { pusherWsRoute } from "./routes/pusher-ws";
import { pusherHttpRoute } from "./routes/pusher-http";
import { simpleApiRoute } from "./routes/simple-api";
import { sseRoute } from "./routes/sse";
import { ablyHttpRoute } from "./routes/ably-http";
import { healthRoute } from "./routes/health";
import { debugRoute } from "./routes/debug";

// Export Durable Object class binding for Cloudflare runtime
export { AppSessionDO } from "./durable-objects/AppSessionDO";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for web clients and cross-origin REST calls with Cookie support
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-App-Secret"],
  })
);

// Mount API routes
app.route("/", healthRoute);
app.route("/", pusherWsRoute);
app.route("/", pusherHttpRoute);
app.route("/", simpleApiRoute);
app.route("/", sseRoute);
app.route("/", ablyHttpRoute);
app.route("/", debugRoute);

// Raiz: serve o Dashboard da Web via Static Assets ou redireciona para info se for API JSON
app.get("/", async (c) => {
  if (c.req.header("Accept")?.includes("application/json")) {
    return c.redirect("/api/info");
  }
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.redirect("/api/info");
});

// Fallback para Static Assets (SPA Dashboard) ou 404 JSON estruturado
app.notFound(async (c) => {
  // Se for arquivo estático (JS, CSS, imagens, etc.)
  if (c.env.ASSETS) {
    const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }
  }

  // Se for rota de API não encontrada
  if (
    c.req.path.startsWith("/api") ||
    c.req.path.startsWith("/app") ||
    c.req.path.startsWith("/apps") ||
    c.req.path.startsWith("/health")
  ) {
    return c.json({ error: `Route not found: ${c.req.method} ${c.req.path}` }, 404);
  }

  // SPA fallback para rotas no frontend
  if (c.env.ASSETS) {
    const url = new URL(c.req.url);
    url.pathname = "/";
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }

  return c.json({ error: "Not found" }, 404);
});

export default app;
