export interface InvalidateTarget {
  queryKey: ReadonlyArray<unknown>;
  exact?: boolean;
}

export type InvalidateTargetInput = InvalidateTarget | ReadonlyArray<unknown>;

/**
 * Standard query key factory matching Kataly's pattern
 */
function createEntityQueryKeys<
  TListParams = Record<string, never>,
  TDetailId = string
>(entityName: string) {
  return {
    all: [entityName] as const,
    lists: () => [entityName, 'list'] as const,
    list: (filters: TListParams) => [entityName, 'list', filters] as const,
    details: () => [entityName, 'detail'] as const,
    detail: (id: TDetailId) => [entityName, 'detail', id] as const,
    actions: () => [entityName, 'action'] as const,
  };
}

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },
  stats: {
    all: ['stats'] as const,
    detail: () => ['stats', 'detail'] as const,
  },
  channels: createEntityQueryKeys<Record<string, never>, string>('channels'),
  events: {
    all: ['events'] as const,
  },
};
