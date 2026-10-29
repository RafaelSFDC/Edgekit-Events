import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChannelsApi, createChannelApi, deleteChannelApi } from '../../services/api';
import { queryKeys } from './query-keys';
import { defaultListQueryOptions } from './query-defaults';
import type { CreateChannelPayload } from '../../types';

export function useChannelsQuery() {
  return useQuery({
    queryKey: queryKeys.channels.lists(),
    queryFn: () => fetchChannelsApi(),
    ...defaultListQueryOptions,
    refetchInterval: 5000,
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateChannelPayload) => createChannelApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelName: string) => deleteChannelApi(channelName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.channels.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    },
  });
}
