import type { AppConfig, Env } from "../types/env";
import { constantTimeEquals, hmacSha256Hex, md5 } from "./crypto";

/**
 * Retrieve all registered apps from environment variables / secrets
 */
export function getApps(env: Env): AppConfig[] {
  const apps: AppConfig[] = [];

  // Default app if configured
  if (env.DEFAULT_APP_KEY && env.DEFAULT_APP_SECRET) {
    apps.push({
      id: env.DEFAULT_APP_ID || "app-default",
      key: env.DEFAULT_APP_KEY,
      secret: env.DEFAULT_APP_SECRET,
    });
  }

  // Multi-app config from JSON string
  if (env.APPS_CONFIG) {
    try {
      const parsed = JSON.parse(env.APPS_CONFIG) as AppConfig[];
      if (Array.isArray(parsed)) {
        for (const app of parsed) {
          if (app.id && app.key && app.secret) {
            // Avoid duplicate ids
            if (!apps.some((a) => a.id === app.id)) {
              apps.push(app);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse APPS_CONFIG JSON:", e);
    }
  }

  return apps;
}

/**
 * Find an app configuration by its app_id or app_key
 */
export function findApp(env: Env, idOrKey: string): AppConfig | null {
  const apps = getApps(env);
  return apps.find((a) => a.id === idOrKey || a.key === idOrKey) || null;
}

/**
 * Verify subscription authorization for private-* and presence-* channels
 */
export async function verifyChannelAuth(
  app: AppConfig,
  socketId: string,
  channel: string,
  authString?: string,
  channelData?: string
): Promise<boolean> {
  if (!authString) return false;

  const parts = authString.split(":");
  if (parts.length !== 2) return false;

  const [providedKey, providedSig] = parts;
  if (providedKey !== app.key) return false;

  let stringToSign: string;
  if (channel.startsWith("presence-")) {
    if (!channelData) return false;
    stringToSign = `${socketId}:${channel}:${channelData}`;
  } else if (channel.startsWith("private-")) {
    stringToSign = `${socketId}:${channel}`;
  } else {
    // Public channels require no authentication
    return true;
  }

  const expectedSig = await hmacSha256Hex(app.secret, stringToSign);
  return constantTimeEquals(providedSig, expectedSig);
}

/**
 * Verify Pusher REST API HTTP signature
 * Used for endpoints like POST /apps/:app_id/events
 */
export async function verifyPusherHttpSignature(
  app: AppConfig,
  method: string,
  path: string,
  urlSearchParams: URLSearchParams,
  rawBody: string
): Promise<{ valid: boolean; reason?: string }> {
  const authKey = urlSearchParams.get("auth_key");
  const authSignature = urlSearchParams.get("auth_signature");
  const authTimestamp = urlSearchParams.get("auth_timestamp");
  const bodyMd5 = urlSearchParams.get("body_md5");

  if (!authKey || !authSignature) {
    return { valid: false, reason: "Missing auth_key or auth_signature" };
  }

  if (authKey !== app.key) {
    return { valid: false, reason: "Unknown auth_key" };
  }

  // Validate timestamp (optional 10-minute drift check)
  if (authTimestamp) {
    const timestamp = parseInt(authTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > 600) {
      return { valid: false, reason: "Timestamp expired or clock drift > 10m" };
    }
  }

  // If rawBody is present, verify body_md5
  if (rawBody.length > 0 && bodyMd5) {
    const expectedMd5 = md5(rawBody);
    if (!constantTimeEquals(bodyMd5, expectedMd5)) {
      return { valid: false, reason: "Invalid body_md5" };
    }
  }

  // Build sorted query string without auth_signature
  const keys: string[] = [];
  urlSearchParams.forEach((_, key) => {
    if (key !== "auth_signature") {
      keys.push(key);
    }
  });
  keys.sort();

  const sortedQuery = keys
    .map((k) => `${k}=${urlSearchParams.get(k)}`)
    .join("&");

  const stringToSign = `${method.toUpperCase()}\n${path}\n${sortedQuery}`;
  const expectedSig = await hmacSha256Hex(app.secret, stringToSign);

  if (!constantTimeEquals(authSignature, expectedSig)) {
    return { valid: false, reason: "Invalid signature" };
  }

  return { valid: true };
}

/**
 * Verify simplified REST API Bearer token or secret query param
 */
export function verifySimpleBearerAuth(
  app: AppConfig,
  authHeader?: string | null,
  querySecret?: string | null
): boolean {
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && constantTimeEquals(match[1], app.secret)) {
      return true;
    }
  }

  if (querySecret && constantTimeEquals(querySecret, app.secret)) {
    return true;
  }

  return false;
}

/**
 * Verify Ably-compatible authentication:
 * Supports:
 * 1. Authorization: Basic base64(appKey:appSecret) or base64(appId.appKey:appSecret)
 * 2. Authorization: Bearer <appSecret>
 * 3. X-Ably-Key: appKey:appSecret or appId.appKey:appSecret
 * 4. Query param ?key=appKey:appSecret
 */
export function verifyAblyAuth(
  app: AppConfig,
  authHeader?: string | null,
  ablyKeyHeader?: string | null,
  queryKey?: string | null
): boolean {
  if (authHeader) {
    const basicMatch = authHeader.match(/^Basic\s+(.+)$/i);
    if (basicMatch) {
      try {
        const decoded = atob(basicMatch[1]);
        if (
          constantTimeEquals(decoded, `${app.key}:${app.secret}`) ||
          constantTimeEquals(decoded, `${app.id}.${app.key}:${app.secret}`)
        ) {
          return true;
        }
      } catch {}
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch && constantTimeEquals(bearerMatch[1], app.secret)) {
      return true;
    }
  }

  if (ablyKeyHeader) {
    if (
      constantTimeEquals(ablyKeyHeader, `${app.key}:${app.secret}`) ||
      constantTimeEquals(ablyKeyHeader, `${app.id}.${app.key}:${app.secret}`)
    ) {
      return true;
    }
  }

  if (queryKey) {
    if (
      constantTimeEquals(queryKey, `${app.key}:${app.secret}`) ||
      constantTimeEquals(queryKey, `${app.id}.${app.key}:${app.secret}`)
    ) {
      return true;
    }
  }

  return false;
}
