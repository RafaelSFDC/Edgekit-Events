<?php
/**
 * Exemplo usando o SDK oficial do Pusher (pusher/pusher-php-server)
 * 
 * Instalação:
 * composer require pusher/pusher-php-server
 */

require __DIR__ . '/vendor/autoload.php';

$appId     = 'app-default';
$appKey    = 'key-default';
$appSecret = 'secret-default';

// Basta apontar o host para o seu Cloudflare Worker!
$options = [
    'host'    => 'seu-worker.seu-subdominio.workers.dev', // ou 'localhost'
    'port'    => 443,                                    // ou 8787 para local
    'scheme'  => 'https',                                // ou 'http' para local
    'useTLS'  => true,                                   // ou false para local
    'timeout' => 5
];

$pusher = new Pusher\Pusher(
    $appKey,
    $appSecret,
    $appId,
    $options
);

$data = [
    'mensagem'  => 'Disparado pelo SDK oficial do Pusher!',
    'usuario'   => 'Admin',
    'timestamp' => time()
];

// Dispara evento para o canal 'pedidos'
$result = $pusher->trigger('pedidos', 'novo-pedido', $data);

echo "Resultado do disparo: " . json_encode($result) . PHP_EOL;
