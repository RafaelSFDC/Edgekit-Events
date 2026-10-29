import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { defaultDetailQueryOptions } from './query-defaults';
import { useInvalidateMutation } from './mutation-helpers';
import { fetchAuthMe, loginAuth, logoutAuth, type AuthMeResponse } from '../../services/api';

export function useAuthMeQuery() {
  return useQuery<AuthMeResponse>({
    ...defaultDetailQueryOptions,
    queryKey: queryKeys.auth.me(),
    queryFn: fetchAuthMe,
  });
}

export function useLoginMutation() {
  return useInvalidateMutation({
    mutationFn: async (secret: string) => loginAuth(secret),
    invalidate: [queryKeys.auth.all, queryKeys.stats.all],
    successMessage: 'Autenticado com sucesso via Cookie HttpOnly.',
    errorMessage: 'Falha na autenticação. Verifique sua Secret Key.',
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useInvalidateMutation({
    mutationFn: async () => logoutAuth(),
    invalidate: [queryKeys.auth.all],
    successMessage: 'Sessão encerrada com sucesso.',
    errorMessage: 'Falha ao encerrar sessão.',
    onSuccess: () => {
      // Limpa dados em cache do app
      queryClient.setQueryData(queryKeys.auth.me(), { authenticated: false });
    },
  });
}

/**
 * Convenience hook for authentication state
 */
export function useAuth() {
  const query = useAuthMeQuery();
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  return {
    isAuthenticated: Boolean(query.data?.authenticated),
    app: query.data?.app,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    loginError: loginMutation.error,
    refetchSession: query.refetch,
  };
}
