<?php
/**
 * Configuração do Laravel para usar o Cloudflare Realtime como Pusher
 * 
 * 1. No arquivo .env do Laravel:
 * ----------------------------------------------------
 * BROADCAST_DRIVER=pusher
 * 
 * PUSHER_APP_ID=app-default
 * PUSHER_APP_KEY=key-default
 * PUSHER_APP_SECRET=secret-default
 * 
 * PUSHER_HOST=seu-worker.seu-subdominio.workers.dev
 * PUSHER_PORT=443
 * PUSHER_SCHEME=https
 * 
 * # Para o frontend (Vite / Laravel Echo):
 * VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
 * VITE_PUSHER_HOST="${PUSHER_HOST}"
 * VITE_PUSHER_PORT="${PUSHER_PORT}"
 * VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
 * ----------------------------------------------------
 * 
 * 2. No arquivo config/broadcasting.php do Laravel:
 */

return [
    'default' => env('BROADCAST_DRIVER', 'null'),

    'connections' => [
        'pusher' => [
            'driver' => 'pusher',
            'key' => env('PUSHER_APP_KEY'),
            'secret' => env('PUSHER_APP_SECRET'),
            'app_id' => env('PUSHER_APP_ID'),
            'options' => [
                'host' => env('PUSHER_HOST'),
                'port' => env('PUSHER_PORT', 443),
                'scheme' => env('PUSHER_SCHEME', 'https'),
                'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
                'encrypted' => true,
            ],
        ],
    ],
];

/**
 * 3. No frontend com Laravel Echo (resources/js/bootstrap.js):
 * 
 * import Echo from 'laravel-echo';
 * import Pusher from 'pusher-js';
 * window.Pusher = Pusher;
 * 
 * window.Echo = new Echo({
 *     broadcaster: 'pusher',
 *     key: import.meta.env.VITE_PUSHER_APP_KEY,
 *     wsHost: import.meta.env.VITE_PUSHER_HOST,
 *     wsPort: import.meta.env.VITE_PUSHER_PORT ?? 80,
 *     wssPort: import.meta.env.VITE_PUSHER_PORT ?? 443,
 *     forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
 *     enabledTransports: ['ws', 'wss'],
 * });
 */
