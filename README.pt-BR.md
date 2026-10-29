# Edgekit Events (Cloudflare Workers + Durable Objects)

<p align="left">
  <b>🇧🇷 Português (Brasil)</b> •
  <a href="README.md">🇺🇸 English</a>
</p>

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/RafaelSFDC/Edgekit-Events)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Idle Cost](https://img.shields.io/badge/Custo%20em%20Repouso-Zero%20(Hiberna%C3%A7%C3%A3o)-emerald)](#)
[![Pusher Protocol](https://img.shields.io/badge/Protocolo-Pusher%20v7-F38020)](#)

Uma **alternativa open-source, serverless e self-hosted ao Pusher, Soketi e Ably**, construída com **Hono** sobre **Cloudflare Workers** integrado a **Durable Objects** com **Hibernação de WebSockets**.

Projetado com duplo propósito:
1. **Dashboard Visual Completa Integrada**: Inspecione o fluxo ao vivo de eventos no Live Debug Console, dispare eventos de teste com o Simulador, monitore canais ativos/presença e copie snippets prontos.
2. **Microsserviço / API de Alta Performance**: Dispare eventos WebSocket a partir de qualquer backend existente (**Next.js, Node, PHP/Laravel, Python/FastAPI, Go, C#/.NET, Java/Spring ou Rust**) com snippets zero-dependency no padrão shadcn.

---

## 🚀 Destaques

- ⚡ **Deploy em 1 Clique**: Botão oficial Deploy to Cloudflare Workers ou assistente interativo via `pnpm run setup`.
- 💰 **Custo Zero em Conexões Ociosas**: A API de Hibernação de WebSockets da Cloudflare mantém milhares de conexões abertas sem consumir ciclos de CPU em repouso.
- 📡 **Compatível com o Protocolo Pusher Channels v7**: Conecte seus clientes frontend diretamente usando a biblioteca oficial `pusher-js` ou Laravel Echo sem necessidade de SDKs proprietários.
- 🔐 **Canais Privados & Presença com HMAC-SHA256**: Proteja dados confidenciais com canais privados (`private-*`) e saiba quem está online em salas de presença (`presence-*`).
- 🚀 **API REST Simplificada (Zero Dependências)**: Dispare eventos via `POST /api/v1/trigger` usando cabeçalhos simples (`Authorization: Bearer` ou `X-App-Secret`) sem cálculos manuais complexos de hash.
- 🏢 **Multi-Tenant Nativo**: Suporte a múltiplos projetos ou clientes no mesmo Worker através da variável `APPS_CONFIG` com instâncias isoladas de Durable Objects.
- 🖥️ **Dashboard Web Integrada**: Desenvolvida com **React 19 + Tailwind CSS**, servida diretamente da borda na rota raiz `/` com Live Debug Console, Simulador e Gerador de Snippets.
- 📦 **Snippets de Clientes Prontos (Zero Dependências NPM)**: Copie [`snippets/events.ts`](snippets/events.ts) para o seu projeto (`lib/events.ts`) e use TypeScript com Fetch nativo sem instalar pacotes de terceiros.

---

## 🖥️ Dashboard Web Integrada

O projeto conta com uma interface visual moderna construída em **React 19, Tailwind CSS e Lucide Icons**, servida automaticamente pelo Cloudflare Workers via **Static Assets**:

- 📡 **Live Debug Console**: Feed contínuo de eventos em tempo real com badges coloridos, filtro por categoria, busca textual e visualizador de JSON formatado com cópia em 1 clique.
- 🚀 **Simulador / Disparador de Teste**: Dispare eventos em qualquer canal diretamente pelo navegador com presets pré-configurados (Pedido E-commerce, Chat, Alerta do Sistema).
- 👥 **Explorador de Canais & Presença**: Acompanhe canais públicos, privados e de presença em tempo real com contagem de membros online.
- 📋 **Gerador de Snippets**: Código pronto e configurado para copiar em JavaScript (`pusher-js`), Laravel Echo, PHP cURL nativo, Node.js, Python e terminal cURL.
- 🌐 **Internacionalização Completa (i18n)**: Alternância em tempo real entre **Português (pt-BR)** e **Inglês (EN)**.
- 🔐 **Autenticação Segura via Cookie HttpOnly**: Autenticação com a chave secreta através de cookie seguro protegido contra vazamentos de script (XSS).

---

## 📐 Visão Geral da Arquitetura

```
[Seu Backend / Aplicação Externa]
          │
          ▼ (POST /api/v1/trigger ou POST /apps/:app_id/events)
[Worker Hono na Cloudflare]
          │
          ▼ (Encaminha para o Durable Object da aplicação)
[Cloudflare Durable Object (AppSessionDO)]
          │
          ▼ (Entrega via API de Hibernação de WebSockets)
[Navegadores / Usuários Finais (pusher-js)]
          (Custo de CPU zero enquanto conexões estiverem ociosas!)
```

---

## 🛠️ Pré-requisitos

- **Node.js** >= 18
- **pnpm** (ou npm)
- Uma conta na **Cloudflare** (o plano gratuito inclui 100.000 requisições/dia e Durable Objects).

---

## ⚡ Instalação & Desenvolvimento Local

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/RafaelSFDC/Edgekit-Events.git
   cd "Edgekit Events"
   ```

2. **Instalar dependências:**
   ```bash
   pnpm install
   ```

3. **Configurar variáveis de ambiente locais:**
   Execute o assistente de configuração automática:
   ```bash
   pnpm setup
   ```
   Ou crie manualmente o arquivo `.dev.vars`:
   ```ini
   DEFAULT_APP_ID=default-app
   DEFAULT_APP_KEY=default-key
   DEFAULT_APP_SECRET=meu-segredo-de-teste-12345
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Compilar os assets da Dashboard e iniciar o servidor local:**
   ```bash
   pnpm build:web
   pnpm dev
   ```
   Abra `http://localhost:8787` no seu navegador para acessar a Dashboard interativa!

5. **Executar testes automatizados:**
   ```bash
   pnpm test
   ```

---

## 🌐 Deploy na Cloudflare

### 1. Autenticar com o CLI da Cloudflare
```bash
pnpm wrangler login
```

### 2. Configurar a Chave Secreta em Produção
Defina a sua `DEFAULT_APP_SECRET` com segurança na Cloudflare:
```bash
pnpm wrangler secret put DEFAULT_APP_SECRET
```
*(Digite o segredo seguro quando solicitado)*

### 3. Fazer o Deploy para Produção
```bash
pnpm deploy
```
Seu servidor WebSocket serverless estará ativo globalmente em segundos! 🚀

---

## 📖 Referência da API

### 1. Disparo de Evento Simplificado (REST)
Dispara um evento para um ou múltiplos canais sem necessidade de assinaturas complexas na URL.

- **Método**: `POST`
- **Rota**: `/api/v1/trigger`
- **Headers**:
  - `Authorization: Bearer <DEFAULT_APP_SECRET>` ou `X-App-Secret: <DEFAULT_APP_SECRET>`
  - `Content-Type: application/json`
- **Campos do Corpo (`application/json`)**:
  | Campo | Tipo | Obrigatório | Descrição |
  |---|---|---|---|
  | `channel` | String | Não* | Nome do canal de destino (ex: `pedidos`, `private-user.1`) |
  | `channels` | Array | Não* | Array contendo múltiplos nomes de canais |
  | `event` | String | **Sim** | Nome do evento (ex: `novo-pedido`) |
  | `data` | Any | **Sim** | Objeto, array ou string com o conteúdo |
  | `socket_id` | String | Não | ID do socket a ser excluído do broadcast |
  | `app_id` | String | Não | ID da aplicação (padrão: `DEFAULT_APP_ID`) |

*\* É necessário fornecer `channel` ou `channels`.*

#### Exemplo de Resposta de Sucesso (`200 OK`):
```json
{
  "success": true,
  "delivered_to": 3,
  "channels": ["pedidos"],
  "event": "novo-pedido"
}
```

---

### 2. Rota Oficial Pusher REST API
Compatível com as bibliotecas oficiais do ecossistema Pusher (`pusher-php-server`, `pusher-http-node`, `pusher-http-python`).

- **Método**: `POST`
- **Rota**: `/apps/:app_id/events`
- **Parâmetros de Consulta**: Autenticação padrão HMAC do Pusher (`auth_key`, `auth_timestamp`, `auth_signature`, `body_md5`, `auth_version=1.0`)

---

### 3. Consultar Estatísticas de Canais
Retorna os canais atualmente ocupados e contagem de inscritos.

- **Método**: `GET`
- **Rota**: `/apps/:app_id/channels`
- **Headers**: `Authorization: Bearer <DEFAULT_APP_SECRET>` ou `X-App-Secret: <DEFAULT_APP_SECRET>`

#### Exemplo de Resposta:
```json
{
  "channels": {
    "pedidos": {
      "user_count": 5
    },
    "presence-sala": {
      "user_count": 12
    }
  }
}
```

---

### 4. Rota de Upgrade WebSocket
Utilizada pelas bibliotecas clientes (`pusher-js`).

- **Método**: `GET`
- **Rota**: `/app/:app_key?protocol=7&client=js&version=8.2.0`
- **Protocolo**: WebSocket

---

## 📦 Snippets Prontos por Linguagem (Copiar e Colar)

Em vez de instalar pacotes pesados de terceiros, copie snippets nativos diretamente para seus projetos:

| Linguagem | Arquivo | Frameworks & Runtimes Suportados |
| :--- | :--- | :--- |
| **TypeScript / JS** | [`snippets/events.ts`](snippets/events.ts) | Next.js (App Router / Server Actions), Remix, Astro, Node 18+, Bun |
| **Python** | [`snippets/events.py`](snippets/events.py) | FastAPI, Django, Flask, Celery |
| **PHP** | [`snippets/Events.php`](snippets/Events.php) | Laravel, Symfony, WordPress, PHP 8+ nativo / cPanel |
| **Go** | [`snippets/events.go`](snippets/events.go) | Gin, Fiber, Chi, Biblioteca Padrão Go |
| **C# (.NET)** | [`snippets/EdgeKitEvents.cs`](snippets/EdgeKitEvents.cs) | ASP.NET Core, Blazor, .NET 6/7/8+ nativo |
| **Java** | [`snippets/EdgeKitEvents.java`](snippets/EdgeKitEvents.java) | Spring Boot, Quarkus, Micronaut, Java 17+ nativo |
| **Rust** | [`snippets/events.rs`](snippets/events.rs) | Axum, Actix-web, Tauri, Tokio |
| **HTTP / cURL** | [`docs/integrations.pt-BR.md`](docs/integrations.pt-BR.md) | Shell, Postman, Webhooks, Scripts |

> 📖 **Guia Completo de Integração**: Consulte [`docs/integrations.pt-BR.md`](docs/integrations.pt-BR.md) para tutoriais passo a passo com exemplos em Next.js, FastAPI, Laravel, ASP.NET Core, Spring Boot, Axum e Go.

---

### Exemplo Rápido em TypeScript / Next.js

```typescript
// lib/events.ts (ou copie de snippets/events.ts)
import { createEventsClient } from '@/lib/events';

const events = createEventsClient({
  host: process.env.EDGEKIT_EVENTS_HOST!, // "realtime.seusite.com"
  appKey: process.env.EDGEKIT_EVENTS_KEY!,
  appSecret: process.env.EDGEKIT_EVENTS_SECRET!,
});

// 1. Disparar evento para assinantes
await events.trigger({
  channel: 'pedidos',
  event: 'novo-pedido',
  data: { pedidoId: 1042, total: 249.90 },
});

// 2. Autorizar canal privado ou presença em /api/pusher/auth
const auth = await events.authorizeChannel(socketId, canal, {
  user_id: usuario.id,
  user_info: { name: usuario.nome },
});
```

### Exemplo Rápido com cURL

```bash
curl -X POST "https://realtime.seusite.com/api/v1/trigger" \
  -H "Authorization: Bearer seu-segredo-privado" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "pedidos",
    "event": "novo-pedido",
    "data": { "id": 1042, "status": "pago" }
  }'
```

---

## ⚙️ Variáveis de Ambiente & Configuração

| Variável | Tipo | Padrão | Descrição |
|---|---|---|---|
| `DEFAULT_APP_ID` | String | `"default-app"` | Identificador padrão da aplicação |
| `DEFAULT_APP_KEY` | String | `"default-key"` | Chave pública da aplicação utilizada pelo cliente frontend `pusher-js` |
| `DEFAULT_APP_SECRET` | Secret | *Obrigatório* | Chave secreta para disparo de eventos e validação de assinaturas HMAC |
| `APPS_CONFIG` | String | `""` | String JSON opcional definindo aplicações multi-tenant |
| `ALLOWED_ORIGINS` | String | `""` | Origens CORS permitidas separadas por vírgula (vazio permite todas) |

---

## 🧪 Testes Automatizados

O repositório inclui testes cobrindo hashing MD5, assinaturas HMAC-SHA256, geração de socket ID, autorização de canais privados/presença e autenticação HTTP Bearer:

```bash
pnpm test
```

---

## 📄 Licença

Este projeto é open-source licenciado sob a [Licença MIT](LICENSE).
