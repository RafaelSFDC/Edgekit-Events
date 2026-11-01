export interface PusherMessage {
  event: string;
  channel?: string;
  data?: any;
}

export interface PusherSubscribePayload {
  channel: string;
  auth?: string;
  channel_data?: string;
}

export interface PusherUnsubscribePayload {
  channel: string;
}

export interface SocketAttachment {
  socketId: string;
  clientIp?: string;
  channels: Record<
    string,
    {
      presenceData?: {
        user_id: string;
        user_info?: any;
      };
    }
  >;
}

export type ChannelCategory = 'crud' | 'notifications' | 'jobs' | 'presence' | 'custom';
export type ChannelVisibility = 'public' | 'private';

export interface ChannelRecord {
  name: string;
  category: ChannelCategory;
  visibility: ChannelVisibility;
  description?: string;
  allowedIps?: string[];
  events: string[];
  autoDestructMinutes?: number;
  webhookUrl?: string;
  vacatedAt?: number;
  createdAt: number;
  historyLimit?: number;
}

export interface MessageRecord {
  id: string;
  channel: string;
  name: string;
  data: any;
  timestamp: number;
}

export interface BatchTriggerPayload {
  batch: Array<{
    channel: string;
    name?: string;
    event?: string;
    data: any;
    socket_id?: string;
  }>;
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

export interface TriggerEventPayload {
  name: string;
  channel?: string;
  channels?: string[];
  data: any;
  socket_id?: string;
}

export interface SimpleTriggerPayload {
  channel: string;
  event: string;
  data: any;
  socket_id?: string;
}
