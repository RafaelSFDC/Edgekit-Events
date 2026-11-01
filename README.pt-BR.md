# Edgekit Events (Cloudflare Workers + Durable Objects)

<p align="left">
  <a href="README.md">🇺🇸 English</a> •
  <b>🇧🇷 Português (Brasil)</b>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Events)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Idle Cost](https://img.shields.io/badge/Idle%20Cost-Zero%20(Hibernation)-emerald)](#)
[![Multi Protocol](https://img.shields.io/badge/Protocolos-Pusher%20v7%20%7C%20Ably%20%7C%20SSE-F38020)](#)

Um **substituto universal, open-source, serverless e auto-hospedado (drop-in replacement) para Pusher, Ably e Soketi**, construído com **Hono** sobre **Cloudflare Workers** com **Durable Objects** e **Hibernação nativa de WebSockets**.

> 💡 **O Manifesto Edgekit**: Nós não somos um serviço. Não somos um SaaS. Não há faturas surpresa no fim do mês, nem cobrança por conexões ociosas ou margem em cima do seu tráfego. Tudo pertence **única e exclusivamente a você**, rodando dentro da sua própria conta da Cloudflare (aproveitando o limite gratuito generoso e zero DevOps).

---

## 📊 Comparativo de Mercado

| Recurso / Critério | **Edgekit Events** | **Pusher Channels** | **Ably Realtime** | **Soketi (Self-Hosted)** |
| :--- | :--- | :--- | :--- | :--- |
| **Modelo de Hospedagem** | **100% Seu (Cloudflare)** | SaaS Proprietário | SaaS Proprietário | Self-hosted (VPS / Docker) |
| **Custo de Ociosidade** | **Zero (Hibernação DO)** | Pago por socket conectado | Pago por mensagem/conexão | Custo contínuo de VPS/EC2 |
| **DevOps / Infraestrutura** | **Zero (Serverless Puro)** | Zero (SaaS) | Zero (SaaS) | Alto (Redis, Node, SSL, OS) |
| **Protocolo Pusher v7** | ✅ Nativo (`pusher-js`, Echo) | ✅ Nativo | ⚠️ Apenas via adaptadores | ✅ Nativo |
| **Adaptador REST Ably** | ✅ Integrado nativamente | ❌ Não | ✅ Nativo | ❌ Não |
| **Server-Sent Events (SSE)** | ✅ Sim (`/events/stream`) | ❌ Não | ⚠️ SSE limitado | ❌ Não |
| **Histórico e Replay** | ✅ Opcional (DO SQLite Buffer) | ❌ Apenas cache channel | ✅ Sim | ❌ Não |
| **Dashboard Administrativo** | ✅ Integrado na Borda (`/`) | ✅ Dashboard na nuvem | ✅ Dashboard na nuvem | ⚠️ Básico / Separado |
| **Snippets Zero-NPM** | ✅ Sim (estilo shadcn) | ❌ Exige SDK | ❌ Exige SDK | ❌ Exige SDK |

---

## 🚀 Destaques do Projeto

- ⚡ **Deploy em 1 Clique**: Botão oficial Deploy to Cloudflare Workers ou assistente interativo via `pnpm setup`.
- 💰 **Zero Custo Ocioso**: A API de Hibernação de WebSockets dos Durable Objects mantém milhares de conexões em suspensão a custo zero de CPU no Worker.
- 📡 **Multi-Protocolo Universal**:
  - **Pusher v7**: Compatibilidade direta com bibliotecas oficiais como `pusher-js` e Laravel Echo.
  - **Adaptador REST Ably**: Endpoints compatíveis para envio e consulta de histórico (`POST /channels/:id/messages`, `GET /channels/:id/messages`).
  - **Universal SSE**: Stream nativo de Server-Sent Events (`GET /events/stream?channel=...`) com suporte a reconexão automática e replay via `Last-Event-ID`.
- 🔐 **Segurança com Auth Delegada**: Funciona de forma transparente com qualquer backend (Next.js, Laravel, WordPress, FastAPI, Go). O Edgekit Events permanece 100% agnóstico e sem banco de usuários intermediário.
- 📦 **Snippets Copy-Paste Zero Dependências (Estilo shadcn)**:
  - Frontend: [`snippets/events-client.ts`](snippets/events-client.ts) (WebSocket/SSE nativo + React Hook `useEdgekitEvent`).
  - Backend: [`snippets/events.ts`](snippets/events.ts) (TypeScript / Next.js) e [`snippets/Events.php`](snippets/Events.php) (PHP / WordPress assíncrono fire-and-forget).
- 🏢 **Multi-Tenancy Flexível**: Configurado estaticamente via variáveis de ambiente/secrets por padrão (zero banco de dados necessário), com suporte opcional a Cloudflare D1 para gestão dinâmica de apps.
- 🖥️ **Tudo em um Único Deploy**: Publica o motor de realtime e o Dashboard administrativo moderno em React 19 no mesmo Worker da Cloudflare.

---

## 📐 Visão Geral da Arquitetura

```
[Seu Backend: PHP / WordPress / Next.js / Python / Go]
                        │
                        ▼ (POST /api/v1/trigger, /api/v1/batch ou /apps/:id/events)
       [Worker Hono na Borda da Cloudflare]
                        │
                        ▼ (Roteia para a instância do Durable Object)
       [Cloudflare Durable Object (AppSessionDO)]
              ├── Registro de Canais & Mapa de Presença
              ├── Buffer Circular SQLite (Histórico & Replay Opcional)
              └── Gerenciador de Hibernação de WebSockets
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
[Navegadores: pusher-js / Echo]   [Navegadores / Mobile: Stream SSE]
  (Zero custo de CPU ociosa!)        (EventSource Nativo)
```

---

## 🛠️ Instalação Rápida e Desenvolvimento Local

### 1. Clonar e Instalar
```bash
git clone https://github.com/RafaelSFDC/Edgekit-Events.git
cd "Edgekit Events"
pnpm install
```

### 2. Configurar Variáveis de Ambiente
Execute o assistente interativo:
```bash
pnpm setup
```
Ou crie manualmente o arquivo `.dev.vars`:
```ini
DEFAULT_APP_ID=default-app
DEFAULT_APP_KEY=key-default
DEFAULT_APP_SECRET=secret-default
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Iniciar Servidores de Desenvolvimento
```bash
pnpm dev
```
- Dashboard Web com HMR: `http://localhost:5173`
- Backend Worker API & WebSocket: `http://localhost:8787`

### 4. Executar Testes Automatizados
```bash
pnpm test
```

---

## 🌐 Publicação na Cloudflare (Produção)

```bash
# 1. Autenticar no CLI da Cloudflare
pnpm --filter @edgekit/api wrangler login

# 2. Configurar o secret de produção
pnpm --filter @edgekit/api wrangler secret put DEFAULT_APP_SECRET

# 3. Compilar o frontend e publicar o Worker
pnpm deploy
```

---

## 🔌 Guias Rápidos por Ecossistema

### 1. Next.js & Serverless (TypeScript)
Copie [`snippets/events.ts`](snippets/events.ts) para `lib/events.ts`:
```ts
import { createEventsClient } from "@/lib/events";

const events = createEventsClient({
  host: process.env.EDGEKIT_HOST!,
  appKey: process.env.EDGEKIT_KEY!,
  appSecret: process.env.EDGEKIT_SECRET!,
});

// Disparo único
await events.trigger({
  channel: "pedidos",
  event: "pedido.criado",
  data: { id: "ped_123", total: 89.90 },
});

// Disparo em lote (batching)
await events.triggerBatch([
  { channel: "pedidos", event: "pedido.criado", data: { id: "1" } },
  { channel: "notificacoes", event: "badge.atualizado", data: { count: 5 } },
]);
```

### 2. Hospedagem Compartilhada & WordPress (PHP)
Copie [`snippets/Events.php`](snippets/Events.php) para o seu projeto:
```php
use App\Services\EdgeKitEvents;

$events = new EdgeKitEvents(
    host: 'realtime.seudominio.com',
    appKey: 'key-default',
    appSecret: 'secret-default'
);

// Disparo não-bloqueante fire-and-forget (não atrasa o carregamento da página!)
$events->triggerAsync('pedidos', 'pedido.concluido', ['id' => 456]);
```

### 3. Frontend: React / Navegador com Zero Dependências
Copie [`snippets/events-client.ts`](snippets/events-client.ts) para o seu frontend:
```tsx
import { createEdgekitClient, useEdgekitEvent } from "@/lib/events-client";

export const client = createEdgekitClient({
  host: "realtime.seudominio.com",
  appKey: "key-default",
  transport: "ws", // ou "sse" para Server-Sent Events nativo
});

export function PedidosEmTempoReal() {
  useEdgekitEvent(client, "pedidos", "pedido.criado", (pedido) => {
    console.log("Novo pedido recebido ao vivo:", pedido);
  });

  return <div>Ouvindo eventos em tempo real...</div>;
}
```

### 4. Frontend: Bibliotecas Oficiais `pusher-js` ou Laravel Echo
Basta apontar o host para o seu Worker:
```js
import Pusher from 'pusher-js';

const pusher = new Pusher('key-default', {
  wsHost: 'realtime.seudominio.com',
  wsPort: 443,
  wssPort: 443,
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
});

const canal = pusher.subscribe('pedidos');
canal.bind('pedido.criado', (data) => console.log(data));
```

---

## 📖 Referência dos Endpoints

### 1. REST Trigger Universal
- `POST /api/v1/trigger`
- Headers: `Authorization: Bearer <SECRET>` ou `X-App-Secret: <SECRET>`
- Body:
  ```json
  {
    "channel": "pedidos",
    "event": "pedido.criado",
    "data": { "id": 10 }
  }
  ```

### 2. REST Trigger em Lote (Batch)
- `POST /api/v1/batch`
- Body:
  ```json
  {
    "batch": [
      { "channel": "pedidos", "event": "pedido.criado", "data": { "id": 1 } },
      { "channel": "chat", "event": "mensagem", "data": { "texto": "Olá" } }
    ]
  }
  ```

### 3. Server-Sent Events (SSE) Universal
- `GET /events/stream?channel=pedidos,notificacoes&key=key-default`
- Retorna um stream SSE contínuo (`text/event-stream`). Suporta header `Last-Event-ID` para replay de histórico após reconexão.

### 4. Rotas Compatíveis com Ably REST
- `POST /channels/:channel_id/messages`: Disparo de mensagem única ou em lote.
  - Auth: `Authorization: Basic base64(key:secret)` ou `X-Ably-Key: key:secret`.
- `GET /channels/:channel_id/messages`: Consulta de histórico de mensagens.
- `GET /channels`: Consulta de presença e canais ativos.
- `POST /keys/:key/requestToken`: Emissão de token de autenticação.

### 5. Rotas Compatíveis com Pusher v7
- Conexão WebSocket: `/app/:app_key`
- Disparo HTTP: `POST /apps/:app_id/events` (assinatura HMAC-SHA256 padrão)
- Consulta de Canais: `GET /apps/:app_id/channels`

---

## 📄 Licença
MIT © Rafael SFDC. Código aberto, auto-hospedado e orientado à comunidade.
