import React, { useState } from 'react';
import { Code2, Copy, Check, Radio, Send, Users, Shield } from 'lucide-react';
import type { DebugEvent } from '../../types';
import { formatTime, copyToClipboard } from '../../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface EventPayloadDialogProps {
  event: DebugEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EventPayloadDialog: React.FC<EventPayloadDialogProps> = ({
  event,
  open,
  onOpenChange,
}) => {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const formattedJson =
    typeof event.data === 'string'
      ? (() => {
          try {
            return JSON.stringify(JSON.parse(event.data), null, 2);
          } catch {
            return event.data;
          }
        })()
      : event.data !== undefined
      ? JSON.stringify(event.data, null, 2)
      : null;

  const handleCopy = async () => {
    if (!formattedJson) return;
    const ok = await copyToClipboard(formattedJson);
    if (ok) {
      setCopied(true);
      toast.success('Payload JSON copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getEventCategoryBadge = () => {
    switch (event.type) {
      case 'event_triggered':
        return (
          <Badge variant="outline" className="text-xs border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10 gap-1">
            <Send className="size-3" />
            <span>TRIGGER</span>
          </Badge>
        );
      case 'client_connected':
        return (
          <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 gap-1">
            <Radio className="size-3" />
            <span>CONNECT</span>
          </Badge>
        );
      case 'client_disconnected':
        return (
          <Badge variant="outline" className="text-xs border-destructive/30 text-destructive bg-destructive/10 gap-1">
            <Radio className="size-3" />
            <span>DISCONNECT</span>
          </Badge>
        );
      case 'channel_subscribed':
        return (
          <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 gap-1">
            <Users className="size-3" />
            <span>SUBSCRIBE</span>
          </Badge>
        );
      case 'channel_unsubscribed':
        return (
          <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 gap-1">
            <Users className="size-3" />
            <span>UNSUBSCRIBE</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs gap-1 font-mono">
            {event.type}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 sm:max-w-3xl">
        <DialogHeader className="gap-2 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <Code2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span>Inspeção de Evento</span>
                  {getEventCategoryBadge()}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  ID: <span className="font-mono text-foreground">{event.id}</span> • Registrado às{' '}
                  <span className="font-mono font-medium text-foreground">{formatTime(event.timestamp)}</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Metadados do Evento em Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3 text-xs bg-muted/40 p-3 rounded-lg border border-border">
          <div>
            <span className="text-muted-foreground block text-[11px]">Canal</span>
            <span className="font-mono font-semibold text-foreground break-all">
              {event.channel ? event.channel : '—'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Nome do Evento</span>
            <span className="font-mono font-semibold text-foreground break-all">
              {event.event ? event.event : event.type}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Socket ID</span>
            <span className="font-mono text-foreground break-all">
              {event.socket_id ? event.socket_id : '—'}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px]">Entregas</span>
            <span className="font-mono text-foreground">
              {event.delivered_to !== undefined ? `${event.delivered_to} cliente(s)` : '—'}
            </span>
          </div>

          {event.is_presence && (
            <div className="col-span-2 sm:col-span-4 flex items-center gap-2 pt-1 border-t border-border/60">
              <Shield className="size-3 text-indigo-500" />
              <span className="text-muted-foreground">Canal de Presença • ID de Usuário:</span>
              <strong className="font-mono text-foreground">{event.presence_user_id || 'anônimo'}</strong>
            </div>
          )}
        </div>

        {/* Payload JSON */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span className="font-medium text-foreground">Payload dos Dados (JSON)</span>
            {formattedJson && (
              <span className="text-[11px] font-mono">
                {new Blob([formattedJson]).size} bytes
              </span>
            )}
          </div>

          {formattedJson ? (
            <div className="relative group">
              <ScrollArea className="max-h-80 rounded-lg border border-border bg-muted/60 dark:bg-muted/30">
                <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre leading-relaxed select-text">
                  {formattedJson}
                </pre>
              </ScrollArea>
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={handleCopy}
                className="absolute top-2.5 right-2.5 gap-1.5 shadow-xs"
              >
                {copied ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
                <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border border-dashed p-6 text-center text-xs text-muted-foreground">
              Este evento não possui payload de dados adicional anexado.
            </div>
          )}
        </div>

        <DialogFooter className="mt-2 pt-3 border-t border-border flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
