export type EventType =
  | 'event_triggered'
  | 'client_connected'
  | 'client_disconnected'
  | 'channel_subscribed'
  | 'channel_unsubscribed'
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

export interface ChannelStat {
  name: string;
  user_count: number;
  isPresence: boolean;
  isPrivate: boolean;
}

export interface AppStats {
  active_sockets: number;
  channels_count: number;
  channels: Record<string, { user_count: number }>;
  debug_listeners: number;
  timestamp: number;
}
