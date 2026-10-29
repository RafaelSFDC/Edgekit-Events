import React, { useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Search,
  Zap,
  ArrowRightCircle,
  LogIn,
  LogOut,
  UserCheck,
  Radio,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import type { DebugEvent } from '../types';
import { useI18n } from '../i18n/context';
import { formatTime, copyToClipboard, cn } from '../lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface DebugConsoleProps {
  events: DebugEvent[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({
  events,
  isPaused,
  onTogglePause,
  onClear,
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<DebugEvent | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter events based on search query and category
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Category filter
      if (filterType === 'events' && ev.type !== 'event_triggered') return false;
      if (
        filterType === 'connections' &&
        ev.type !== 'client_connected' &&
        ev.type !== 'client_disconnected'
      ) {
        return false;
      }
      if (
        filterType === 'subscriptions' &&
        ev.type !== 'channel_subscribed' &&
        ev.type !== 'channel_unsubscribed'
      ) {
        return false;
      }

      // Search query
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      const channel = ev.channel?.toLowerCase() || '';
      const eventName = ev.event?.toLowerCase() || '';
      const socket = ev.socket_id?.toLowerCase() || '';
      const type = ev.type.toLowerCase();

      return (
        channel.includes(query) ||
        eventName.includes(query) ||
        socket.includes(query) ||
        type.includes(query)
      );
    });
  }, [events, search, filterType]);

  const handleCopyJson = async (data: any) => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const renderEventBadge = (type: DebugEvent['type']) => {
    switch (type) {
      case 'event_triggered':
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs border-primary/30 text-primary bg-primary/10"
          >
            <Zap className="size-3" />
            <span>TRIGGER</span>
          </Badge>
        );
      case 'client_connected':
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
          >
            <LogIn className="size-3" />
            <span>CONNECT</span>
          </Badge>
        );
      case 'client_disconnected':
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs border-destructive/30 text-destructive bg-destructive/10"
          >
            <LogOut className="size-3" />
            <span>DISCONNECT</span>
          </Badge>
        );
      case 'channel_subscribed':
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs border-border text-foreground bg-secondary"
          >
            <UserCheck className="size-3" />
            <span>SUBSCRIBE</span>
          </Badge>
        );
      case 'channel_unsubscribed':
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          >
            <ArrowRightCircle className="size-3" />
            <span>UNSUBSCRIBE</span>
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="gap-1 text-xs bg-secondary text-secondary-foreground border-border"
          >
            <Radio className="size-3" />
            <span>SYSTEM</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-xs overflow-hidden flex flex-col min-h-96">
      {/* Controls & Filter Bar */}
      <CardHeader className="p-4 border-b border-border bg-card/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.debugConsole.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs font-mono"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Category Filter using official shadcn Tabs */}
          <Tabs value={filterType} onValueChange={setFilterType}>
            <TabsList className="bg-muted h-8 p-1">
              <TabsTrigger value="all" className="text-xs px-2.5 py-1">
                {t.debugConsole.filterAll}
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs px-2.5 py-1">
                {t.debugConsole.filterEvents}
              </TabsTrigger>
              <TabsTrigger value="connections" className="text-xs px-2.5 py-1">
                {t.debugConsole.filterConnections}
              </TabsTrigger>
              <TabsTrigger value="subscriptions" className="text-xs px-2.5 py-1">
                {t.debugConsole.filterSubscriptions}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Pause / Resume Button */}
          <Button
            variant={isPaused ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePause}
            className="gap-1 h-8 text-xs shrink-0"
          >
            {isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span>{isPaused ? t.debugConsole.resumeStream : t.debugConsole.pauseStream}</span>
          </Button>

          {/* Clear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={events.length === 0}
            className="gap-1 h-8 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/30 shrink-0"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">{t.debugConsole.clearLogs}</span>
          </Button>
        </div>
      </CardHeader>

      {/* Events Stream / Log View */}
      <CardContent className="p-0 flex-1 flex flex-col">
        <ScrollArea className="flex-1 max-h-160">
          <div className="divide-y divide-border">
            {filteredEvents.length === 0 ? (
              <Empty className="py-20 border-0">
                <EmptyMedia variant="icon">
                  <Radio className="size-4 animate-pulse text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>{events.length === 0 ? t.debugConsole.noEvents : t.debugConsole.noEventsMatching}</EmptyTitle>
                  <EmptyDescription>
                    {events.length === 0
                      ? 'Aguardando novas mensagens no stream WebSocket.'
                      : 'Tente alterar os termos da busca ou mudar a categoria do filtro.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => ev.data !== undefined && setSelectedEvent(ev)}
                  className={cn(
                    'p-3.5 hover:bg-muted/40 transition-colors flex items-center justify-between text-xs',
                    ev.data !== undefined ? 'cursor-pointer' : ''
                  )}
                >
                  {/* Event Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Badge Category */}
                    {renderEventBadge(ev.type)}

                    {/* Channel */}
                    {ev.channel && (
                      <Badge
                        variant="outline"
                        className="shrink-0 font-mono text-xs bg-secondary border-border text-foreground"
                      >
                        {ev.channel}
                      </Badge>
                    )}

                    {/* Event Name or Details */}
                    <div className="min-w-0 flex items-center gap-2 truncate">
                      {ev.event && (
                        <span className="font-semibold text-foreground font-mono truncate">
                          {ev.event}
                        </span>
                      )}
                      {ev.type === 'client_connected' && (
                        <span className="text-muted-foreground">
                          Novo cliente conectado com socket{' '}
                          <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'client_disconnected' && (
                        <span className="text-muted-foreground">
                          Cliente desconectado do socket{' '}
                          <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'channel_subscribed' && (
                        <span className="text-muted-foreground">
                          Inscrito via socket{' '}
                          <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'channel_unsubscribed' && (
                        <span className="text-muted-foreground">
                          Desinscrito via socket{' '}
                          <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Inspect trigger */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {ev.delivered_to !== undefined && (
                      <span className="hidden sm:inline text-xs text-muted-foreground font-mono">
                        {ev.delivered_to}{' '}
                        {ev.delivered_to === 1 ? 'destinatário' : 'destinatários'}
                      </span>
                    )}
                    {ev.data !== undefined && (
                      <span className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Code2 className="size-3" />
                        <span className="hidden sm:inline">Ver JSON</span>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTime(ev.timestamp)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* JSON Payload Inspector Modal */}
      <Dialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      >
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="gap-1 mb-2">
            <div className="flex items-center gap-3 mb-1">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Code2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">
                  {t.debugConsole.payloadModalTitle}
                </DialogTitle>
                {selectedEvent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>
                      Canal:{' '}
                      <strong className="text-primary font-mono">{selectedEvent.channel}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Evento:{' '}
                      <strong className="text-foreground font-mono">{selectedEvent.event}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Payload JSON transmitido em tempo real aos clientes inscritos.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="relative mt-2">
              <ScrollArea className="max-h-96 rounded-lg border border-border bg-muted/70">
                <pre className="p-4 text-xs font-mono text-foreground">
                  {typeof selectedEvent.data === 'string'
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedEvent.data), null, 2);
                        } catch {
                          return selectedEvent.data;
                        }
                      })()
                    : JSON.stringify(selectedEvent.data, null, 2)}
                </pre>
              </ScrollArea>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => handleCopyJson(selectedEvent.data)}
                className="absolute top-3 right-3 gap-1"
              >
                {copied ? (
                  <Check className="size-3.5 text-emerald-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                <span>{copied ? t.common.copied : t.common.copy}</span>
              </Button>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedEvent(null)}
            >
              {t.common.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
