import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { copyToClipboard } from '../lib/utils';

interface SnippetGeneratorProps {
  appKey: string;
  appId: string;
  host: string;
}

export const SnippetGenerator: React.FC<SnippetGeneratorProps> = ({
  appKey,
  appId,
  host,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'js' | 'laravel' | 'php' | 'node' | 'python' | 'curl'>('js');
  const [copied, setCopied] = useState(false);

  const keyDisplay = appKey || 'minha-chave-publica';
  const idDisplay = appId || 'meu-app-id';
  const hostDisplay = host || 'realtime.seusite.workers.dev';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsPort = isHttps ? 443 : (typeof window !== 'undefined' && window.location.port ? parseInt(window.location.port) : 443);
  const isTls = isHttps || wsPort === 443;

  const snippets = {
    js: `// 1. Instale pusher-js (npm i pusher-js) ou use a CDN oficial
import Pusher from "pusher-js";

const pusher = new Pusher("${keyDisplay}", {
  wsHost: "${hostDisplay}",
  httpHost: "${hostDisplay}",
  wsPort: ${wsPort},
  wssPort: ${wsPort},
  forceTLS: ${isTls},
  disableStats: true,
  enabledTransports: ["ws", "wss"],
});

// Assine o canal desejado
const channel = pusher.subscribe("pedidos");

// Escute o evento em tempo real
channel.bind("novo-pedido", (data) => {
  console.log("Recebido em tempo real:", data);
  alert("Novo pedido #" + data.pedido_id + " recebido!");
});`,

    laravel: `// 1. Em config/broadcasting.php adicione a conexão pusher:
'pusher' => [
    'driver' => 'pusher',
    'key' => env('PUSHER_APP_KEY', '${keyDisplay}'),
    'secret' => env('PUSHER_APP_SECRET', 'sua-chave-secreta'),
    'app_id' => env('PUSHER_APP_ID', '${idDisplay}'),
    'options' => [
        'host' => env('PUSHER_HOST', '${hostDisplay}'),
        'port' => env('PUSHER_PORT', ${wsPort}),
        'scheme' => '${isTls ? 'https' : 'http'}',
        'useTLS' => ${isTls ? 'true' : 'false'},
    ],
],

// 2. Dispare seus eventos normalmente no Laravel:
event(new OrderCreated($order));`,

    php: `<?php
// Disparo direto em PHP Puro (sem Composer nem dependências pesadas)
$workerUrl = '${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger';
$appSecret = 'sua-chave-secreta';

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
    'X-App-Secret: ' . $appSecret
]);

$response = curl_exec($ch);
curl_close($ch);

echo $response;`,

    node: `// Disparo via Fetch nativo em Node.js 18+ ou Next.js
const res = await fetch("${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-App-Secret": "sua-chave-secreta",
  },
  body: JSON.stringify({
    channel: "pedidos",
    event: "novo-pedido",
    data: {
      pedido_id: 1042,
      cliente: "Carlos Eduardo",
      status: "aprovado"
    }
  }),
});

const result = await res.json();
console.log("Evento entregue:", result);`,

    python: `import requests

url = "${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger"
headers = {
    "Content-Type": "application/json",
    "X-App-Secret": "sua-chave-secreta"
}
payload = {
    "channel": "pedidos",
    "event": "novo-pedido",
    "data": {
        "pedido_id": 1042,
        "cliente": "Carlos Eduardo"
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,

    curl: `curl -X POST "${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger" \\
  -H "Content-Type: application/json" \\
  -H "X-App-Secret: sua-chave-secreta" \\
  -d '{
    "channel": "pedidos",
    "event": "novo-pedido",
    "data": {
      "pedido_id": 1054,
      "valor_total": 249.90,
      "cliente": "Maria Silva"
    }
  }'`,
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(snippets[activeTab]);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {t.snippets.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t.snippets.subtitle}
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap items-center bg-secondary p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab('js')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'js'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabJavascript}
          </button>
          <button
            onClick={() => setActiveTab('laravel')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'laravel'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabLaravel}
          </button>
          <button
            onClick={() => setActiveTab('php')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'php'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabPhp}
          </button>
          <button
            onClick={() => setActiveTab('node')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'node'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabNode}
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'python'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabPython}
          </button>
          <button
            onClick={() => setActiveTab('curl')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'curl'
                ? 'bg-zinc-800 text-sky-400 font-semibold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.snippets.tabCurl}
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative">
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 border border-zinc-700 shadow-sm transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t.common.copied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.common.copy}</span>
              </>
            )}
          </button>
        </div>

        <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
          <code>{snippets[activeTab]}</code>
        </pre>
      </div>
    </div>
  );
};
