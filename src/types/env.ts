import type { AppSessionDO } from "../durable-objects/AppSessionDO";

export interface AppConfig {
  id: string;
  key: string;
  secret: string;
}

export interface Env {
  APP_SESSION: DurableObjectNamespace<AppSessionDO>;

  // Default app credentials (can be set via env vars or secrets)
  DEFAULT_APP_ID?: string;
  DEFAULT_APP_KEY?: string;
  DEFAULT_APP_SECRET?: string;

  // Multi-app config stored as JSON string:
  // '[{"id":"app1","key":"key1","secret":"secret1"},{"id":"app2",...}]'
  APPS_CONFIG?: string;
}
