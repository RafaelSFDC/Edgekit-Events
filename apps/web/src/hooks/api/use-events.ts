import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import type { DebugEvent } from '../../types';

export function useEventsQuery() {
  const queryClient = useQueryClient();
  return useQuery<DebugEvent[]>({
    queryKey: queryKeys.events.all,
    queryFn: () => queryClient.getQueryData<DebugEvent[]>(queryKeys.events.all) ?? [],
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useClearEvents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(queryKeys.events.all, []);
  };
}
