import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types/env";
import { pusherWsRoute } from "./routes/pusher-ws";
import { pusherHttpRoute } from "./routes/pusher-http";
import { simpleApiRoute } from "./routes/simple-api";
import { healthRoute } from "./routes/health";

// Export Durable Object class binding for Cloudflare runtime
export { AppSessionDO } from "./durable-objects/AppSessionDO";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for web clients and cross-origin REST calls
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Mount routes
app.route("/", healthRoute);
app.route("/", pusherWsRoute);
app.route("/", pusherHttpRoute);
app.route("/", simpleApiRoute);

export default app;
