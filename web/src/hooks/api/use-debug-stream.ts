import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { debugSocketManager, type DebugConnectionStatus } from '../../services/debug-socket';
import { useAuth } from '../../context/auth-context';

export function useDebugStream(isPaused = false): {
  wsStatus: DebugConnectionStatus;
  reconnect: () => void;
} {
  const { isAuthenticated } = useAuth();

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
    debugSocketManager.reconnect();
  }, []);

  return { wsStatus, reconnect };
}
