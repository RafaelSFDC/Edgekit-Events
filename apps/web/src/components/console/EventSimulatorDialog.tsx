import React, { useState, useEffect } from 'react';
import { Send, Sparkles, CheckCircle2, Code, AlertTriangle, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../../i18n/context';
import { useTriggerEvent } from '../../hooks/api/use-trigger';
import { useChannelsQuery } from '../../hooks/api/use-channels';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EventSimulatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialChannel?: string;
  initialEvent?: string;
}

const PRESETS = {
  order: {
    channel: 'pedidos',
    event: 'novo-pedido',
    payload: {
      pedido_id: 1042,
      cliente: 'Maria Silva',
      valor_total: 249.9,
      itens_count: 3,
      status: 'pago',
      criado_em: new Date().toISOString(),
    },
  },
  chat: {
    channel: 'chat-geral',
    event: 'nova-mensagem',
    payload: {
      user_id: 'usr_789',
      username: 'AlexDev',
      mensagem: 'Olá a todos! Notificação em tempo real funcionando perfeitamente via Cloudflare.',
      timestamp: Date.now(),
    },
  },
  alert: {
    channel: 'alertas-sistema',
    event: 'alerta-disparado',
    payload: {
      nivel: 'aviso',
      titulo: 'Backup Concluído',
      detalhes: 'O backup diário de dados foi finalizado com 100% de integridade.',
      tempo_execucao_ms: 320,
    },
  },
};

export const EventSimulatorDialog: React.FC<EventSimulatorDialogProps> = ({
  open,
  onOpenChange,
  initialChannel = 'pedidos',
  initialEvent,
}) => {
  const { t } = useI18n();
  const [channel, setChannel] = useState(initialChannel);
  const [event, setEvent] = useState(initialEvent || 'novo-pedido');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(PRESETS.order.payload, null, 2)
  );

  const { data: channelsData } = useChannelsQuery();
  const channelConfig = channelsData?.[channel];
  const configuredEvents: string[] = channelConfig?.events || [];

  const triggerMutation = useTriggerEvent();
  const loading = triggerMutation.isPending;

  useEffect(() => {
    if (initialChannel) {
      setChannel(initialChannel);
    }
    if (initialEvent) {
      setEvent(initialEvent);
    }
  }, [initialChannel, initialEvent]);

  const handleSelectPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    setChannel(preset.channel);
    setEvent(preset.event);
    setPayloadText(JSON.stringify(preset.payload, null, 2));
    triggerMutation.reset();
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setPayloadText(JSON.stringify(parsed, null, 2));
      triggerMutation.reset();
    } catch {
      toast.error(t.simulator.invalidJson);
    }
  };

  const handleTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channel.trim() || !event.trim()) return;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch {
      toast.error(t.simulator.invalidJson);
      return;
    }

    triggerMutation.mutate(
      {
        channel: channel.trim(),
        event: event.trim(),
        data: parsedPayload,
      },
      {
        onSuccess: (data) => {
          toast.success(
            `Evento disparado com sucesso! Entregue a ${data.delivered_to} clientes.`
          );
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 sm:max-w-2xl">
        <DialogHeader className="gap-2 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Send className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {t.simulator.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t.simulator.subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Templates Rápidos */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
            <Sparkles className="size-3.5 text-primary" />
            <span>{t.simulator.templatePreset}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('order')}
            className="h-7 text-xs"
          >
            {t.simulator.presetOrder}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('chat')}
            className="h-7 text-xs"
          >
            {t.simulator.presetChat}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('alert')}
            className="h-7 text-xs"
          >
            {t.simulator.presetAlert}
          </Button>
        </div>

        {/* Formulário de Disparo */}
        <form onSubmit={handleTrigger} className="flex flex-col gap-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dlg-sim-channel" className="text-xs font-medium text-foreground">
                {t.simulator.channelLabel}
              </Label>
              <Input
                id="dlg-sim-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={t.simulator.channelPlaceholder}
                className="font-mono text-xs h-8"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dlg-sim-event" className="text-xs font-medium text-foreground">
                {t.simulator.eventLabel}
              </Label>
              <Input
                id="dlg-sim-event"
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder={t.simulator.eventPlaceholder}
                className="font-mono text-xs h-8"
                required
              />
              {configuredEvents.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[10px] text-muted-foreground mr-1">Eventos do canal:</span>
                  {configuredEvents.map((ev) => (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => setEvent(ev)}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer',
                        event === ev
                          ? 'bg-primary text-primary-foreground border-primary font-semibold'
                          : 'bg-muted/60 text-foreground border-border hover:bg-muted'
                      )}
                    >
                      {ev}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="dlg-sim-payload" className="text-xs font-medium text-foreground">
                {t.simulator.payloadLabel}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleFormatJson}
                className="text-xs text-primary hover:text-primary/80 gap-1 h-6 px-1.5"
              >
                <Code className="size-3" />
                <span>{t.simulator.formatJson}</span>
              </Button>
            </div>
            <Textarea
              id="dlg-sim-payload"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={7}
              className="bg-muted/40 font-mono text-xs text-foreground resize-y"
              required
            />
          </div>

          {/* Feedback de sucesso ou erro */}
          {triggerMutation.isSuccess && (
            <Alert
              variant="success"
              className="p-2.5 text-xs flex items-center gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <AlertDescription className="font-medium text-inherit">
                {t.simulator.triggerSuccess} (Entregue a {triggerMutation.data?.delivered_to || 0} cliente(s))
              </AlertDescription>
            </Alert>
          )}

          {triggerMutation.isError && (
            <Alert
              variant="destructive"
              className="p-2.5 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <AlertDescription className="font-medium text-inherit">
                {triggerMutation.error?.message || t.simulator.triggerError}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="mt-2 pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              <Send className="size-3.5" />
              <span>{loading ? t.simulator.triggering : t.simulator.triggerButton}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
