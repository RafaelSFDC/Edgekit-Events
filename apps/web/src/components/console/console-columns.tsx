import React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Code2,
  Copy,
  Check,
  Send,
  Radio,
  Users,
} from 'lucide-react';
import type { DebugEvent } from '../../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTime, copyToClipboard } from '../../lib/utils';
import { toast } from 'sonner';

export interface ConsoleTableMeta {
  onInspectEvent?: (event: DebugEvent) => void;
}

export const consoleColumns: ColumnDef<DebugEvent>[] = [
  {
    accessorKey: 'event',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Evento
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const item = row.original;
      const eventName = item.event || item.type;

      return (
        <div className="flex flex-col min-w-0 max-w-[240px] lg:max-w-[300px] py-0.5">
          <span className="font-semibold text-xs text-foreground font-mono truncate" title={eventName}>
            {eventName}
          </span>
          <span className="text-[11px] text-muted-foreground font-mono truncate">
            {item.socket_id ? `socket: ${item.socket_id}` : `id: ${item.id.slice(0, 16)}`}
          </span>
        </div>
      );
    },
    filterFn: (row, _id, value) => {
      if (!value) return true;
      const q = String(value).toLowerCase();
      const ev = (row.original.event || '').toLowerCase();
      const type = (row.original.type || '').toLowerCase();
      return ev.includes(q) || type.includes(q);
    },
  },
  {
    accessorKey: 'type',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Tipo
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const type = row.getValue('type') as DebugEvent['type'];
      const hasData = row.original.data !== undefined;

      const renderTypeBadge = () => {
        switch (type) {
          case 'event_triggered':
            return (
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10 gap-1"
              >
                <Send className="size-2.5" />
                TRIGGER
              </Badge>
            );
          case 'client_connected':
            return (
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1"
              >
                <Radio className="size-2.5" />
                CONNECT
              </Badge>
            );
          case 'client_disconnected':
            return (
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-destructive/30 text-destructive bg-destructive/10 gap-1"
              >
                <Radio className="size-2.5" />
                DISCONNECT
              </Badge>
            );
          case 'channel_subscribed':
            return (
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 gap-1"
              >
                <Users className="size-2.5" />
                SUBSCRIBE
              </Badge>
            );
          case 'channel_unsubscribed':
            return (
              <Badge
                variant="outline"
                className="text-[11px] font-mono border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1"
              >
                <Users className="size-2.5" />
                UNSUBSCRIBE
              </Badge>
            );
          default:
            return (
              <Badge variant="secondary" className="text-[11px] font-mono uppercase">
                {type}
              </Badge>
            );
        }
      };

      return (
        <div className="flex items-center gap-1.5">
          {renderTypeBadge()}
          {hasData && (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border px-1 py-0">
              JSON
            </Badge>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === 'ALL') return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'channel',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Canal
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const channel = row.getValue('channel') as string | undefined;
      if (!channel) {
        return <span className="text-muted-foreground/60 italic text-xs">—</span>;
      }

      return (
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="text-xs font-mono font-medium bg-muted/60 text-foreground border-border/80"
          >
            {channel}
          </Badge>
          {row.original.is_presence && (
            <span className="text-[10px] text-indigo-500 font-mono font-semibold" title="Canal de presença">
              (P)
            </span>
          )}
        </div>
      );
    },
    filterFn: (row, id, value) => {
      if (!value || value === 'ALL') return true;
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: 'socket_id',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Destinatários / Socket
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const item = row.original;
      return (
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          {item.delivered_to !== undefined && (
            <Badge variant="secondary" className="text-[11px] font-normal">
              {item.delivered_to} {item.delivered_to === 1 ? 'destinatário' : 'destinatários'}
            </Badge>
          )}
          {item.socket_id ? (
            <span className="truncate max-w-[150px]" title={item.socket_id}>
              {item.socket_id}
            </span>
          ) : !item.delivered_to ? (
            <span className="text-muted-foreground/50">—</span>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'timestamp',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          className="-ml-2 h-8 px-2 text-xs font-semibold text-foreground hover:bg-muted/50"
          onClick={() => column.toggleSorting(isSorted === 'asc')}
        >
          Horário
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-1 size-3.5" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-1 size-3.5" />
          ) : (
            <ArrowUpDown className="ml-1 size-3.5 text-muted-foreground" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as number;
      return (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {formatTime(timestamp)}
        </span>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className="text-right text-xs font-semibold text-foreground pr-1">Ações</div>,
    cell: ({ row, table }) => {
      const meta = table.options.meta as ConsoleTableMeta | undefined;
      const item = row.original;
      const hasPayload = item.data !== undefined;

      const handleCopyPayload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const text = typeof item.data === 'string' ? item.data : JSON.stringify(item.data, null, 2);
        const ok = await copyToClipboard(text);
        if (ok) {
          toast.success('Payload JSON copiado!');
        }
      };

      return (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {hasPayload ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleCopyPayload}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Copiar JSON"
              >
                <Copy className="size-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => meta?.onInspectEvent?.(item)}
                className="h-7 gap-1 px-2 text-xs text-primary font-medium hover:bg-primary/10 border-primary/20"
              >
                <Code2 className="size-3" />
                <span>Ver JSON</span>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => meta?.onInspectEvent?.(item)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Ver detalhes"
            >
              <span>Detalhes</span>
            </Button>
          )}
        </div>
      );
    },
  },
];
