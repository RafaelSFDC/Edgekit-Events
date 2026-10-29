import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { debugSocketManager, type DebugConnectionStatus } from '../../services/debug-socket';
import { useOptionalAuth } from '../../context/auth-context';

export function useDebugStream(isPaused = false): {
  wsStatus: DebugConnectionStatus;
  reconnect: () => void;
} {
  const auth = useOptionalAuth();
  const isAuthenticated = auth ? auth.isAuthenticated : true;
  const openModal = auth?.openModal;

  const wsStatus = useSyncExternalStore(
    (onStoreChange) => debugSocketManager.subscribe(onStoreChange),
    () => debugSocketManager.getStatus()
  );

  useEffect(() => {
    debugSocketManager.setPaused(isPaused);
  }, [isPaused]);

  useEffect(() => {
    if (isAuthenticated) {
      debugSocketManager.connect();
    } else {
      debugSocketManager.disconnect();
    }
  }, [isAuthenticated]);

  const reconnect = useCallback(() => {
    if (!isAuthenticated) {
      openModal?.();
      return;
    }
    debugSocketManager.reconnect();
  }, [isAuthenticated, openModal]);

  return { wsStatus, reconnect };
}
