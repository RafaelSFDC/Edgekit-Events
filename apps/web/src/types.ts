export type EventType =
  | 'event_triggered'
  | 'client_connected'
  | 'client_disconnected'
  | 'channel_subscribed'
  | 'channel_unsubscribed'
  | 'sse_connected'
  | 'connected';

export interface DebugEvent {
  id: string;
  type: EventType;
  channel?: string;
  event?: string;
  data?: any;
  socket_id?: string;
  delivered_to?: number;
  is_presence?: boolean;
  presence_user_id?: string;
  timestamp: number;
}

export type ChannelCategory = 'crud' | 'notifications' | 'jobs' | 'presence' | 'custom';
export type ChannelVisibility = 'public' | 'private';

export interface ChannelStat {
  name: string;
  user_count: number;
  isPresence: boolean;
  isPrivate: boolean;
  category?: ChannelCategory;
  visibility?: ChannelVisibility;
  description?: string;
  allowedIps?: string[];
  events?: string[];
  autoDestructMinutes?: number;
  webhookUrl?: string;
  vacatedAt?: number;
  createdAt?: number;
  isRegistered?: boolean;
}

export interface CreateChannelPayload {
  name: string;
  category?: ChannelCategory;
  visibility?: ChannelVisibility;
  description?: string;
  allowedIps?: string[];
  events?: string[];
  autoDestructMinutes?: number;
  webhookUrl?: string;
}

export interface AppStats {
  active_sockets: number;
  channels_count: number;
  channels: Record<string, { user_count: number }>;
  debug_listeners: number;
  timestamp: number;
}
