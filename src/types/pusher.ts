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
