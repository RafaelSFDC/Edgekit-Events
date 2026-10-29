<?php
/**
 * Exemplo de disparo em tempo real usando PHP puro com cURL
 * Ideal para Hospedagem Compartilhada (cPanel, Hostinger, Locaweb, KingHost, etc.)
 * 
 * Nenhuma biblioteca externa necessária!
 */

$workerUrl = 'https://seu-worker.seu-subdominio.workers.dev/api/v1/trigger';
// Ou para testes locais: 'http://localhost:8787/api/v1/trigger'

$appSecret = 'secret-default'; // Seu DEFAULT_APP_SECRET configurado no Cloudflare

$payload = [
    'channel' => 'pedidos',
    'event'   => 'novo-pedido',
    'data'    => [
        'pedido_id'    => 1054,
        'cliente'      => 'Maria Oliveira',
        'valor_total'  => 249.90,
        'status'       => 'pago',
        'criado_em'    => date('Y-m-d H:i:s')
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
curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 segundos de timeout

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error    = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "Erro cURL: " . $error . PHP_EOL;
} else {
    echo "HTTP Status: " . $httpCode . PHP_EOL;
    echo "Resposta: " . $response . PHP_EOL;
}
