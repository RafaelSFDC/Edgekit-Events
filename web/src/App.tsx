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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const defaultStats: AppStats = {
  active_sockets: 0,
  channels_count: 0,
  channels: {},
  debug_listeners: 0,
  timestamp: Date.now(),
};

type TabValue = 'console' | 'simulator' | 'channels' | 'snippets';

export const App: React.FC = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabValue>('console');
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

        {/* Tab Navigation with shadcn Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as TabValue)}
          className="space-y-6"
        >
          <TabsList variant="line" className="border-b border-border w-full justify-start pb-0 h-auto gap-2 sm:gap-4 overflow-x-auto">
            <TabsTrigger
              value="console"
              className="py-3 px-3 text-xs sm:text-sm font-medium data-active:text-sky-400 group-data-[variant=line]/tabs-list:data-active:after:bg-sky-400"
            >
              <Terminal className="w-4 h-4 mr-1.5" />
              <span>{t.tabs.debugConsole}</span>
              {events.length > 0 && (
                <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] bg-sky-500/10 text-sky-400 border-sky-500/20">
                  {events.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="simulator"
              className="py-3 px-3 text-xs sm:text-sm font-medium data-active:text-sky-400 group-data-[variant=line]/tabs-list:data-active:after:bg-sky-400"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span>{t.tabs.eventSimulator}</span>
            </TabsTrigger>

            <TabsTrigger
              value="channels"
              className="py-3 px-3 text-xs sm:text-sm font-medium data-active:text-sky-400 group-data-[variant=line]/tabs-list:data-active:after:bg-sky-400"
            >
              <Hash className="w-4 h-4 mr-1.5" />
              <span>{t.tabs.channelsExplorer}</span>
              {stats.channels_count > 0 && (
                <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
                  {stats.channels_count}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="snippets"
              className="py-3 px-3 text-xs sm:text-sm font-medium data-active:text-sky-400 group-data-[variant=line]/tabs-list:data-active:after:bg-sky-400"
            >
              <Code2 className="w-4 h-4 mr-1.5" />
              <span>{t.tabs.snippets}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="console" className="mt-0">
            <DebugConsole
              events={events}
              isPaused={isPaused}
              onTogglePause={() => setIsPaused(!isPaused)}
              onClear={() => setEvents([])}
            />
          </TabsContent>

          <TabsContent value="simulator" className="mt-0">
            <EventSimulator
              isAuthenticated={isAuthenticated}
              initialChannel={simulatorChannel}
              onOpenSecretModal={() => setIsSecretModalOpen(true)}
              onEventDispatched={() => statsQuery.refetch()}
            />
          </TabsContent>

          <TabsContent value="channels" className="mt-0">
            <ChannelExplorer
              channels={stats.channels || {}}
              onRefresh={() => statsQuery.refetch()}
              isRefreshing={statsQuery.isFetching}
              onSelectChannelForTrigger={handleSelectChannelForTrigger}
            />
          </TabsContent>

          <TabsContent value="snippets" className="mt-0">
            <SnippetGenerator
              appKey={appKey}
              appId={appId}
              host={window.location.host}
            />
          </TabsContent>
        </Tabs>
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
