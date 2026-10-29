/**
 * Edgekit Events Client (Zero-Dependency Copy-Paste Snippet)
 * 
 * Copy this file directly into your project (e.g., `lib/events.ts`).
 * Works natively with Fetch and Web Crypto in Node.js 18+, Next.js (App Router, Server Actions),
 * Remix, Astro, Bun, Deno, and Cloudflare Workers.
 */

export interface EventsConfig {
  /**
   * Host of your Edgekit Events Worker (without protocol)
   * Example: "realtime.yourdomain.com" or "localhost:8787"
   */
  host: string;

  /**
   * Public App Key
   */
  appKey: string;

  /**
   * Secret App Key configured in your Worker
   */
  appSecret: string;

  /**
   * Target App ID (defaults to "default-app" or single configured app)
   */
  appId?: string;

  /**
   * Use HTTPS/TLS (defaults to true for non-localhost hosts)
   */
  useTls?: boolean;

  /**
   * Optional custom port (defaults to 443 for TLS, 80 for HTTP, or 8787 for localhost)
   */
  port?: number;
}

export interface TriggerOptions {
  /** Target channel name (e.g. "orders", "private-user.12") */
  channel?: string;
  /** Or multiple target channels */
  channels?: string[];
  /** Name of the event to broadcast */
  event: string;
  /** Payload to deliver (any JSON-serializable object or string) */
  data: any;
  /** Optional socket ID to exclude from receiving this broadcast */
  socketId?: string;
}

export interface TriggerResult {
  success: boolean;
  delivered_to?: number;
  channels?: string[];
  event?: string;
  error?: string;
}

export interface ChannelAuthResult {
  auth: string;
  channel_data?: string;
}

/**
 * Computes HMAC-SHA256 in hex format using Web Crypto API (universal in Node 18+, Edge, Bun)
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function createEventsClient(config: EventsConfig) {
  const host = config.host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const useTls = config.useTls ?? !isLocal;
  const protocol = useTls ? 'https' : 'http';
  const portSuffix = config.port ? `:${config.port}` : '';
  const baseUrl = `${protocol}://${host}${portSuffix}`;
  const appKey = config.appKey.trim();
  const appSecret = config.appSecret.trim();
  const appId = config.appId || 'default-app';

  return {
    /**
     * Broadcasts an event to one or more channels.
     */
    async trigger(options: TriggerOptions): Promise<TriggerResult> {
      const channels = options.channels || (options.channel ? [options.channel] : []);
      if (channels.length === 0) {
        throw new Error('At least one channel must be specified.');
      }

      const res = await fetch(`${baseUrl}/api/v1/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${appSecret}`,
          'X-App-Secret': appSecret,
        },
        body: JSON.stringify({
          app_id: appId,
          channels,
          event: options.event,
          data: options.data,
          socket_id: options.socketId,
        }),
      });

      const json = (await res.json()) as TriggerResult;
      if (!res.ok) {
        throw new Error(json.error || `Trigger failed with HTTP ${res.status}`);
      }

      return json;
    },

    /**
     * Authorizes a subscription to a private or presence channel.
     * Use this inside your authentication route (e.g. Next.js `/api/pusher/auth`).
     *
     * - For private channels: stringToSign = `${socketId}:${channel}`
     * - For presence channels: stringToSign = `${socketId}:${channel}:${channelDataStr}`
     */
    async authorizeChannel(
      socketId: string,
      channel: string,
      channelData?: Record<string, any> | string
    ): Promise<ChannelAuthResult> {
      if (!socketId || !channel) {
        throw new Error('socketId and channel are required for authorization.');
      }

      let channelDataStr: string | undefined;
      let stringToSign = `${socketId}:${channel}`;

      if (channel.startsWith('presence-')) {
        channelDataStr =
          typeof channelData === 'string'
            ? channelData
            : JSON.stringify(channelData || {});
        stringToSign = `${socketId}:${channel}:${channelDataStr}`;
      }

      const signature = await hmacSha256Hex(appSecret, stringToSign);
      const auth = `${appKey}:${signature}`;

      if (channelDataStr !== undefined) {
        return { auth, channel_data: channelDataStr };
      }

      return { auth };
    },

    /**
     * Retrieves active channel statistics.
     */
    async getChannels(): Promise<{ channels: Record<string, { user_count?: number }> }> {
      const res = await fetch(`${baseUrl}/apps/${appId}/channels`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${appSecret}`,
          'X-App-Secret': appSecret,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to query channels: HTTP ${res.status}`);
      }

      return (await res.json()) as { channels: Record<string, { user_count?: number }> };
    },
  };
}

export type EventsClient = ReturnType<typeof createEventsClient>;
