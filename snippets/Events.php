<?php

declare(strict_types=1);

namespace App\Services;

use RuntimeException;
use InvalidArgumentException;

/**
 * Edgekit Events Client for PHP & Laravel (Copy-Paste Snippet)
 * 
 * Save this file to `app/Services/EdgeKitEvents.php` (or copy directly into your project).
 * Zero external dependencies — uses native PHP 8+ cURL extension and hash_hmac.
 * Fully compatible with Laravel, Symfony, WordPress, and shared hosting (cPanel).
 */
class EdgeKitEvents
{
    private string $baseUrl;
    private string $host;
    private string $appKey;
    private string $appSecret;
    private string $appId;

    public function __construct(
        string $host,
        string $appKey,
        string $appSecret,
        string $appId = 'default-app',
        ?bool $useTls = null,
        ?int $port = null
    ) {
        $cleanHost = preg_replace('#^https?://#', '', rtrim($host, '/'));
        $isLocal = str_contains($cleanHost, 'localhost') || str_contains($cleanHost, '127.0.0.1');
        $tls = $useTls ?? !$isLocal;
        $scheme = $tls ? 'https' : 'http';
        $portSuffix = $port ? ":{$port}" : '';

        $this->baseUrl = "{$scheme}://{$cleanHost}{$portSuffix}";
        $this->host = $cleanHost;
        $this->appKey = trim($appKey);
        $this->appSecret = trim($appSecret);
        $this->appId = trim($appId);
    }

    /**
     * Broadcasts an event to one or multiple channels.
     *
     * @param string|array<string> $channel Target channel or array of channels
     * @param string $event Event name
     * @param mixed $data Serializable payload
     * @param string|null $socketId Optional socket ID to exclude from broadcast
     * @return array Response data (e.g. ['success' => true, 'delivered_to' => 2])
     */
    public function trigger(string|array $channel, string $event, mixed $data, ?string $socketId = null): array
    {
        $channels = is_array($channel) ? array_values($channel) : [$channel];
        if (empty($channels)) {
            throw new InvalidArgumentException('At least one channel must be specified.');
        }

        $payload = [
            'app_id' => $this->appId,
            'channels' => $channels,
            'event' => $event,
            'data' => $data,
        ];

        if ($socketId !== null) {
            $payload['socket_id'] = $socketId;
        }

        $url = "{$this->baseUrl}/api/v1/trigger";
        $jsonBody = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $jsonBody,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $this->appSecret,
                'X-App-Secret: ' . $this->appSecret,
                'User-Agent: EdgekitEvents-PHP/1.0',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new RuntimeException("cURL error connecting to Edgekit Events: {$error}");
        }

        $decoded = json_decode((string)$response, true);
        if ($httpCode >= 400) {
            $msg = is_array($decoded) && isset($decoded['error']) ? $decoded['error'] : $response;
            throw new RuntimeException("Trigger failed with HTTP {$httpCode}: {$msg}");
        }

        return is_array($decoded) ? $decoded : ['raw' => $response];
    }

    /**
     * Authorizes a subscription to a private or presence channel.
     * Call this in your auth controller (e.g. `/broadcasting/auth` or `/api/pusher/auth`).
     *
     * @param string $socketId The socket ID sent by pusher-js
     * @param string $channel Channel name (e.g. 'private-user.1', 'presence-room.42')
     * @param array|null $channelData User presence profile array (for presence channels)
     * @return array Array with ['auth' => '...'] or ['auth' => '...', 'channel_data' => '...']
     */
    public function authorizeChannel(string $socketId, string $channel, ?array $channelData = null): array
    {
        if (empty($socketId) || empty($channel)) {
            throw new InvalidArgumentException('socketId and channel are required.');
        }

        $channelDataStr = null;
        $stringToSign = "{$socketId}:{$channel}";

        if (str_starts_with($channel, 'presence-')) {
            $channelDataStr = json_encode($channelData ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $stringToSign = "{$socketId}:{$channel}:{$channelDataStr}";
        }

        $signature = hash_hmac('sha256', $stringToSign, $this->appSecret);
        $auth = "{$this->appKey}:{$signature}";

        if ($channelDataStr !== null) {
            return [
                'auth' => $auth,
                'channel_data' => $channelDataStr,
            ];
        }

        return ['auth' => $auth];
    }

    /**
     * Queries active channel stats.
     *
     * @return array
     */
    public function getChannels(): array
    {
        $url = "{$this->baseUrl}/apps/{$this->appId}/channels";
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $this->appSecret,
                'X-App-Secret: ' . $this->appSecret,
                'User-Agent: EdgekitEvents-PHP/1.0',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400 || $response === false) {
            throw new RuntimeException("Failed to query channels (HTTP {$httpCode})");
        }

        return json_decode((string)$response, true) ?? [];
    }
}
