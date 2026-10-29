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
import { formatTime, copyToClipboard } from '../lib/utils';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
          <Badge variant="outline" className="space-x-1 text-[11px] bg-sky-500/10 text-sky-400 border-sky-500/20">
            <Zap className="w-3 h-3" />
            <span>TRIGGER</span>
          </Badge>
        );
      case 'client_connected':
        return (
          <Badge variant="outline" className="space-x-1 text-[11px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
            <LogIn className="w-3 h-3" />
            <span>CONNECT</span>
          </Badge>
        );
      case 'client_disconnected':
        return (
          <Badge variant="outline" className="space-x-1 text-[11px] bg-rose-500/10 text-rose-400 border-rose-500/20">
            <LogOut className="w-3 h-3" />
            <span>DISCONNECT</span>
          </Badge>
        );
      case 'channel_subscribed':
        return (
          <Badge variant="outline" className="space-x-1 text-[11px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
            <UserCheck className="w-3 h-3" />
            <span>SUBSCRIBE</span>
          </Badge>
        );
      case 'channel_unsubscribed':
        return (
          <Badge variant="outline" className="space-x-1 text-[11px] bg-amber-500/10 text-amber-400 border-amber-500/20">
            <ArrowRightCircle className="w-3 h-3" />
            <span>UNSUBSCRIBE</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="space-x-1 text-[11px] bg-secondary text-secondary-foreground border-border">
            <Radio className="w-3 h-3" />
            <span>SYSTEM</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-sm overflow-hidden flex flex-col min-h-[560px]">
      {/* Controls & Filter Bar */}
      <CardHeader className="p-4 border-b border-border bg-card/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 space-y-0">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.debugConsole.searchPlaceholder}
            className="pl-9 text-xs h-8 bg-secondary"
          />
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border">
            <Button
              variant={filterType === 'all' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'bg-background text-foreground shadow-xs font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              {t.debugConsole.filterAll}
            </Button>
            <Button
              variant={filterType === 'events' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setFilterType('events')}
              className={filterType === 'events' ? 'bg-background text-foreground shadow-xs font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              {t.debugConsole.filterEvents}
            </Button>
            <Button
              variant={filterType === 'connections' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setFilterType('connections')}
              className={filterType === 'connections' ? 'bg-background text-foreground shadow-xs font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              {t.debugConsole.filterConnections}
            </Button>
            <Button
              variant={filterType === 'subscriptions' ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setFilterType('subscriptions')}
              className={filterType === 'subscriptions' ? 'bg-background text-foreground shadow-xs font-medium' : 'text-muted-foreground hover:text-foreground'}
            >
              {t.debugConsole.filterSubscriptions}
            </Button>
          </div>

          {/* Pause / Resume */}
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePause}
            className={`flex items-center space-x-1 h-8 ${
              isPaused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'text-muted-foreground'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {isPaused ? t.debugConsole.resumeStream : t.debugConsole.pauseStream}
            </span>
          </Button>

          {/* Clear Feed */}
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            title={t.debugConsole.clearLogs}
            className="flex items-center space-x-1 h-8 text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.debugConsole.clearLogs}</span>
          </Button>
        </div>
      </CardHeader>

      {/* Events Table / Feed */}
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 max-h-[580px]">
          <div className="divide-y divide-border">
            {filteredEvents.length === 0 ? (
              <div className="py-20 text-center px-4">
                <Radio className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">
                  {events.length === 0
                    ? t.debugConsole.noEvents
                    : t.debugConsole.noEventsMatching}
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => ev.data !== undefined && setSelectedEvent(ev)}
                  className={`p-3 sm:px-4 flex items-center justify-between hover:bg-secondary/40 transition-colors text-xs ${
                    ev.data !== undefined ? 'cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Event Type Badge */}
                    <div className="shrink-0">{renderEventBadge(ev.type)}</div>

                    {/* Channel Name */}
                    {ev.channel ? (
                      <Badge variant="outline" className="shrink-0 font-mono text-[11px] bg-secondary border-border text-foreground">
                        {ev.channel}
                      </Badge>
                    ) : null}

                    {/* Event Name or Details */}
                    <div className="min-w-0">
                      {ev.event ? (
                        <span className="font-semibold text-foreground mr-2 font-mono">
                          {ev.event}
                        </span>
                      ) : null}

                      {ev.type === 'client_connected' && (
                        <span className="text-muted-foreground">
                          Cliente conectou: <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'client_disconnected' && (
                        <span className="text-muted-foreground">
                          Cliente desconectou: <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'channel_subscribed' && (
                        <span className="text-muted-foreground">
                          Inscrito via socket <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                      {ev.type === 'channel_unsubscribed' && (
                        <span className="text-muted-foreground">
                          Desinscrito via socket <code className="text-foreground font-mono">{ev.socket_id}</code>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Inspect trigger */}
                  <div className="flex items-center space-x-3 shrink-0 ml-4">
                    {ev.delivered_to !== undefined && (
                      <span className="hidden sm:inline text-[11px] text-muted-foreground font-mono">
                        {ev.delivered_to} {ev.delivered_to === 1 ? 'destinatário' : 'destinatários'}
                      </span>
                    )}
                    {ev.data !== undefined && (
                      <span className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1">
                        <Code2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Ver JSON</span>
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground font-mono">
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
            <div className="flex items-center space-x-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">
                  {t.debugConsole.payloadModalTitle}
                </DialogTitle>
                {selectedEvent && (
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
                    <span>Canal: <strong className="text-sky-400 font-mono">{selectedEvent.channel}</strong></span>
                    <span>•</span>
                    <span>Evento: <strong className="text-foreground font-mono">{selectedEvent.event}</strong></span>
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
              <ScrollArea className="max-h-96 rounded-xl border border-zinc-800 bg-zinc-950">
                <pre className="p-4 text-xs font-mono text-emerald-400">
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
                variant="outline"
                size="xs"
                onClick={() => handleCopyJson(selectedEvent.data)}
                className="absolute top-3 right-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
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
