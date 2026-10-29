# 📡 Cloudflare Realtime (Serverless Pusher Clone)

> Um clone do Pusher open-source, auto-hospedável e 100% serverless construído sobre **Cloudflare Workers**, **Durable Objects (com WebSocket Hibernation)** e **Hono**.

Ideal para desenvolvedores que mantêm aplicações em **hospedagens compartilhadas (PHP / cPanel / Apache / Nginx)** ou arquiteturas Jamstack/Serverless e precisam entregar atualizações em tempo real (notificações, chat, feeds, dashboards) para os usuários sem pagar planos caros do Pusher/Ably e sem ter que configurar e manter VPS com Docker, Redis ou Socket.io.

---

## ⚡ Por que usar este template?

- **Zero Servidores Dedicados**: Não precisa de VPS, Docker, Redis ou processos em segundo plano (`systemd`/`supervisord`).
- **Compatível com o SDK do Pusher (v7)**: Seus frontends continuam usando `pusher-js` ou `laravel-echo`, e seu backend pode usar o SDK oficial do Pusher (`pusher-http-php`, `pusher-http-node`, etc.).
- **API REST Simplificada para PHP Compartilhado**: Dispare eventos com 5 linhas de PHP puro via cURL ou `file_get_contents`, sem necessidade de Composer ou extensões complexas.
- **WebSocket Hibernation API**: Quando os usuários estão conectados mas sem mensagens trafegando, a Cloudflare descarrega a memória do Durable Object. **Conexões ociosas têm custo zero de CPU!**
- **Econômico e Escalável**:
  - Funciona no **Plano Gratuito** da Cloudflare (100.000 requisições/dia).
  - No plano pago ($5/mês dos Workers), suporta milhões de mensagens a uma fração mínima do custo de planos comerciais como Pusher ($49 a $499/mês).

---

## 🏗️ Como Funciona a Arquitetura

```
  [ Sua Aplicação (PHP Compartilhado / Laravel / Node) ]
                          │
            HTTP POST (cURL ou Pusher SDK)
                          ▼
             [ Cloudflare Worker (Hono) ]
                          │
              RPC interno para Durable Object
                          ▼
          [ Durable Object (AppSessionDO) ]
           • Hibernated WebSockets (Zero CPU Idle)
           • Tag-based Broadcasting
           • Canais Públicos, Privados e Presença
                          │
          Broadcast via WebSockets em tempo real
                          ▼
            [ Navegadores dos Usuários ]
           (pusher-js / Laravel Echo / WebSockets)
```

---

## 🚀 Como Fazer o Deploy em 3 Minutos

### 1. Clonar e Instalar Dependências

```bash
git clone https://github.com/seu-usuario/cloudflare-realtime.git
cd cloudflare-realtime
npm install
```

### 2. Configurar as Credenciais da sua Aplicação

Abra o arquivo [`wrangler.jsonc`](file:///c:/Users/Win/Documents/GitHub/cloudflare-realtime/wrangler.jsonc) e altere as chaves padrão da sua aplicação:

```jsonc
"vars": {
  "DEFAULT_APP_ID": "meu-app-id",
  "DEFAULT_APP_KEY": "minha-chave-publica",
  "DEFAULT_APP_SECRET": "meu-segredo-privado"
}
```

> **Dica de Segurança em Produção:** Você pode manter o `DEFAULT_APP_SECRET` como segredo criptografado na Cloudflare executando:
> ```bash
> npx wrangler secret put DEFAULT_APP_SECRET
> ```

### 3. Testar Localmente

```bash
npm run dev
```

O servidor local iniciará em `http://localhost:8787`. Você pode abrir o arquivo de teste interativo [`examples/frontend-client/index.html`](file:///c:/Users/Win/Documents/GitHub/cloudflare-realtime/examples/frontend-client/index.html) no navegador para testar a conexão e o disparo instantaneamente!

### 4. Publicar na Cloudflare (Deploy)

Faça login na sua conta Cloudflare e envie:

```bash
npx wrangler login
npm run deploy
```

Você receberá uma URL no formato: `https://cloudflare-realtime.<seu-subdominio>.workers.dev`.

---

## 💻 Como Conectar no Frontend

### Com `pusher-js` oficial (CDN ou NPM)

```html
<script src="https://js.pusher.com/8.2.0/pusher.min.js"></script>
<script>
  const pusher = new Pusher("minha-chave-publica", {
    wsHost: "cloudflare-realtime.<seu-subdominio>.workers.dev",
    httpHost: "cloudflare-realtime.<seu-subdominio>.workers.dev",
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"]
  });

  // Assinar um canal
  const channel = pusher.subscribe("pedidos");

  // Escutar um evento
  channel.bind("novo-pedido", function(data) {
    console.log("Novo pedido recebido!", data);
    alert(`Novo pedido de R$ ${data.valor_total}!`);
  });
</script>
```

---

## 🐘 Como Disparar Eventos no Backend (PHP)

### Opção 1: PHP Puro com cURL (Hospedagem Compartilhada / cPanel)

Ideal para quem **não usa Composer** ou está em hospedagem simples:

```php
<?php
$workerUrl = 'https://cloudflare-realtime.<seu-subdominio>.workers.dev/api/v1/trigger';
$appSecret = 'meu-segredo-privado';

$payload = [
    'channel' => 'pedidos',
    'event'   => 'novo-pedido',
    'data'    => [
        'pedido_id'   => 1234,
        'valor_total' => 199.90,
        'cliente'     => 'João Silva'
    ]
];

$ch = curl_init($workerUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $appSecret
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;
```

### Opção 2: PHP com o SDK Oficial do Pusher (`pusher/pusher-php-server`)

Se o seu projeto já usa a biblioteca oficial do Pusher:

```bash
composer require pusher/pusher-php-server
```

```php
<?php
require __DIR__ . '/vendor/autoload.php';

$pusher = new Pusher\Pusher(
    'minha-chave-publica',
    'meu-segredo-privado',
    'meu-app-id',
    [
        'host'    => 'cloudflare-realtime.<seu-subdominio>.workers.dev',
        'port'    => 443,
        'scheme'  => 'https',
        'useTLS'  => true,
        'timeout' => 5
    ]
);

$pusher->trigger('pedidos', 'novo-pedido', [
    'pedido_id' => 1234,
    'status'    => 'pago'
]);
```

### Opção 3: Laravel + Laravel Echo

Consulte o arquivo de exemplo completo em [`examples/laravel/broadcasting.php`](file:///c:/Users/Win/Documents/GitHub/cloudflare-realtime/examples/laravel/broadcasting.php).

---

## 🔒 Tipos de Canais Suportados

| Tipo | Prefixo | Descrição |
| :--- | :--- | :--- |
| **Público** | Ex: `noticias`, `pedidos` | Aberto para qualquer cliente assinar sem validação. |
| **Privado** | `private-*` (ex: `private-usuario.10`) | Exige assinatura HMAC SHA-256 gerada pelo seu backend para autorizar. |
| **Presença** | `presence-*` (ex: `presence-sala.42`) | Rastreia quem está online na sala, emitindo `pusher_internal:member_added` e `pusher_internal:member_removed` automaticamente. |

---

## 🏢 Suporte a Múltiplas Aplicações (Multi-Tenant)

Se você quiser usar o mesmo Worker para múltiplos clientes ou projetos diferentes, basta configurar a variável `APPS_CONFIG` com um array JSON no `wrangler.jsonc` ou Cloudflare Dashboard:

```json
[
  { "id": "loja-a", "key": "key-loja-a", "secret": "sec-loja-a" },
  { "id": "loja-b", "key": "key-loja-b", "secret": "sec-loja-b" }
]
```

Cada aplicação terá seu próprio Durable Object isolado na borda.

---

## 🧪 Testes e Qualidade

O projeto possui suíte de testes automatizados para validação de algoritmos de assinatura (HMAC SHA-256, MD5 do corpo, autorização de canais e tokens simples):

```bash
# Executa testes unitários
npm test

# Executa verificação de tipos TypeScript
npm run typecheck
```

---

## 📄 Licença

Distribuído sob a licença **MIT**. Sinta-se livre para usar em projetos comerciais, pessoais ou contribuir com melhorias!
