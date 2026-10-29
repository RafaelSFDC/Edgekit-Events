import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { StatsBar } from './components/StatsBar';
import { DebugConsole } from './components/DebugConsole';
import { EventSimulator } from './components/EventSimulator';
import { ChannelExplorer } from './components/ChannelExplorer';
import { SnippetGenerator } from './components/SnippetGenerator';
import { SecretKeyModal } from './components/SecretKeyModal';
import { useI18n } from './i18n/context';
import type { DebugEvent, AppStats } from './types';
import { Terminal, Send, Hash, Code2 } from 'lucide-react';
import { useAuth, useStatsQuery, queryKeys } from './hooks/api';
import { useQueryClient } from '@tanstack/react-query';

const defaultStats: AppStats = {
  active_sockets: 0,
  channels_count: 0,
  channels: {},
  debug_listeners: 0,
  timestamp: Date.now(),
};

export const App: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'console' | 'simulator' | 'channels' | 'snippets'>('console');
  const [isSecretModalOpen, setIsSecretModalOpen] = useState(false);

  // TanStack Query domain hooks
  const { isAuthenticated, app } = useAuth();
  const statsQuery = useStatsQuery({ refetchInterval: 10000 });

  const stats = statsQuery.data ?? defaultStats;
  const appId = app?.id ?? statsQuery.data?.app?.id ?? 'app-default';
  const appKey = app?.key ?? statsQuery.data?.app?.key ?? 'key-default';

  // Events & Debug Console state
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [simulatorChannel, setSimulatorChannel] = useState<string>('pedidos');

  const wsRef = useRef<WebSocket | null>(null);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // Conecta ao WebSocket do Live Debug Console
  // O navegador envia automaticamente o Cookie HttpOnly durante o handshake WebSocket
  const connectDebugWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!isAuthenticated) {
      setWsStatus('disconnected');
      return;
    }

    setWsStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/debug/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('connected');
      };

      ws.onmessage = (event) => {
        if (isPausedRef.current) return;
        try {
          const raw = JSON.parse(event.data);
          if (raw.type === 'connected') return;

          const newEvent: DebugEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: raw.type,
            channel: raw.channel,
            event: raw.event,
            data: raw.data,
            socket_id: raw.socket_id,
            delivered_to: raw.delivered_to,
            is_presence: raw.is_presence,
            presence_user_id: raw.presence_user_id,
            timestamp: raw.timestamp || Date.now(),
          };

          setEvents((prev) => [newEvent, ...prev.slice(0, 499)]); // Mantém os últimos 500 eventos

          // Invalida a query de stats em tempo real para atualizar contadores e canais
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        } catch (e) {
          console.error('Error parsing debug frame:', e);
        }
      };

      ws.onerror = () => {
        setWsStatus('disconnected');
      };

      ws.onclose = () => {
        setWsStatus('disconnected');
      };
    } catch {
      setWsStatus('disconnected');
    }
  }, [isAuthenticated, queryClient]);

  useEffect(() => {
    connectDebugWs();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectDebugWs]);

  const handleLogoutSuccess = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsStatus('disconnected');
  };

  const handleSelectChannelForTrigger = (channelName: string) => {
    setSimulatorChannel(channelName);
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <Navbar
        wsStatus={wsStatus}
        isAuthenticated={isAuthenticated}
        appId={appId}
        appKey={appKey}
        onOpenSecretModal={() => setIsSecretModalOpen(true)}
        onReconnectWs={connectDebugWs}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metric Cards */}
        <StatsBar
          activeSockets={stats.active_sockets}
          channelsCount={stats.channels_count}
          sessionEventsCount={events.length}
          isHibernating={stats.active_sockets === 0}
        />

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6 space-x-2 sm:space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'console'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{t.tabs.debugConsole}</span>
            {events.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {events.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-700'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{t.tabs.eventSimulator}</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'channels'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-700'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>{t.tabs.channelsExplorer}</span>
            {stats.channels_count > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                {stats.channels_count}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('snippets')}
            className={`flex items-center space-x-2 py-3 px-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'snippets'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-zinc-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>{t.tabs.snippets}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'console' && (
          <DebugConsole
            events={events}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onClear={() => setEvents([])}
          />
        )}

        {activeTab === 'simulator' && (
          <EventSimulator
            isAuthenticated={isAuthenticated}
            initialChannel={simulatorChannel}
            onOpenSecretModal={() => setIsSecretModalOpen(true)}
            onEventDispatched={() => statsQuery.refetch()}
          />
        )}

        {activeTab === 'channels' && (
          <ChannelExplorer
            channels={stats.channels || {}}
            onRefresh={() => statsQuery.refetch()}
            isRefreshing={statsQuery.isFetching}
            onSelectChannelForTrigger={handleSelectChannelForTrigger}
          />
        )}

        {activeTab === 'snippets' && (
          <SnippetGenerator
            appKey={appKey}
            appId={appId}
            host={window.location.host}
          />
        )}
      </main>

      {/* Secret Key Modal */}
      <SecretKeyModal
        isOpen={isSecretModalOpen}
        onClose={() => setIsSecretModalOpen(false)}
        isAuthenticated={isAuthenticated}
        onLogoutSuccess={handleLogoutSuccess}
      />
    </div>
  );
};
