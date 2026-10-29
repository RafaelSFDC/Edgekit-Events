# Edgekit Events (Cloudflare Workers + Durable Objects)

<p align="left">
  <b>🇺🇸 English</b> •
  <a href="README.pt-BR.md">🇧🇷 Português (Brasil)</a>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Events)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Idle Cost](https://img.shields.io/badge/Idle%20Cost-Zero%20(Hibernation)-emerald)](#)
[![Pusher Protocol](https://img.shields.io/badge/Protocol-Pusher%20v7-F38020)](#)

An **open-source, serverless, and self-hosted alternative to Pusher, Soketi, and Ably**, built with **Hono** on **Cloudflare Workers** with **Durable Objects** and native **WebSocket Hibernation**.

Designed with a dual purpose:
1. **Full-Featured Visual Dashboard**: Inspect live events in real-time with Live Debug Console, broadcast test events with Event Simulator, track active channels/presence, and copy ready-to-use snippets.
2. **High-Performance External Realtime Microservice / API**: Trigger WebSocket events effortlessly from any backend (**Next.js, Node, PHP/Laravel, Python/FastAPI, Go, C#/.NET, Java/Spring, or Rust**), featuring zero-dependency copy-paste client snippets.

---

## 🚀 Highlights

- ⚡ **1-Click Deploy**: Official Cloudflare Workers Deploy button or interactive setup via `pnpm run setup`.
- 💰 **Zero Idle Costs**: Cloudflare Durable Objects WebSocket Hibernation keeps thousands of connected browsers in sleep mode at zero CPU invocation cost.
- 📡 **Pusher Protocol v7 Compatible**: Drop-in replacement for Pusher and Soketi — connect directly from frontend apps using official `pusher-js` or Laravel Echo without proprietary SDKs.
- 🔐 **HMAC-SHA256 Private & Presence Channels**: Secure access to user-specific streams (`private-*`) and collaborative rooms (`presence-*`) with real-time member join/leave notifications.
- 🚀 **Zero-Dependency Simplified REST API**: Broadcast events via `POST /api/v1/trigger` using simple Bearer token or `X-App-Secret` headers without complex signature calculations.
- 🏢 **Multi-Tenant Architecture**: Host multiple distinct applications or clients within the same Worker instance using `APPS_CONFIG` with isolated Durable Object sessions.
- 🖥️ **Integrated Web Dashboard**: Built with **React 19 + Tailwind CSS**, served directly from the edge on `/` with Live Stream Console, Event Simulator, and Snippets.
- 📦 **shadcn-Style Client Snippets (Zero NPM Dependencies)**: Copy [`snippets/events.ts`](snippets/events.ts) into your project (`lib/events.ts`) and use TypeScript with native Fetch without installing third-party libraries.

---

## 🖥️ Integrated Web Dashboard

The project includes a modern, edge-rendered management dashboard built with **React 19, Tailwind CSS, and Lucide Icons**, served automatically via Cloudflare Workers **Static Assets**:

- 📡 **Live Debug Console**: Continuous real-time stream of broadcasts, connections, and subscriptions with color-coded badges, payload inspection, and one-click JSON copy.
- 🚀 **Event Simulator & Trigger**: Fire test events into any channel directly from the browser with pre-built presets (E-commerce Order, Chat Message, System Notification).
- 👥 **Channels & Presence Explorer**: Monitor active public, private, and presence channels with live online listener counters.
- 📋 **Multi-Language Snippet Generator**: Copy configured code in JavaScript, Laravel Echo, PHP cURL, Node.js, Python, and terminal cURL.
- 🌐 **Full Internationalization (i18n)**: Seamless live toggle between **English (EN)** and **Português (pt-BR)**.
- 🔐 **Secure HttpOnly Cookie Authentication**: Manage your console session safely without exposing secret keys to client-side localStorage scripts.

---

## 📐 Architecture Overview

```
[Your External Backend / App]
          │
          ▼ (POST /api/v1/trigger or POST /apps/:app_id/events)
[Hono Worker on Cloudflare Edge]
          │
          ▼ (Routes to target Durable Object instance)
[Cloudflare Durable Object (AppSessionDO)]
          │
          ▼ (Delivers via WebSocket Hibernation API)
[Browsers / End Users (pusher-js)]
          (Zero idle CPU cost while clients stay connected!)
```

---

## 🛠️ Prerequisites

- **Node.js** >= 18
- **pnpm** (or npm)
- A **Cloudflare** account (Workers Free tier includes generous allowances and Durable Objects support).

---

## ⚡ Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RafaelSFDC/Edgekit-Events.git
   cd "Edgekit Events"
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure local environment variables:**
   Run the quick setup wizard:
   ```bash
   pnpm setup
   ```
   Or manually create `.dev.vars`:
   ```ini
   DEFAULT_APP_ID=default-app
   DEFAULT_APP_KEY=default-key
   DEFAULT_APP_SECRET=my-secret-key-12345
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start local dev servers (Cloudflare Worker + Vite with instant HMR):**
   ```bash
   pnpm dev
   ```
   - Open `http://localhost:5173` in your browser for the Web Dashboard with instant Vite Hot Module Replacement (HMR).
   - Worker API & WebSocket backend run on `http://localhost:8787`.

5. **Run automated unit & crypto tests:**
   ```bash
   pnpm test
   ```

---

## 🌐 Deploying to Cloudflare

### 1. Authenticate with Cloudflare CLI
```bash
pnpm --filter @edgekit/api wrangler login
```

### 2. Configure Your Secret App Key
Define your production `DEFAULT_APP_SECRET` securely in Cloudflare:
```bash
pnpm --filter @edgekit/api wrangler secret put DEFAULT_APP_SECRET
```
*(Enter your secure secret key when prompted)*

### 3. Deploy to Production
```bash
pnpm deploy
```
Your serverless real-time WebSocket backend will be live in seconds! 🚀

---

## 📖 API Reference

### 1. Simplified Trigger Endpoint
Broadcasts an event to one or multiple channels without Pusher HMAC URL query formatting.

- **Method**: `POST`
- **Route**: `/api/v1/trigger`
- **Headers**:
  - `Authorization: Bearer <DEFAULT_APP_SECRET>` or `X-App-Secret: <DEFAULT_APP_SECRET>`
  - `Content-Type: application/json`
- **Body Fields (`application/json`)**:
  | Field | Type | Required | Description |
  |---|---|---|---|
  | `channel` | String | No* | Target channel (e.g. `orders`, `private-user.1`) |
  | `channels` | Array | No* | Array of multiple channel names |
  | `event` | String | **Yes** | Event name (e.g. `order-created`) |
  | `data` | Any | **Yes** | Payload object, array, or string |
  | `socket_id` | String | No | Socket ID to exclude from broadcast |
  | `app_id` | String | No | Target App ID (defaults to `DEFAULT_APP_ID`) |

*\* Either `channel` or `channels` must be provided.*

#### Example Success Response (`200 OK`):
```json
{
  "success": true,
  "delivered_to": 3,
  "channels": ["orders"],
  "event": "order-created"
}
```

---

### 2. Official Pusher REST API Endpoint
Compatible with official Pusher backend libraries (`pusher-php-server`, `pusher-http-node`, `pusher-http-python`).

- **Method**: `POST`
- **Route**: `/apps/:app_id/events`
- **Query Parameters**: Standard Pusher HMAC authentication (`auth_key`, `auth_timestamp`, `auth_signature`, `body_md5`, `auth_version=1.0`)

---

### 3. Query Channel Statistics
Returns active channels and subscriber counts.

- **Method**: `GET`
- **Route**: `/apps/:app_id/channels`
- **Headers**: `Authorization: Bearer <DEFAULT_APP_SECRET>` or `X-App-Secret: <DEFAULT_APP_SECRET>`

#### Example Response:
```json
{
  "channels": {
    "orders": {
      "user_count": 5
    },
    "presence-lobby": {
      "user_count": 12
    }
  }
}
```

---

### 4. WebSocket Upgrade Route
Used by client libraries (`pusher-js`).

- **Method**: `GET`
- **Route**: `/app/:app_key?protocol=7&client=js&version=8.2.0`
- **Protocol**: WebSocket

---

## 📦 Ready-to-Use Snippets by Language (Copy-Paste)

Instead of requiring heavy third-party packages, copy native snippets directly into your projects:

| Language | File | Supported Frameworks & Runtimes |
| :--- | :--- | :--- |
| **TypeScript / JS** | [`snippets/events.ts`](snippets/events.ts) | Next.js (App Router / Server Actions), Remix, Astro, Node 18+, Bun |
| **Python** | [`snippets/events.py`](snippets/events.py) | FastAPI, Django, Flask, Celery |
| **PHP** | [`snippets/Events.php`](snippets/Events.php) | Laravel, Symfony, WordPress, PHP 8+ native / cPanel |
| **Go** | [`snippets/events.go`](snippets/events.go) | Gin, Fiber, Chi, Go Standard Library |
| **C# (.NET)** | [`snippets/EdgeKitEvents.cs`](snippets/EdgeKitEvents.cs) | ASP.NET Core, Blazor, .NET 6/7/8+ native |
| **Java** | [`snippets/EdgeKitEvents.java`](snippets/EdgeKitEvents.java) | Spring Boot, Quarkus, Micronaut, Java 17+ native |
| **Rust** | [`snippets/events.rs`](snippets/events.rs) | Axum, Actix-web, Tauri, Tokio |
| **HTTP / cURL** | [`docs/integrations.md`](docs/integrations.md) | Shell, Postman, Webhooks, Scripts |

> 📖 **Full Integration Guide**: Check [`docs/integrations.md`](docs/integrations.md) for step-by-step tutorials with examples in Next.js, FastAPI, Laravel, ASP.NET Core, Spring Boot, Axum, and Go.

---

### Quick Example in TypeScript / Next.js

```typescript
// lib/events.ts (or copy from snippets/events.ts)
import { createEventsClient } from '@/lib/events';

const events = createEventsClient({
  host: process.env.EDGEKIT_EVENTS_HOST!, // "realtime.yourdomain.com"
  appKey: process.env.EDGEKIT_EVENTS_KEY!,
  appSecret: process.env.EDGEKIT_EVENTS_SECRET!,
});

// 1. Broadcast an event to subscribers
await events.trigger({
  channel: 'orders',
  event: 'new-order',
  data: { orderId: 1042, total: 249.90 },
});

// 2. Authorize private or presence channel in /api/pusher/auth
const auth = await events.authorizeChannel(socketId, channel, {
  user_id: user.id,
  user_info: { name: user.name },
});
```

### Quick Example in cURL

```bash
curl -X POST "https://realtime.yourdomain.com/api/v1/trigger" \
  -H "Authorization: Bearer your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "orders",
    "event": "new-order",
    "data": { "id": 1042, "status": "paid" }
  }'
```

---

## ⚙️ Environment Variables & Configuration

| Variable | Type | Default | Description |
|---|---|---|---|
| `DEFAULT_APP_ID` | String | `"default-app"` | Default application identifier |
| `DEFAULT_APP_KEY` | String | `"default-key"` | Public application key used by frontend `pusher-js` clients |
| `DEFAULT_APP_SECRET` | Secret | *Required* | Master secret key for triggering events and validating HMAC signatures |
| `APPS_CONFIG` | String | `""` | Optional JSON string defining multi-tenant applications |
| `ALLOWED_ORIGINS` | String | `""` | Comma-separated CORS allowed origins (empty allows all origins) |

---

## 🧪 Automated Tests

The repository includes automated test suites covering MD5 hashing, HMAC-SHA256 signatures, socket ID generation, private/presence channel authorizations, and HTTP Bearer validation:

```bash
pnpm test
```

---

## 📄 License

This project is open-source licensed under the [MIT License](LICENSE).
