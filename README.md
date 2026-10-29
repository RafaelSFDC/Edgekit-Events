<div align="center">

# 📡 Cloudflare Realtime
### Clone Open-Source e Serverless do Pusher na Cloudflare

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20Durable%20Objects-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Framework-Hono-E36002?logo=hono)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p align="center">
  <b>Substitua Pusher, Ably e Soketi sem manter servidores dedicados (Node/Redis/Docker).</b><br/>
  Projetado para desenvolvedores com aplicações em <b>hospedagens compartilhadas (PHP / cPanel)</b> ou arquiteturas serverless que precisam disparar eventos em tempo real para o navegador com <b>custo zero em idle</b>.
</p>

</div>

---

## 🎯 Para Quem é Este Projeto?

Você tem um sistema em **PHP tradicional (cPanel, Hostinger, Locaweb, Apache/Nginx)**, Python, Ruby ou JAMstack, e precisa:
- Notificar o usuário quando um **novo pedido** for feito.
- Atualizar um **feed** ou **dashboard** em tempo real sem o usuário dar F5.
- Criar um **chat**, contador de visualizações ou alertas do sistema.

**O problema:** Hospedagens compartilhadas não conseguem manter servidores WebSocket (como Socket.io ou Swoole) rodando em background. Serviços gerenciados como Pusher ou Ably cobram planos caros que aumentam rapidamente (\$49 a \$499/mês).

**A solução:** Você sobe este repositório gratuitamente na sua conta Cloudflare em 2 minutos. Seu PHP apenas faz uma requisição HTTP simples (`curl` ou `file_get_contents`), e a Cloudflare cuida de toda a entrega WebSocket para os navegadores via **Durable Objects**.

---

## 📊 Comparativo

| Recurso | Pusher Comercial | Soketi (Self-hosted) | **Cloudflare Realtime** |
| :--- | :---: | :---: | :---: |
| **Custo de Conexão Ociosa** | Alto (planos pagos) | Custo do VPS + Redis | **R$ 0,00 (Hibernação)** |
| **Infraestrutura Necessária** | Nenhuma (SaaS) | VPS dedicada, Docker, Redis | **Nenhuma (Serverless na Cloudflare)** |
| **Escalabilidade Automática** | Sim | Manual (Horizontal / Load Balancer) | **Global na Borda (Edge Cloudflare)** |
| **Compatível com `pusher-js`** | Sim | Sim | **Sim (Protocolo v7)** |
| **Compatível com Laravel Echo** | Sim | Sim | **Sim** |
| **Disparo sem Dependências (PHP)**| Não (requer SDK/HMAC) | Não (requer SDK/HMAC) | **Sim (API REST simplificada)** |

---

## ⚡ Início Rápido (3 Minutos)

### 1. Clonar o Projeto e Instalar Dependências

```bash
git clone https://github.com/seu-usuario/cloudflare-realtime.git
cd cloudflare-realtime
npm install
```

### 2. Configurar as Chaves da sua Aplicação

Abra o arquivo [`wrangler.jsonc`](wrangler.jsonc) e altere as chaves no bloco `vars`:

```jsonc
"vars": {
  "DEFAULT_APP_ID": "meu-app-id",
  "DEFAULT_APP_KEY": "minha-chave-publica",
  "DEFAULT_APP_SECRET": "meu-segredo-privado"
}
```

> 🔒 **Dica de Produção:** Se preferir manter o segredo oculto do código, execute:
> ```bash
> npx wrangler secret put DEFAULT_APP_SECRET
> ```

### 3. Testar Localmente

```bash
npm run dev
```

Abra o arquivo [`examples/frontend-client/index.html`](examples/frontend-client/index.html) diretamente no seu navegador para ver a conexão WebSocket e o disparo funcionando na hora!

### 4. Fazer o Deploy para a Cloudflare

```bash
npx wrangler login
npm run deploy
```

Pronto! Você receberá uma URL no formato: `https://cloudflare-realtime.<seu-subdominio>.workers.dev`.

---

## 💻 1. Como Conectar no Frontend

Como o servidor implementa o **Pusher Channels Protocol v7**, você usa a biblioteca oficial do Pusher (`pusher-js`) sem precisar de hacks ou SDKs customizados.

### Via CDN (HTML Simples)

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

  // Assina o canal
  const channel = pusher.subscribe("pedidos");

  // Escuta o evento
  channel.bind("novo-pedido", function(dados) {
    console.log("Recebido em tempo real:", dados);
    alert("Novo pedido #" + dados.pedido_id + " recebido!");
  });
</script>
```

---

## 🐘 2. Como Disparar Eventos no Backend (PHP)

### A. PHP Puro (Ideal para Hospedagem Compartilhada / cPanel)

Não precisa de Composer! Dispare eventos com cURL nativo:

```php
<?php
$workerUrl = 'https://cloudflare-realtime.<seu-subdominio>.workers.dev/api/v1/trigger';
$appSecret = 'meu-segredo-privado';

$payload = [
    'channel' => 'pedidos',
    'event'   => 'novo-pedido',
    'data'    => [
        'pedido_id'   => 1054,
        'valor_total' => 249.90,
        'cliente'     => 'Maria Silva'
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

echo $response; // {"success": true, "delivered_to": 1}
```

> 💡 Se sua hospedagem tiver cURL desativado, temos o exemplo com `file_get_contents` em [`examples/php-shared-hosting/simple-fopen-trigger.php`](examples/php-shared-hosting/simple-fopen-trigger.php).

### B. Usando o SDK Oficial do Pusher (`pusher/pusher-php-server`)

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

$pusher->trigger('pedidos', 'novo-pedido', ['pedido_id' => 1054]);
```

### C. Laravel + Laravel Echo

Consulte o arquivo de configuração pronto para copiar e colar em [`examples/laravel/broadcasting.php`](examples/laravel/broadcasting.php).

---

## 🔒 Tipos de Canais

1. **Canais Públicos** (`geral`, `pedidos`):
   Qualquer cliente pode assinar sem autenticação prévia.
2. **Canais Privados** (`private-usuario.12`):
   Exige que o cliente envie a assinatura HMAC SHA-256 gerada pelo seu backend para autorizar a inscrição.
3. **Canais de Presença** (`presence-sala.99`):
   Além da validação HMAC, informa quem está online e emite os eventos automáticos `pusher_internal:member_added` e `pusher_internal:member_removed` quando os usuários entram ou saem da página.

---

## 🏢 Múltiplas Aplicações no Mesmo Worker (Multi-Tenant)

Se você gerencia múltiplos clientes ou projetos, pode usar o mesmo Worker para todos. Basta configurar a variável `APPS_CONFIG` com um array JSON:

```json
[
  { "id": "loja-1", "key": "key-loja-1", "secret": "sec-loja-1" },
  { "id": "loja-2", "key": "key-loja-2", "secret": "sec-loja-2" }
]
```

Cada aplicação terá seu próprio Durable Object isolado na Cloudflare.

---

## ❓ Perguntas Frequentes (FAQ)

<details>
<summary><b>1. Preciso ter uma conta paga na Cloudflare?</b></summary>
Não! A Cloudflare disponibiliza Workers e Durable Objects no <b>Plano Gratuito</b> com franquia generosa (100.000 requisições/dia). Como o projeto usa a API de Hibernação de WebSockets, conexões abertas e ociosas não consomem CPU.
</details>

<details>
<summary><b>2. Quantos usuários conectados aguenta?</b></summary>
Graças à API de Hibernação de WebSockets da Cloudflare, uma única instância de Durable Object consegue manter milhares de WebSockets simultâneos em repouso. Para o plano pago ($5/mês), você tem acesso a dezenas de milhões de requisições e durações com custo marginal irrisório.
</details>

<details>
<summary><b>3. Posso usar com React, Vue, Angular, Svelte ou Next.js?</b></summary>
Sim! Basta importar a biblioteca padrão <code>pusher-js</code> no seu projeto frontend e configurar o <code>wsHost</code> apontando para a sua URL da Cloudflare.
</details>

<details>
<summary><b>4. Como funciona o CORS?</b></summary>
O servidor já vem com middleware CORS pré-configurado no Hono, liberando requisições REST de qualquer origem ou permitindo que você restrinja ao seu domínio em <code>src/index.ts</code>.
</details>

---

## 🧪 Testes Automatizados

O repositório já inclui testes cobrindo todo o algoritmo criptográfico de assinaturas HMAC SHA-256, cálculo de MD5, validação de canais privados/presença e tokens Bearer:

```bash
# Executa testes unitários
npm test

# Executa checagem de tipos TypeScript
npm run typecheck
```

---

## 🤝 Contribuição e Licença

Contribuições são muito bem-vindas! Consulte o guia de contribuição em [`CONTRIBUTING.md`](CONTRIBUTING.md).

Distribuído sob a licença **MIT**. Você pode usar, modificar e distribuir livremente para projetos pessoais ou comerciais. Veja o arquivo [`LICENSE`](LICENSE) para mais detalhes.
