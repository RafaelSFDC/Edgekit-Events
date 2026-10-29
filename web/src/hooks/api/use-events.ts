import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import type { DebugEvent } from '../../types';

export function useEventsQuery() {
  return useQuery<DebugEvent[]>({
    queryKey: queryKeys.events.all,
    initialData: [],
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useClearEvents() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData(queryKeys.events.all, []);
  };
}
