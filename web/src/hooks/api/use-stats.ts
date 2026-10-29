import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { defaultListQueryOptions } from './query-defaults';
import { fetchStats } from '../../services/api';
import type { AppStats } from '../../types';

interface UseStatsOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
}

export function useStatsQuery(options: UseStatsOptions = {}) {
  const { refetchInterval = 10000, enabled = true } = options;

  return useQuery<AppStats>({
    ...defaultListQueryOptions,
    queryKey: queryKeys.stats.all,
    queryFn: fetchStats,
    refetchInterval,
    enabled,
  });
}
