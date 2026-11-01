# Edgekit Events (Cloudflare Workers + Durable Objects)

<p align="left">
  <b>🇺🇸 English</b> •
  <a href="README.pt-BR.md">🇧🇷 Português (Brasil)</a>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Events)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Idle Cost](https://img.shields.io/badge/Idle%20Cost-Zero%20(Hibernation)-emerald)](#)
[![Multi Protocol](https://img.shields.io/badge/Protocols-Pusher%20v7%20%7C%20Ably%20%7C%20SSE-F38020)](#)

An **open-source, serverless, and self-hosted drop-in replacement for Pusher, Ably, and Soketi**, built with **Hono** on **Cloudflare Workers** with **Durable Objects** and native **WebSocket Hibernation**.

> 💡 **The Edgekit Manifesto**: We are not a SaaS. We are not a hosted service. There are no surprise monthly invoices, connection markups, or idle fees. Everything belongs **100% solely and exclusively to you**, running on your own Cloudflare account (generous Free tier friendly, zero DevOps).

---

## 📊 Market Comparison

| Feature / Criteria | **Edgekit Events** | **Pusher Channels** | **Ably Realtime** | **Soketi (Self-Hosted)** |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting Model** | **100% Yours (Cloudflare)** | Proprietary SaaS | Proprietary SaaS | Self-hosted (VPS / Docker) |
| **Idle Cost** | **Zero (DO Hibernation)** | Paid per concurrent socket | Paid per message/connection | Continuous VPS/EC2 cost |
| **Server / DevOps Overhead** | **Zero (Pure Serverless)** | Zero (SaaS) | Zero (SaaS) | High (Redis, Node, SSL, OS) |
| **Pusher v7 Protocol** | ✅ Native (`pusher-js`, Echo) | ✅ Native | ⚠️ Via adapters only | ✅ Native |
| **Ably REST / Message API** | ✅ Built-in Adapter | ❌ No | ✅ Native | ❌ No |
| **Native Server-Sent Events (SSE)** | ✅ Yes (`/events/stream`) | ❌ No | ⚠️ Limited SSE | ❌ No |
| **Message History & Replay** | ✅ Optional (DO SQLite Buffer) | ❌ Cache channels only | ✅ Yes | ❌ No |
| **Visual Admin Dashboard** | ✅ Integrated on Edge (`/`) | ✅ Cloud dashboard | ✅ Cloud dashboard | ⚠️ Basic / Separate |
| **Zero-NPM Client Snippets** | ✅ Yes (shadcn style) | ❌ Requires SDK | ❌ Requires SDK | ❌ Requires SDK |

---

## 🚀 Highlights

- ⚡ **1-Click Deploy**: Cloudflare Workers Deploy button or interactive setup via `pnpm run setup`.
- 💰 **Zero Idle Costs**: Durable Objects WebSocket Hibernation keeps thousands of connected clients asleep at zero CPU invocation cost.
- 📡 **Universal Multi-Protocol**:
  - **Pusher v7**: Drop-in compatible with official `pusher-js` and Laravel Echo.
  - **Ably REST Adapter**: Drop-in publish and message history endpoints (`POST /channels/:id/messages`, `GET /channels/:id/messages`).
  - **Universal SSE**: Native Server-Sent Events stream (`GET /events/stream?channel=...`) with automatic reconnection and `last_event_id` replay.
- 🔐 **Delegated Auth Security**: Works seamlessly with any backend (Next.js, Laravel, WordPress, FastAPI, Go). Edgekit Events remains completely agnostic and doesn't store user credentials.
- 📦 **Zero-Dependency shadcn-Style Snippets**:
  - Frontend: [`snippets/events-client.ts`](snippets/events-client.ts) (Native WebSocket / SSE + React hook `useEdgekitEvent`).
  - Backend: [`snippets/events.ts`](snippets/events.ts) (TypeScript / Next.js) and [`snippets/Events.php`](snippets/Events.php) (PHP / WordPress fire-and-forget).
- 🏢 **Multi-Tenancy**: Configured statically via environment secrets by default (zero database required), with optional Cloudflare D1 for dynamic app management.
- 🖥️ **All-in-One Packaging**: Deploys both the realtime API engine and the modern React 19 management dashboard on the same Cloudflare Worker.

---

## 📐 Architecture Overview

```
[Your Backend: PHP / WordPress / Next.js / Python / Go]
                        │
                        ▼ (POST /api/v1/trigger, /api/v1/batch, or /apps/:id/events)
       [Hono Worker on Cloudflare Edge]
                        │
                        ▼ (Routes to target Durable Object instance)
       [Cloudflare Durable Object (AppSessionDO)]
              ├── In-Memory State & Presence Map
              ├── SQLite Circular Buffer (Message History & Replay)
              └── WebSocket Hibernation Manager
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[Browsers: pusher-js / Echo]   [Browsers / Mobile: SSE Stream]
  (Zero idle CPU cost!)           (Native EventSource)
```

---

## 🛠️ Quick Start & Local Development

### 1. Clone & Install
```bash
git clone https://github.com/RafaelSFDC/Edgekit-Events.git
cd "Edgekit Events"
pnpm install
```

### 2. Configure Local Secrets
Run the interactive setup:
```bash
pnpm setup
```
Or manually create `.dev.vars`:
```ini
DEFAULT_APP_ID=default-app
DEFAULT_APP_KEY=key-default
DEFAULT_APP_SECRET=secret-default
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Start Dev Servers (API + Web Dashboard)
```bash
pnpm dev
```
- Web Dashboard with HMR: `http://localhost:5173`
- Worker API & WebSocket Engine: `http://localhost:8787`

### 4. Run Automated Test Suite
```bash
pnpm test
```

---

## 🌐 1-Click Deployment to Cloudflare

### Deploy via Wrangler CLI
```bash
# 1. Login to Cloudflare
pnpm --filter @edgekit/api wrangler login

# 2. Set your production secret
pnpm --filter @edgekit/api wrangler secret put DEFAULT_APP_SECRET

# 3. Build Web Dashboard and deploy Worker
pnpm deploy
```

---

## 🔌 Ecosystem Integration Guides

### 1. Next.js & Serverless (TypeScript)
Copy [`snippets/events.ts`](snippets/events.ts) to `lib/events.ts`:
```ts
import { createEventsClient } from "@/lib/events";

const events = createEventsClient({
  host: process.env.EDGEKIT_HOST!,
  appKey: process.env.EDGEKIT_KEY!,
  appSecret: process.env.EDGEKIT_SECRET!,
});

// Single trigger
await events.trigger({
  channel: "orders",
  event: "order.created",
  data: { id: "ord_123", total: 49.90 },
});

// Batch trigger (multiple channels / events in one round-trip)
await events.triggerBatch([
  { channel: "orders", event: "order.created", data: { id: "1" } },
  { channel: "notifications", event: "badge.update", data: { count: 3 } },
]);
```

### 2. Shared Hosting & WordPress (PHP)
Copy [`snippets/Events.php`](snippets/Events.php) to your project:
```php
use App\Services\EdgeKitEvents;

$events = new EdgeKitEvents(
    host: 'realtime.yourdomain.com',
    appKey: 'key-default',
    appSecret: 'secret-default'
);

// Non-blocking fire-and-forget (dispatches in <5ms without stalling page load!)
$events->triggerAsync('orders', 'order.completed', ['order_id' => 456]);
```

### 3. Frontend: Zero-Dependency React / Browser
Copy [`snippets/events-client.ts`](snippets/events-client.ts) into your frontend:
```tsx
import { createEdgekitClient, useEdgekitEvent } from "@/lib/events-client";

export const client = createEdgekitClient({
  host: "realtime.yourdomain.com",
  appKey: "key-default",
  transport: "ws", // or "sse" for native Server-Sent Events
});

export function LiveOrders() {
  useEdgekitEvent(client, "orders", "order.created", (order) => {
    console.log("New live order received:", order);
  });

  return <div>Listening to real-time events...</div>;
}
```

### 4. Frontend: Official `pusher-js` or Laravel Echo
No code changes needed! Just point to your Worker host:
```js
import Pusher from 'pusher-js';

const pusher = new Pusher('key-default', {
  wsHost: 'realtime.yourdomain.com',
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
});

const channel = pusher.subscribe('orders');
channel.bind('order.created', (data) => console.log(data));
```

---

## 📖 API Reference

### 1. Universal REST Trigger
- `POST /api/v1/trigger`
- Headers: `Authorization: Bearer <SECRET>` or `X-App-Secret: <SECRET>`
- Body:
  ```json
  {
    "channel": "orders",
    "event": "order.created",
    "data": { "id": 10 }
  }
  ```

### 2. Universal REST Batch Trigger
- `POST /api/v1/batch`
- Body:
  ```json
  {
    "batch": [
      { "channel": "orders", "event": "order.created", "data": { "id": 1 } },
      { "channel": "chat", "event": "message", "data": { "text": "Hello" } }
    ]
  }
  ```

### 3. Universal Server-Sent Events (SSE)
- `GET /events/stream?channel=orders,notifications&key=key-default`
- Returns a live SSE stream (`text/event-stream`). Supports `Last-Event-ID` header for missed message replay.

### 4. Ably REST Compatible Endpoints
- `POST /channels/:channel_id/messages`: Publish single or batch messages.
  - Auth: `Authorization: Basic base64(key:secret)` or `X-Ably-Key: key:secret`.
- `GET /channels/:channel_id/messages`: Query message history.
- `GET /channels`: Query active channel presence.
- `POST /keys/:key/requestToken`: Request auth token.

### 5. Pusher v7 Compatible Endpoints
- WebSocket: `/app/:app_key`
- HTTP Trigger: `POST /apps/:app_id/events` (standard HMAC-SHA256 signature)
- Channel Queries: `GET /apps/:app_id/channels`

---

## 📄 License
MIT © Rafael SFDC. Open source, self-hosted, and community-driven.
