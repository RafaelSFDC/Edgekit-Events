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
  X,
} from 'lucide-react';
import type { DebugEvent } from '../types';
import { useI18n } from '../i18n/context';
import { formatTime, copyToClipboard } from '../lib/utils';

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

  const getEventBadge = (type: DebugEvent['type']) => {
    switch (type) {
      case 'event_triggered':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Zap className="w-3 h-3" />
            <span>TRIGGER</span>
          </span>
        );
      case 'client_connected':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <LogIn className="w-3 h-3" />
            <span>CONNECT</span>
          </span>
        );
      case 'client_disconnected':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <LogOut className="w-3 h-3" />
            <span>DISCONNECT</span>
          </span>
        );
      case 'channel_subscribed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UserCheck className="w-3 h-3" />
            <span>SUBSCRIBE</span>
          </span>
        );
      case 'channel_unsubscribed':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowRightCircle className="w-3 h-3" />
            <span>UNSUBSCRIBE</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Radio className="w-3 h-3" />
            <span>SYSTEM</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[560px]">
      {/* Controls & Filter Bar */}
      <div className="p-4 border-b border-border bg-card/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.debugConsole.searchPlaceholder}
            className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.debugConsole.filterAll}
            </button>
            <button
              onClick={() => setFilterType('events')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === 'events'
                  ? 'bg-zinc-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.debugConsole.filterEvents}
            </button>
            <button
              onClick={() => setFilterType('connections')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === 'connections'
                  ? 'bg-zinc-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.debugConsole.filterConnections}
            </button>
            <button
              onClick={() => setFilterType('subscriptions')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filterType === 'subscriptions'
                  ? 'bg-zinc-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.debugConsole.filterSubscriptions}
            </button>
          </div>

          {/* Pause / Resume */}
          <button
            onClick={onTogglePause}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPaused
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-secondary text-muted-foreground border-border hover:text-foreground hover:bg-zinc-800'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">
              {isPaused ? t.debugConsole.resumeStream : t.debugConsole.pauseStream}
            </span>
          </button>

          {/* Clear Feed */}
          <button
            onClick={onClear}
            title={t.debugConsole.clearLogs}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground border border-border hover:text-rose-400 hover:border-rose-500/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.debugConsole.clearLogs}</span>
          </button>
        </div>
      </div>

      {/* Events Table / Feed */}
      <div className="flex-1 overflow-auto divide-y divide-border">
        {filteredEvents.length === 0 ? (
          <div className="py-20 text-center px-4">
            <Radio className="w-10 h-10 mx-auto text-zinc-600 mb-3 animate-pulse" />
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
                <div className="shrink-0">{getEventBadge(ev.type)}</div>

                {/* Channel Name */}
                {ev.channel ? (
                  <span className="shrink-0 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 font-mono text-[11px] text-zinc-200">
                    {ev.channel}
                  </span>
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
                      Cliente conectou: <code className="text-zinc-300 font-mono">{ev.socket_id}</code>
                    </span>
                  )}
                  {ev.type === 'client_disconnected' && (
                    <span className="text-muted-foreground">
                      Cliente desconectou: <code className="text-zinc-300 font-mono">{ev.socket_id}</code>
                    </span>
                  )}
                  {ev.type === 'channel_subscribed' && (
                    <span className="text-muted-foreground">
                      Inscrito via socket <code className="text-zinc-300 font-mono">{ev.socket_id}</code>
                    </span>
                  )}
                  {ev.type === 'channel_unsubscribed' && (
                    <span className="text-muted-foreground">
                      Desinscrito via socket <code className="text-zinc-300 font-mono">{ev.socket_id}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp & Inspect trigger */}
              <div className="flex items-center space-x-3 shrink-0 ml-4">
                {ev.delivered_to !== undefined && (
                  <span className="hidden sm:inline text-[11px] text-zinc-500 font-mono">
                    {ev.delivered_to} {ev.delivered_to === 1 ? 'destinatário' : 'destinatários'}
                  </span>
                )}
                {ev.data !== undefined && (
                  <span className="text-[11px] text-sky-400 hover:underline flex items-center space-x-1">
                    <Code2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Ver JSON</span>
                  </span>
                )}
                <span className="text-[11px] text-zinc-500 font-mono">
                  {formatTime(ev.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* JSON Payload Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {t.debugConsole.payloadModalTitle}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-0.5">
                  <span>Canal: <strong className="text-sky-400 font-mono">{selectedEvent.channel}</strong></span>
                  <span>•</span>
                  <span>Evento: <strong className="text-foreground font-mono">{selectedEvent.event}</strong></span>
                </div>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative mt-2">
              <pre className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-96">
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
              <button
                onClick={() => handleCopyJson(selectedEvent.data)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 flex items-center space-x-1 border border-zinc-700 shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? t.common.copied : t.common.copy}</span>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-secondary hover:bg-zinc-800 text-foreground text-xs font-medium rounded-lg border border-border"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
