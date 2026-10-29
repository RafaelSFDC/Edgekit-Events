<?php
/**
 * Exemplo de disparo usando file_get_contents (PHP puro)
 * Funciona mesmo se a extensão cURL estiver desabilitada!
 */

$workerUrl = 'https://seu-worker.seu-subdominio.workers.dev/api/v1/trigger';
// Ou localmente: 'http://localhost:8787/api/v1/trigger'

$appSecret = 'secret-default';

$payload = [
    'channel' => 'notificacoes',
    'event'   => 'alerta-sistema',
    'data'    => [
        'titulo'   => 'Estoque Baixo',
        'mensagem' => 'O produto #42 atingiu o nível mínimo.',
        'urgente'  => true
    ]
];

$options = [
    'http' => [
        'method'  => 'POST',
        'header'  => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $appSecret
        ],
        'content' => json_encode($payload),
        'timeout' => 5
    ]
];

$context = stream_context_create($options);
$response = @file_get_contents($workerUrl, false, $context);

if ($response === false) {
    $error = error_get_last();
    echo "Falha ao enviar requisição: " . ($error['message'] ?? 'Erro desconhecido') . PHP_EOL;
} else {
    echo "Sucesso: " . $response . PHP_EOL;
}
