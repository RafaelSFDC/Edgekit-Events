<?php
/**
 * Edgekit Events - WordPress & WooCommerce Asynchronous Integration
 * 
 * Paste this snippet into your theme's `functions.php` or as a `mu-plugin` (e.g. `wp-content/mu-plugins/edgekit-events.php`).
 * Zero plugins or heavy dependencies required!
 * Uses non-blocking fire-and-forget cURL (150ms timeout) so the customer checkout finishes instantly.
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// 🔑 CONFIGURAÇÕES DO EDGEKIT EVENTS
define('EDGEKIT_EVENTS_HOST', 'realtime.yourdomain.com'); // ou 'localhost:8787'
define('EDGEKIT_EVENTS_APP_KEY', 'key-default');
define('EDGEKIT_EVENTS_APP_SECRET', 'secret-default');
define('EDGEKIT_EVENTS_USE_TLS', true);

/**
 * Dispara um evento em tempo real de forma assíncrona (não-bloqueante)
 */
function edgekit_broadcast_async(string $channel, string $event, array $data): bool
{
    $protocol = defined('EDGEKIT_EVENTS_USE_TLS') && EDGEKIT_EVENTS_USE_TLS ? 'https://' : 'http://';
    $url = $protocol . EDGEKIT_EVENTS_HOST . '/api/v1/trigger';

    $payload = json_encode([
        'channel' => $channel,
        'event'   => $event,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_NOSIGNAL       => 1,
        CURLOPT_TIMEOUT_MS     => 150, // Fire-and-forget: não atrasa o carregamento da página!
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'X-App-Secret: ' . EDGEKIT_EVENTS_APP_SECRET,
            'User-Agent: WordPress-EdgekitEvents/1.0',
        ],
    ]);

    curl_exec($ch);
    $errno = curl_errno($ch);
    curl_close($ch);

    return $errno === 0 || $errno === 28; // 28 = timeout atingido (esperado no fire-and-forget)
}

/**
 * Exemplo 1: Notificar novo pedido WooCommerce em tempo real
 */
add_action('woocommerce_new_order', function ($order_id) {
    $order = wc_get_order($order_id);
    if (!$order) {
        return;
    }

    edgekit_broadcast_async('orders', 'order.created', [
        'order_id'   => $order->get_id(),
        'total'      => $order->get_total(),
        'status'     => $order->get_status(),
        'customer'   => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
        'created_at' => current_time('mysql'),
    ]);
}, 10, 1);

/**
 * Exemplo 2: Notificar cadastro de novo usuário no WordPress
 */
add_action('user_register', function ($user_id) {
    $user = get_userdata($user_id);
    if (!$user) {
        return;
    }

    edgekit_broadcast_async('admin-notifications', 'user.registered', [
        'user_id'  => $user_id,
        'username' => $user->user_login,
        'email'    => $user->user_email,
    ]);
}, 10, 1);
