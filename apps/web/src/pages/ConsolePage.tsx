import React, { useState, useMemo, useEffect } from 'react';
import {
  Trash2,
  Send,
  AlertTriangle,
  RotateCcw,
  Terminal,
  Hash,
  Plus,
} from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '../i18n/context';
import { useEventsQuery, useClearEvents } from '../hooks/api/use-events';
import { useStatsQuery } from '../hooks/api/use-stats';
import { useDebugStream } from '../hooks/api/use-debug-stream';
import { ConsoleDataTable } from '../components/console/ConsoleDataTable';
import { EventPayloadDialog } from '../components/console/EventPayloadDialog';
import { EventSimulatorDialog } from '../components/console/EventSimulatorDialog';
import { CreateChannelDialog } from '../components/console/CreateChannelDialog';
import { ChannelExplorer } from '../components/ChannelExplorer';
import type { DebugEvent } from '../types';
import { toast } from 'sonner';

export const ConsolePage: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'events' | 'channels'>('events');
  const [inspectEvent, setInspectEvent] = useState<DebugEvent | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [simulatorChannel, setSimulatorChannel] = useState<string | undefined>(undefined);
  const [simulatorDefaultEvent, setSimulatorDefaultEvent] = useState<string | undefined>(undefined);

  // Parâmetros de busca da rota (ex: se redirecionado com tab=channels ou channel=xyz)
  const routerState = useRouterState();
  useEffect(() => {
    const search = routerState.location.search as any;
    if (search?.tab === 'channels') {
      setActiveTab('channels');
    } else if (search?.tab === 'events') {
      setActiveTab('events');
    }

    if (search?.channel) {
      setSimulatorChannel(search.channel);
      setIsSimulatorOpen(true);
    } else if (search?.simulate) {
      setIsSimulatorOpen(true);
    }
  }, [routerState.location.search]);

  // Hook para dados reativos com TanStack Query como Single Source of Truth
  const { data: events = [] } = useEventsQuery();
  const { data: stats } = useStatsQuery();
  const clearEvents = useClearEvents();
  const { wsStatus, reconnect } = useDebugStream();

  const activeChannelsCount = useMemo(() => {
    return new Set(events.map((e) => e.channel).filter(Boolean)).size;
  }, [events]);

  const totalChannelsCount = stats?.channels_count ?? activeChannelsCount;

  const handleClear = () => {
    clearEvents();
    toast.info('Histórico do console limpo com sucesso.');
  };

  return (
    <PageLayout>
      {/* 1. Cabeçalho Padronizado */}
      <PageHeader
        title={t.debugConsole.title}
        subtitle={t.debugConsole.subtitle}
        badge={
          <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'} • {totalChannelsCount}{' '}
            {totalChannelsCount === 1 ? 'canal' : 'canais'}
          </Badge>
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsCreateChannelOpen(true)}
          className="gap-1.5"
        >
          <Plus className="size-4" />
          <span>{t.channels.newChannel}</span>
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={() => {
            setSimulatorChannel(undefined);
            setIsSimulatorOpen(true);
          }}
          className="gap-1.5"
        >
          <Send className="size-4" />
          <span>Simulador</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={events.length === 0}
          className="text-muted-foreground hover:text-destructive hover:border-destructive/30 gap-1.5"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">{t.debugConsole.clearLogs}</span>
        </Button>
      </PageHeader>

      {/* Banner de Aviso se Desconectado */}
      {wsStatus === 'disconnected' && (
        <Alert
          variant="destructive"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-destructive mt-0.5 sm:mt-0" />
            <AlertDescription className="text-xs">
              A conexão com o servidor WebSocket está desconectada. Verifique se o servidor está rodando.
            </AlertDescription>
          </div>
          <AlertAction className="shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={reconnect}
              className="h-7 text-xs border-destructive/40 hover:bg-destructive/20 text-foreground font-medium gap-1"
            >
              <RotateCcw className="size-3" />
              Reconectar
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* 2. Navegação em Abas (Eventos / Canais) */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'events' | 'channels')}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-border/70 pb-3 mb-4">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="events" className="gap-2 text-xs px-3 py-1.5">
              <Terminal className="size-3.5" />
              <span>{t.debugConsole.tabEvents}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-0.5">
                {events.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2 text-xs px-3 py-1.5">
              <Hash className="size-3.5" />
              <span>{t.debugConsole.tabChannels}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-0.5">
                {totalChannelsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Feed de Eventos */}
        <TabsContent value="events" className="mt-0">
          <ConsoleDataTable
            data={events}
            onInspectEvent={(ev) => setInspectEvent(ev)}
          />
        </TabsContent>

        {/* Tab 2: Explorador de Canais */}
        <TabsContent value="channels" className="mt-0">
          <ChannelExplorer
            onSelectChannelForTrigger={(ch, defaultEvent) => {
              setSimulatorChannel(ch);
              setSimulatorDefaultEvent(defaultEvent);
              setIsSimulatorOpen(true);
            }}
            onCreateChannel={() => setIsCreateChannelOpen(true)}
          />
        </TabsContent>
      </Tabs>

      {/* Modal Dialog de Inspeção do Payload JSON */}
      <EventPayloadDialog
        event={inspectEvent}
        open={Boolean(inspectEvent)}
        onOpenChange={(open) => !open && setInspectEvent(null)}
      />

      {/* Modal Dialog de Simulador de Eventos */}
      <EventSimulatorDialog
        open={isSimulatorOpen}
        onOpenChange={setIsSimulatorOpen}
        initialChannel={simulatorChannel}
        initialEvent={simulatorDefaultEvent}
      />

      {/* Modal Dialog de Criação de Canal */}
      <CreateChannelDialog
        open={isCreateChannelOpen}
        onOpenChange={setIsCreateChannelOpen}
        onChannelCreated={(ch) => {
          setActiveTab('channels');
        }}
      />
    </PageLayout>
  );
};
