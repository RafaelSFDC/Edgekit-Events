import React, { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Send,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useRouterState } from '@tanstack/react-router';
import { PageLayout } from '../components/layout/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertAction } from '@/components/ui/alert';
import { useI18n } from '../i18n/context';
import { useEventsQuery, useClearEvents } from '../hooks/api/use-events';
import { useDebugStream } from '../hooks/api/use-debug-stream';
import { ConsoleDataTable } from '../components/console/ConsoleDataTable';
import { EventPayloadDialog } from '../components/console/EventPayloadDialog';
import { EventSimulatorDialog } from '../components/console/EventSimulatorDialog';
import type { DebugEvent } from '../types';
import { toast } from 'sonner';

export const ConsolePage: React.FC = () => {
  const { t } = useI18n();
  const [isPaused, setIsPaused] = useState(false);
  const [inspectEvent, setInspectEvent] = useState<DebugEvent | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simulatorChannel, setSimulatorChannel] = useState<string | undefined>(undefined);

  // Parâmetros de busca da rota (ex: se redirecionado de ChannelsPage)
  const routerState = useRouterState();
  useEffect(() => {
    const search = routerState.location.search as any;
    if (search?.channel) {
      setSimulatorChannel(search.channel);
      setIsSimulatorOpen(true);
    } else if (search?.simulate) {
      setIsSimulatorOpen(true);
    }
  }, [routerState.location.search]);

  // Hook para dados reativos com TanStack Query como Single Source of Truth
  const { data: events = [] } = useEventsQuery();
  const clearEvents = useClearEvents();
  const { wsStatus, reconnect } = useDebugStream(isPaused);

  const activeChannelsCount = useMemo(() => {
    return new Set(events.map((e) => e.channel).filter(Boolean)).size;
  }, [events]);

  const handleClear = () => {
    clearEvents();
    toast.info('Histórico do console limpo com sucesso.');
  };

  return (
    <PageLayout>
      {/* 1. Cabeçalho Padronizado Estilo Diorama Care */}
      <PageHeader
        title={t.debugConsole.title}
        subtitle={t.debugConsole.subtitle}
        badge={
          events.length > 0 ? (
            <Badge variant="outline" className="font-normal text-xs text-muted-foreground">
              {events.length} {events.length === 1 ? 'evento' : 'eventos'} • {activeChannelsCount}{' '}
              {activeChannelsCount === 1 ? 'canal detectado' : 'canais detectados'}
            </Badge>
          ) : undefined
        }
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsPaused((prev) => !prev)}
        >
          {isPaused ? <Play className="size-4 text-emerald-500" /> : <Pause className="size-4" />}
          <span>{isPaused ? t.debugConsole.resumeStream : t.debugConsole.pauseStream}</span>
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          disabled={events.length === 0}
          className="text-muted-foreground hover:text-destructive hover:border-destructive/30"
        >
          <Trash2 className="size-4" />
          <span className="hidden sm:inline">{t.debugConsole.clearLogs}</span>
        </Button>

        <Button
          type="button"
          variant="default"
          onClick={() => {
            setSimulatorChannel(undefined);
            setIsSimulatorOpen(true);
          }}
        >
          <Send className="size-4" />
          <span>Simulador</span>
        </Button>
      </PageHeader>

      {/* Banner de Aviso Âmbar se Pausado */}
      {isPaused && (
        <Alert
          variant="warning"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
            <AlertDescription className="text-xs">
              O stream do console ao vivo está <strong className="font-semibold">pausado</strong> no momento.
              Novos eventos recebidos pelo WebSocket não serão incluídos na tabela até que o feed seja retomado.
            </AlertDescription>
          </div>
          <AlertAction className="shrink-0 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setIsPaused(false)}
              className="h-7 text-xs border-amber-500/40 hover:bg-amber-500/20 text-foreground font-medium gap-1"
            >
              <Play className="size-3 text-emerald-600 dark:text-emerald-400" />
              Retomar Stream
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* Banner de Aviso se Desconectado */}
      {wsStatus === 'disconnected' && !isPaused && (
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

      {/* Tabela de Eventos TanStack diretamente na página (sem Card redundante) */}
      <ConsoleDataTable
        data={events}
        onInspectEvent={(ev) => setInspectEvent(ev)}
      />

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
      />
    </PageLayout>
  );
};
