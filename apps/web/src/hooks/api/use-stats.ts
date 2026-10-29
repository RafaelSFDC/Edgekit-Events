import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { defaultListQueryOptions } from './query-defaults';
import { fetchStats } from '../../services/api';
import type { AppStats } from '../../types';
import { useOptionalAuth } from '../../context/auth-context';

interface UseStatsOptions {
  refetchInterval?: number | false;
  enabled?: boolean;
}

export function useStatsQuery(options: UseStatsOptions = {}) {
  const auth = useOptionalAuth();
  const isAuthenticated = auth ? auth.isAuthenticated : true;
  const { refetchInterval, enabled = true } = options;

  return useQuery<AppStats>({
    ...defaultListQueryOptions,
    queryKey: queryKeys.stats.all,
    queryFn: fetchStats,
    ...(refetchInterval !== undefined ? { refetchInterval } : {}),
    enabled: enabled && isAuthenticated,
    retry: false,
  });
}
