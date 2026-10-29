import { keepPreviousData } from '@tanstack/react-query';

/**
 * Standardized query options for list queries across dashboard hooks.
 * - staleTime: 30 seconds before considered stale
 * - gcTime: 5 minutes garbage collection window
 * - placeholderData: keepPreviousData to prevent UI flashes during updates
 * - retry: false to fail fast on errors
 * - refetchOnWindowFocus: false to avoid unnecessary re-fetches
 */
export const defaultListQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  placeholderData: keepPreviousData,
  retry: false,
  refetchOnWindowFocus: false,
} as const;

/**
 * Standardized query options for detail/single-record queries.
 * - staleTime: 30 seconds before considered stale
 * - gcTime: 5 minutes garbage collection window
 * - retry: false to fail fast on errors
 * - refetchOnWindowFocus: false
 */
export const defaultDetailQueryOptions = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
} as const;
