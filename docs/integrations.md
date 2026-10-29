# 🔌 Multi-Language Integration Guide — Edgekit Events

<p align="left">
  <b>🇺🇸 English</b> •
  <a href="integrations.pt-BR.md">🇧🇷 Português (Brasil)</a>
</p>

**Edgekit Events** is an open-source, serverless, and self-hosted alternative to Pusher, Soketi, and Ably built on **Cloudflare Workers** and **Durable Objects**. It implements the **Pusher Channels Protocol v7**, allowing you to use official Pusher client SDKs (`pusher-js`) on the frontend, while broadcasting real-time events from any backend via simple REST calls with **zero idle costs** (WebSocket Hibernation).

---

## 📑 Table of Contents
- [📡 API & Protocol Overview](#-api--protocol-overview)
- [🔒 Channel Types & Authentication Mechanics](#-channel-types--authentication-mechanics)
- [1. TypeScript & Next.js (App Router / Server Actions)](#1-typescript--nextjs-app-router--server-actions)
- [2. Python (FastAPI / Django / Flask)](#2-python-fastapi--django--flask)
- [3. PHP & Laravel](#3-php--laravel)
- [4. Go (Golang)](#4-go-golang)
- [5. C# (.NET 8+ / ASP.NET Core)](#5-c-net-8--aspnet-core)
- [6. Java (Spring Boot / Java 17+)](#6-java-spring-boot--java-17)
- [7. Rust (Axum / Actix-web)](#7-rust-axum--actix-web)
- [8. cURL & Terminal CLI](#8-curl--terminal-cli)
- [🌐 Frontend Integration (pusher-js)](#-frontend-integration-pusher-js)
- [🏢 Multi-Tenant Setup (APPS_CONFIG)](#-multi-tenant-setup-apps_config)
- [🛡️ Security Best Practices](#️-security-best-practices)

---

## 📡 API & Protocol Overview

Edgekit Events exposes both simplified REST endpoints and standard Pusher HTTP & WebSocket endpoints:

| Endpoint | Method | Purpose | Authentication |
| :--- | :---: | :--- | :--- |
| `/api/v1/trigger` | `POST` | Simplified REST event broadcast | `Authorization: Bearer <secret>` or `X-App-Secret` |
| `/apps/:app_id/events` | `POST` | Official Pusher REST event trigger | Pusher HMAC query params (`auth_signature`) |
| `/apps/:app_id/channels` | `GET` | Query active occupied channels & stats | `Authorization: Bearer <secret>` or Pusher HMAC |
| `/app/:app_key` | `GET` | Pusher WebSocket upgrade & connection | Public client connection (`protocol=7`) |
| `/health` | `GET` | Worker health status | None |
| `/api/info` | `GET` | Application runtime information | None |

---

## 🔒 Channel Types & Authentication Mechanics

### 1. Public Channels (`orders`, `notifications`)
- Any client can subscribe without server authorization.
- Example: `pusher.subscribe('orders')`.

### 2. Private Channels (`private-user.12`)
- Requires backend authorization via HMAC-SHA256.
- The browser calls your backend auth endpoint (e.g. `/api/pusher/auth`) sending `socket_id` and `channel_name`.
- String to sign: `"{socket_id}:{channel_name}"`
- Signature: `HMAC-SHA256(secret, string_to_sign)`
- Response: `{"auth": "{app_key}:{signature_hex}"}`

### 3. Presence Channels (`presence-room.42`)
- Tracks online members and emits `pusher_internal:member_added` / `pusher_internal:member_removed`.
- String to sign: `"{socket_id}:{channel_name}:{channel_data_json}"`
- Response: `{"auth": "{app_key}:{signature_hex}", "channel_data": "{...}"}`

---

## 1. TypeScript & Next.js (App Router / Server Actions)

Use the zero-dependency snippet [`snippets/events.ts`](../snippets/events.ts). Copy it to `lib/events.ts`.

### Triggering Events from Server Actions / API Routes:

```typescript
// app/actions/orders.ts
'use server';

import { createEventsClient } from '@/lib/events';

const events = createEventsClient({
  host: process.env.EDGEKIT_EVENTS_HOST!, // e.g. "realtime.yourdomain.com"
  appKey: process.env.EDGEKIT_EVENTS_KEY!,
  appSecret: process.env.EDGEKIT_EVENTS_SECRET!,
  appId: process.env.EDGEKIT_EVENTS_APP_ID || 'default-app',
});

export async function createOrder(orderData: { id: string; customer: string; total: number }) {
  // Save order to database...

  // Broadcast in real-time to connected browsers
  await events.trigger({
    channel: 'orders',
    event: 'order-created',
    data: orderData,
  });

  return { success: true };
}
```

### Channel Authorization Route Handler (`/api/pusher/auth`):

```typescript
// app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createEventsClient } from '@/lib/events';

const events = createEventsClient({
  host: process.env.EDGEKIT_EVENTS_HOST!,
  appKey: process.env.EDGEKIT_EVENTS_KEY!,
  appSecret: process.env.EDGEKIT_EVENTS_SECRET!,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const socketId = formData.get('socket_id') as string;
  const channel = formData.get('channel_name') as string;

  // Validate user session (e.g. NextAuth, Clerk, custom session)
  const sessionUser = { id: 'usr_123', name: 'Alice' };
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Authorize private or presence channel
  const authResponse = await events.authorizeChannel(socketId, channel, {
    user_id: sessionUser.id,
    user_info: { name: sessionUser.name },
  });

  return NextResponse.json(authResponse);
}
```

---

## 2. Python (FastAPI / Django / Flask)

Use the snippet [`snippets/events.py`](../snippets/events.py). Copy it to `app/services/events.py`.

### FastAPI Example:

```python
# app/main.py
from fastapi import FastAPI, Form, HTTPException, Depends
from app.services.events import EdgeKitEvents
import os

app = FastAPI()

events = EdgeKitEvents(
    host=os.getenv("EDGEKIT_EVENTS_HOST", "realtime.yourdomain.com"),
    app_key=os.getenv("EDGEKIT_EVENTS_KEY", "your-app-key"),
    app_secret=os.getenv("EDGEKIT_EVENTS_SECRET", "your-app-secret"),
    app_id=os.getenv("EDGEKIT_EVENTS_APP_ID", "default-app"),
)

@app.post("/api/orders")
def place_order(order_id: int, total: float):
    # Process order...
    
    # Broadcast event
    events.trigger(
        channel="orders",
        event="order-created",
        data={"order_id": order_id, "total": total}
    )
    return {"status": "broadcasted"}

@app.post("/api/pusher/auth")
def pusher_auth(socket_id: str = Form(...), channel_name: str = Form(...)):
    # Validate session/user
    user = {"id": "user_42", "name": "Carlos"}
    
    auth_data = events.authorize_channel(
        socket_id=socket_id,
        channel=channel_name,
        channel_data={"user_id": user["id"], "user_info": {"name": user["name"]}}
    )
    return auth_data
```

---

## 3. PHP & Laravel

Use the zero-dependency snippet [`snippets/Events.php`](../snippets/Events.php). Copy to `app/Services/EdgeKitEvents.php`.

### Pure PHP / Shared Hosting (cPanel):

```php
<?php
require_once __DIR__ . '/app/Services/EdgeKitEvents.php';

$events = new \App\Services\EdgeKitEvents(
    'realtime.yourdomain.com',
    'your-app-key',
    'your-app-secret'
);

// Trigger an event with native cURL in 1 line:
$result = $events->trigger('orders', 'order-created', [
    'order_id' => 1054,
    'total'    => 249.90,
    'customer' => 'Maria Silva'
]);

echo json_encode($result);
```

### Laravel Configuration (`config/broadcasting.php`):

You can use the native Laravel Pusher driver with official `pusher/pusher-php-server`:

```php
// config/broadcasting.php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'host' => env('PUSHER_HOST', 'realtime.yourdomain.com'),
        'port' => env('PUSHER_PORT', 443),
        'scheme' => 'https',
        'useTLS' => true,
    ],
],
```

---

## 4. Go (Golang)

Use the zero-dependency snippet [`snippets/events.go`](../snippets/events.go). Copy to `pkg/events/edgekit.go`.

### Go HTTP Server Example:

```go
package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"

	"myapp/pkg/events"
)

func main() {
	client := edgekit.NewClient(edgekit.Config{
		Host:      os.Getenv("EDGEKIT_EVENTS_HOST"),
		AppKey:    os.Getenv("EDGEKIT_EVENTS_KEY"),
		AppSecret: os.Getenv("EDGEKIT_EVENTS_SECRET"),
	})

	http.HandleFunc("/api/notify", func(w http.ResponseWriter, r *http.Request) {
		res, err := client.Trigger(context.Background(), edgekit.TriggerOptions{
			Channel: "alerts",
			Event:   "system-alert",
			Data:    map[string]any{"level": "warning", "msg": "CPU high"},
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(res)
	})

	http.ListenAndServe(":8080", nil)
}
```

---

## 5. C# (.NET 8+ / ASP.NET Core)

Use the zero-dependency snippet [`snippets/EdgeKitEvents.cs`](../snippets/EdgeKitEvents.cs). Copy to `Services/EdgeKitEventsClient.cs`.

### ASP.NET Core Minimal API Example:

```csharp
using EdgeKit.Events;

var builder = WebApplication.CreateBuilder(args);

// Register Edgekit Events client in DI
builder.Services.AddSingleton(new EdgeKitEventsClient(
    host: builder.Configuration["EdgeKit:Host"]!,
    appKey: builder.Configuration["EdgeKit:AppKey"]!,
    appSecret: builder.Configuration["EdgeKit:AppSecret"]!
));

var app = builder.Build();

app.MapPost("/api/orders", async (OrderDto order, EdgeKitEventsClient events) =>
{
    await events.TriggerAsync("orders", "order-created", order);
    return Results.Ok(new { success = true });
});

app.MapPost("/api/pusher/auth", (HttpRequest req, EdgeKitEventsClient events) =>
{
    var socketId = req.Form["socket_id"];
    var channel = req.Form["channel_name"];
    
    var authResult = events.AuthorizeChannel(socketId, channel, new { user_id = "u1" });
    return Results.Ok(authResult);
});

app.Run();

record OrderDto(int OrderId, decimal Total);
```

---

## 6. Java (Spring Boot / Java 17+)

Use the zero-dependency snippet [`snippets/EdgeKitEvents.java`](../snippets/EdgeKitEvents.java). Copy to `src/main/java/edgekit/events/EdgeKitEvents.java`.

### Spring Boot Controller Example:

```java
package com.example.demo;

import edgekit.events.EdgeKitEvents;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class EventsController {

    private final EdgeKitEvents events;

    public EventsController(
            @Value("${edgekit.host}") String host,
            @Value("${edgekit.key}") String key,
            @Value("${edgekit.secret}") String secret) {
        this.events = new EdgeKitEvents(host, key, secret);
    }

    @PostMapping("/send-alert")
    public ResponseEntity<String> sendAlert(@RequestParam String message) throws Exception {
        String result = events.trigger("alerts", "new-alert", "{\"message\":\"" + message + "\"}", null);
        return ResponseEntity.ok(result);
    }
}
```

---

## 7. Rust (Axum / Actix-web)

Use the snippet [`snippets/events.rs`](../snippets/events.rs). Copy to `src/events.rs`.

### Axum Example:

```rust
use axum::{extract::State, response::Json, routing::post, Router};
use std::sync::Arc;

mod events;
use events::EdgeKitEvents;

#[tokio::main]
async fn main() {
    let client = Arc::new(EdgeKitEvents::new(
        "realtime.yourdomain.com",
        "your-app-key",
        "your-app-secret",
    ));

    let app = Router::new()
        .route("/api/broadcast", post(broadcast_handler))
        .with_state(client);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn broadcast_handler(
    State(events): State<Arc<EdgeKitEvents>>,
) -> Result<Json<serde_json::Value>, String> {
    let payload = serde_json::json!({ "status": "shipped", "tracking": "BR12345" });
    let res = events
        .trigger(&["orders"], "order-status", &payload, None)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(serde_json::json!(res)))
}
```

---

## 8. cURL & Terminal CLI

### Simplified Trigger (`POST /api/v1/trigger`):

```bash
curl -X POST "https://realtime.yourdomain.com/api/v1/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-app-secret" \
  -d '{
    "channel": "orders",
    "event": "order-created",
    "data": {
      "order_id": 1054,
      "total": 249.90,
      "customer": "Maria Silva"
    }
  }'
```

---

## 🌐 Frontend Integration (pusher-js)

Because Edgekit Events adheres to the Pusher Channels Protocol v7, you connect directly using the official `pusher-js` library:

```html
<script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
<script>
  const pusher = new Pusher("your-app-key", {
    wsHost: "realtime.yourdomain.com",
    httpHost: "realtime.yourdomain.com",
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/pusher/auth" // for private/presence channels
  });

  // 1. Subscribe to public channel
  const channel = pusher.subscribe("orders");
  channel.bind("order-created", function(data) {
    console.log("New order received:", data);
  });

  // 2. Subscribe to presence channel
  const room = pusher.subscribe("presence-meeting.1");
  room.bind("pusher:subscription_succeeded", function(members) {
    console.log("Online members count:", members.count);
  });
  room.bind("pusher:member_added", function(member) {
    console.log("Member joined:", member.info);
  });
  room.bind("pusher:member_removed", function(member) {
    console.log("Member left:", member.info);
  });
</script>
```

---

## 🏢 Multi-Tenant Setup (APPS_CONFIG)

To host multiple distinct client applications on a single Cloudflare Worker instance, configure `APPS_CONFIG` in `wrangler.jsonc`:

```jsonc
"vars": {
  "APPS_CONFIG": "[{\"id\":\"tenant-store1\",\"key\":\"key1\",\"secret\":\"sec1\"},{\"id\":\"tenant-store2\",\"key\":\"key2\",\"secret\":\"sec2\"}]"
}
```

Each app gets its own isolated Cloudflare Durable Object room, guaranteeing state and connection partitioning.

---

## 🛡️ Security Best Practices

1. **Never expose `DEFAULT_APP_SECRET` on the client-side/frontend.** Only the public `DEFAULT_APP_KEY` belongs in browser JavaScript.
2. **Always authenticate private and presence subscriptions** via your backend auth route.
3. **Keep `socket_id` exclusion enabled** (`socket_id: req.socket_id`) when broadcasting from a client action so the sender doesn't receive a duplicate copy of their own action.
