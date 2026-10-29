import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../i18n/context';
import { copyToClipboard } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SnippetGeneratorProps {
  appKey: string;
  appId: string;
  host: string;
}

type SnippetTab = 'js' | 'laravel' | 'php' | 'node' | 'python' | 'go' | 'dotnet' | 'curl';

export const SnippetGenerator: React.FC<SnippetGeneratorProps> = ({
  appKey,
  appId,
  host,
}) => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SnippetTab>('js');
  const [copied, setCopied] = useState(false);

  const keyDisplay = appKey || 'minha-chave-publica';
  const idDisplay = appId || 'meu-app-id';
  const hostDisplay = host || 'realtime.seusite.workers.dev';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const wsPort = isHttps ? 443 : (typeof window !== 'undefined' && window.location.port ? parseInt(window.location.port) : 443);
  const isTls = isHttps || wsPort === 443;

  const snippets: Record<SnippetTab, string> = {
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

    go: `// Disparo nativo em Go (sem dependências)
package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]any{
		"channel": "pedidos",
		"event":   "novo-pedido",
		"data": map[string]any{
			"pedido_id": 1054,
			"cliente":   "Maria Silva",
		},
	})

	req, _ := http.NewRequest("POST", "${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer sua-chave-secreta")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
}`,

    dotnet: `// Disparo nativo em C# (.NET 6/7/8+)
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
var payload = new
{
    channel = "pedidos",
    event = "novo-pedido",
    data = new { pedido_id = 1054, cliente = "Maria Silva" }
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "sua-chave-secreta");

var response = await client.PostAsync("${isTls ? 'https' : 'http'}://${hostDisplay}/api/v1/trigger", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`,

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
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            {t.snippets.title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t.snippets.subtitle}
          </CardDescription>
        </div>

        {/* Tab navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as SnippetTab)}
        >
          <TabsList className="bg-secondary p-1 rounded-lg border border-border">
            <TabsTrigger value="js" className="text-xs px-2.5 py-1">
              {t.snippets.tabJavascript}
            </TabsTrigger>
            <TabsTrigger value="laravel" className="text-xs px-2.5 py-1">
              {t.snippets.tabLaravel}
            </TabsTrigger>
            <TabsTrigger value="php" className="text-xs px-2.5 py-1">
              {t.snippets.tabPhp}
            </TabsTrigger>
            <TabsTrigger value="node" className="text-xs px-2.5 py-1">
              {t.snippets.tabNode}
            </TabsTrigger>
            <TabsTrigger value="python" className="text-xs px-2.5 py-1">
              {t.snippets.tabPython}
            </TabsTrigger>
            <TabsTrigger value="go" className="text-xs px-2.5 py-1">
              {t.snippets.tabGo}
            </TabsTrigger>
            <TabsTrigger value="dotnet" className="text-xs px-2.5 py-1">
              {t.snippets.tabDotnet}
            </TabsTrigger>
            <TabsTrigger value="curl" className="text-xs px-2.5 py-1">
              {t.snippets.tabCurl}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {/* Code Display Area */}
        <div className="relative">
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="outline"
              size="xs"
              onClick={handleCopy}
              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" />
                  <span className="text-emerald-400">{t.common.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" />
                  <span>{t.common.copy}</span>
                </>
              )}
            </Button>
          </div>

          <ScrollArea className="rounded-xl border border-border/80 dark:border-zinc-800 bg-zinc-950 max-h-[460px]">
            <pre className="p-4 text-xs font-mono text-zinc-200 leading-relaxed">
              <code>{snippets[activeTab]}</code>
            </pre>
          </ScrollArea>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
          <span>💡 {t.snippets.viewAllSnippets}</span>
          <code className="text-[11px] bg-secondary px-2 py-0.5 rounded border border-border font-mono text-foreground">
            snippets/
          </code>
        </div>
      </CardContent>
    </Card>
  );
};
