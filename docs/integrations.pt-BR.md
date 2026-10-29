# 🔌 Guia de Integração Multi-Linguagem — Edgekit Events

<p align="left">
  <b>🇧🇷 Português (Brasil)</b> •
  <a href="integrations.md">🇺🇸 English</a>
</p>

O **Edgekit Events** é uma alternativa open-source, serverless e self-hosted ao Pusher, Soketi e Ably, construída com **Cloudflare Workers** e **Durable Objects**. O projeto implementa o **Protocolo Pusher Channels v7**, permitindo que você utilize a biblioteca oficial de frontend (`pusher-js`), enquanto dispara eventos em tempo real a partir de qualquer backend com requisições REST simples e **custo zero em repouso** (Hibernação de WebSockets).

---

## 📑 Índice
- [📡 Visão Geral da API & Protocolo](#-visão-geral-da-api--protocolo)
- [🔒 Tipos de Canais & Autenticação HMAC](#-tipos-de-canais--autenticação-hmac)
- [1. TypeScript & Next.js (App Router / Server Actions)](#1-typescript--nextjs-app-router--server-actions)
- [2. Python (FastAPI / Django / Flask)](#2-python-fastapi--django--flask)
- [3. PHP & Laravel](#3-php--laravel)
- [4. Go (Golang)](#4-go-golang)
- [5. C# (.NET 8+ / ASP.NET Core)](#5-c-net-8--aspnet-core)
- [6. Java (Spring Boot / Java 17+)](#6-java-spring-boot--java-17)
- [7. Rust (Axum / Actix-web)](#7-rust-axum--actix-web)
- [8. cURL & Terminal CLI](#8-curl--terminal-cli)
- [🌐 Conexão no Frontend (pusher-js)](#-conexão-no-frontend-pusher-js)
- [🏢 Configuração Multi-Tenant (APPS_CONFIG)](#-configuração-multi-tenant-apps_config)
- [🛡️ Melhores Práticas de Segurança](#️-melhores-práticas-de-segurança)

---

## 📡 Visão Geral da API & Protocolo

O Edgekit Events disponibiliza rotas simplificadas para microserviços e rotas oficiais compatíveis com o ecossistema Pusher:

| Endpoint | Método | Finalidade | Autenticação |
| :--- | :---: | :--- | :--- |
| `/api/v1/trigger` | `POST` | Disparo simplificado de eventos REST | `Authorization: Bearer <secret>` ou `X-App-Secret` |
| `/apps/:app_id/events` | `POST` | Rota oficial Pusher REST API | Query params HMAC Pusher (`auth_signature`) |
| `/apps/:app_id/channels` | `GET` | Consulta canais ativos e estatísticas | `Authorization: Bearer <secret>` ou HMAC Pusher |
| `/app/:app_key` | `GET` | Conexão e Upgrade WebSocket | Conexão pública de navegadores (`protocol=7`) |
| `/health` | `GET` | Estado de integridade do Worker | Nenhuma |
| `/api/info` | `GET` | Metadados da aplicação em execução | Nenhuma |

---

## 🔒 Tipos de Canais & Autenticação HMAC

### 1. Canais Públicos (`pedidos`, `notificacoes`)
- Qualquer cliente pode se conectar sem autorização prévia do servidor.
- Exemplo: `pusher.subscribe('pedidos')`.

### 2. Canais Privados (`private-usuario.12`)
- Exige autorização do seu backend via assinatura criptográfica HMAC-SHA256.
- O navegador faz uma requisição para a rota de auth do seu backend (ex: `/api/pusher/auth`) enviando `socket_id` e `channel_name`.
- String assinada: `"{socket_id}:{channel_name}"`
- Assinatura: `HMAC-SHA256(secret, string_assinada)`
- Resposta esperada: `{"auth": "{app_key}:{assinatura_hex}"}`

### 3. Canais de Presença (`presence-sala.42`)
- Monitora quem está online na sala e dispara eventos automáticos `pusher_internal:member_added` e `pusher_internal:member_removed`.
- String assinada: `"{socket_id}:{channel_name}:{channel_data_json}"`
- Resposta esperada: `{"auth": "{app_key}:{assinatura_hex}", "channel_data": "{...}"}`

---

## 1. TypeScript & Next.js (App Router / Server Actions)

Utilize o snippet zero-dependências [`snippets/events.ts`](../snippets/events.ts). Copie o arquivo para `lib/events.ts`.

### Disparo de Eventos em Server Actions / Rotas de API:

```typescript
// app/actions/pedidos.ts
'use server';

import { createEventsClient } from '@/lib/events';

const events = createEventsClient({
  host: process.env.EDGEKIT_EVENTS_HOST!, // ex: "realtime.seusite.com"
  appKey: process.env.EDGEKIT_EVENTS_KEY!,
  appSecret: process.env.EDGEKIT_EVENTS_SECRET!,
  appId: process.env.EDGEKIT_EVENTS_APP_ID || 'default-app',
});

export async function criarPedido(pedido: { id: string; cliente: string; total: number }) {
  // Salvar pedido no banco de dados...

  // Notificar clientes conectados em tempo real
  await events.trigger({
    channel: 'pedidos',
    event: 'novo-pedido',
    data: pedido,
  });

  return { sucesso: true };
}
```

### Rota de Autorização de Canais Privados (`/api/pusher/auth`):

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

  // Validar sessão do usuário logado
  const usuario = { id: 'usr_123', nome: 'Carlos' };
  if (!usuario) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // Autorizar canal privado ou de presença
  const authResponse = await events.authorizeChannel(socketId, channel, {
    user_id: usuario.id,
    user_info: { name: usuario.nome },
  });

  return NextResponse.json(authResponse);
}
```

---

## 2. Python (FastAPI / Django / Flask)

Utilize o snippet [`snippets/events.py`](../snippets/events.py). Salve em `app/services/events.py`.

### Exemplo com FastAPI:

```python
# app/main.py
from fastapi import FastAPI, Form, HTTPException
from app.services.events import EdgeKitEvents
import os

app = FastAPI()

events = EdgeKitEvents(
    host=os.getenv("EDGEKIT_EVENTS_HOST", "realtime.seusite.com"),
    app_key=os.getenv("EDGEKIT_EVENTS_KEY", "sua-chave"),
    app_secret=os.getenv("EDGEKIT_EVENTS_SECRET", "seu-segredo"),
)

@app.post("/api/pedidos")
def criar_pedido(pedido_id: int, total: float):
    # Processar compra...
    
    # Disparar evento WebSocket
    events.trigger(
        channel="pedidos",
        event="novo-pedido",
        data={"pedido_id": pedido_id, "total": total}
    )
    return {"status": "disparado"}

@app.post("/api/pusher/auth")
def autorizar_pusher(socket_id: str = Form(...), channel_name: str = Form(...)):
    # Validar usuário autenticado
    usuario = {"id": "usr_42", "nome": "Maria"}
    
    return events.authorize_channel(
        socket_id=socket_id,
        channel=channel_name,
        channel_data={"user_id": usuario["id"], "user_info": {"name": usuario["nome"]}}
    )
```

---

## 3. PHP & Laravel

Utilize o snippet nativo [`snippets/Events.php`](../snippets/Events.php). Salve em `app/Services/EdgeKitEvents.php`.

### PHP Puro / Hospedagem Compartilhada (cPanel):

```php
<?php
require_once __DIR__ . '/app/Services/EdgeKitEvents.php';

$events = new \App\Services\EdgeKitEvents(
    'realtime.seusite.com',
    'sua-chave-publica',
    'seu-segredo-privado'
);

// Disparo instantâneo com cURL nativo em 1 linha (sem Composer):
$resultado = $events->trigger('pedidos', 'novo-pedido', [
    'pedido_id' => 1054,
    'total'     => 249.90,
    'cliente'   => 'Maria Silva'
]);

echo json_encode($resultado);
```

### Configuração no Laravel (`config/broadcasting.php`):

```php
// config/broadcasting.php
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY'),
    'secret' => env('PUSHER_APP_SECRET'),
    'app_id' => env('PUSHER_APP_ID'),
    'options' => [
        'host' => env('PUSHER_HOST', 'realtime.seusite.com'),
        'port' => env('PUSHER_PORT', 443),
        'scheme' => 'https',
        'useTLS' => true,
    ],
],
```

---

## 4. Go (Golang)

Utilize o snippet [`snippets/events.go`](../snippets/events.go). Salve em `pkg/events/edgekit.go`.

### Exemplo com Servidor HTTP Padrão:

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

	http.HandleFunc("/api/alerta", func(w http.ResponseWriter, r *http.Request) {
		res, err := client.Trigger(context.Background(), edgekit.TriggerOptions{
			Channel: "alertas",
			Event:   "novo-alerta",
			Data:    map[string]any{"mensagem": "Serviço reiniciado com sucesso"},
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

Utilize o snippet [`snippets/EdgeKitEvents.cs`](../snippets/EdgeKitEvents.cs). Salve em `Services/EdgeKitEventsClient.cs`.

### Exemplo com ASP.NET Core Minimal API:

```csharp
using EdgeKit.Events;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton(new EdgeKitEventsClient(
    host: builder.Configuration["EdgeKit:Host"]!,
    appKey: builder.Configuration["EdgeKit:AppKey"]!,
    appSecret: builder.Configuration["EdgeKit:AppSecret"]!
));

var app = builder.Build();

app.MapPost("/api/pedidos", async (PedidoDto pedido, EdgeKitEventsClient events) =>
{
    await events.TriggerAsync("pedidos", "novo-pedido", pedido);
    return Results.Ok(new { sucesso = true });
});

app.MapPost("/api/pusher/auth", (HttpRequest req, EdgeKitEventsClient events) =>
{
    var socketId = req.Form["socket_id"];
    var channel = req.Form["channel_name"];
    
    var auth = events.AuthorizeChannel(socketId, channel, new { user_id = "1" });
    return Results.Ok(auth);
});

app.Run();

record PedidoDto(int PedidoId, decimal Total);
```

---

## 6. Java (Spring Boot / Java 17+)

Utilize o snippet [`snippets/EdgeKitEvents.java`](../snippets/EdgeKitEvents.java). Salve em `src/main/java/edgekit/events/EdgeKitEvents.java`.

### Exemplo com Spring Boot:

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

    @PostMapping("/disparar-alerta")
    public ResponseEntity<String> dispararAlerta(@RequestParam String texto) throws Exception {
        String res = events.trigger("alertas", "novo-alerta", "{\"msg\":\"" + texto + "\"}", null);
        return ResponseEntity.ok(res);
    }
}
```

---

## 7. Rust (Axum / Actix-web)

Utilize o snippet [`snippets/events.rs`](../snippets/events.rs). Salve em `src/events.rs`.

### Exemplo com Axum:

```rust
use axum::{extract::State, response::Json, routing::post, Router};
use std::sync::Arc;

mod events;
use events::EdgeKitEvents;

#[tokio::main]
async fn main() {
    let client = Arc::new(EdgeKitEvents::new(
        "realtime.seusite.com",
        "sua-chave",
        "seu-segredo",
    ));

    let app = Router::new()
        .route("/api/notificar", post(notificar_handler))
        .with_state(client);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn notificar_handler(
    State(events): State<Arc<EdgeKitEvents>>,
) -> Result<Json<serde_json::Value>, String> {
    let payload = serde_json::json!({ "status": "entregue", "id": 1054 });
    let res = events
        .trigger(&["pedidos"], "pedido-atualizado", &payload, None)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(serde_json::json!(res)))
}
```

---

## 8. cURL & Terminal CLI

### Disparo REST Simples (`POST /api/v1/trigger`):

```bash
curl -X POST "https://realtime.seusite.com/api/v1/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer seu-segredo-privado" \
  -d '{
    "channel": "pedidos",
    "event": "novo-pedido",
    "data": {
      "pedido_id": 1054,
      "valor_total": 249.90,
      "cliente": "Maria Silva"
    }
  }'
```

---

## 🌐 Conexão no Frontend (pusher-js)

Como o Edgekit Events segue estritamente o protocolo v7 do Pusher, você pode conectar via CDN ou NPM:

```html
<script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
<script>
  const pusher = new Pusher("minha-chave-publica", {
    wsHost: "realtime.seusite.com",
    httpHost: "realtime.seusite.com",
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/pusher/auth" // para canais privados e presença
  });

  // 1. Assinar canal público
  const canal = pusher.subscribe("pedidos");
  canal.bind("novo-pedido", function(dados) {
    console.log("Pedido recebido ao vivo:", dados);
  });

  // 2. Assinar canal de presença
  const sala = pusher.subscribe("presence-sala.1");
  sala.bind("pusher:subscription_succeeded", function(membros) {
    console.log("Membros online:", membros.count);
  });
  sala.bind("pusher:member_added", function(membro) {
    console.log("Novo membro conectado:", membro.info);
  });
  sala.bind("pusher:member_removed", function(membro) {
    console.log("Membro desconectado:", membro.info);
  });
</script>
```

---

## 🏢 Configuração Multi-Tenant (APPS_CONFIG)

Para isolar múltiplos projetos ou lojas no mesmo Worker, configure a variável `APPS_CONFIG` no `wrangler.jsonc`:

```jsonc
"vars": {
  "APPS_CONFIG": "[{\"id\":\"loja-1\",\"key\":\"key1\",\"secret\":\"sec1\"},{\"id\":\"loja-2\",\"key\":\"key2\",\"secret\":\"sec2\"}]"
}
```

Cada aplicativo terá sua própria instância dedicada e isolada de Durable Object.

---

## 🛡️ Melhores Práticas de Segurança

1. **Nunca exponha sua `DEFAULT_APP_SECRET` no frontend.** Apenas a chave pública `DEFAULT_APP_KEY` deve estar no código JavaScript do navegador.
2. **Sempre autorize canais privados e de presença** através do seu backend com verificação de login/sessão.
3. **Passe o `socket_id` na chamada de trigger** para evitar que o próprio cliente que disparou a ação receba o eco redundante do evento.
