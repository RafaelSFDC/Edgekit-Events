import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { debugSocketManager, type DebugConnectionStatus } from '../../services/debug-socket';
import { useOptionalAuth } from '../../context/auth-context';

export function useDebugStream(isPaused = false): {
  wsStatus: DebugConnectionStatus;
  reconnect: () => void;
} {
  const auth = useOptionalAuth();
  const isAuthenticated = auth ? auth.isAuthenticated : true;

  const rawStatus = useSyncExternalStore(
    (onStoreChange) => debugSocketManager.subscribe(onStoreChange),
    () => debugSocketManager.getStatus()
  );

  useEffect(() => {
    debugSocketManager.setPaused(isPaused);
  }, [isPaused]);

  // Se não estiver autenticado, desconecta imediatamente e não tenta conectar
  useEffect(() => {
    if (isAuthenticated) {
      debugSocketManager.connect();
    } else {
      debugSocketManager.disconnect();
    }
  }, [isAuthenticated]);

  const reconnect = useCallback(() => {
    if (isAuthenticated) {
      debugSocketManager.reconnect();
    }
  }, [isAuthenticated]);

  const wsStatus: DebugConnectionStatus = isAuthenticated ? rawStatus : 'disconnected';

  return { wsStatus, reconnect };
}
