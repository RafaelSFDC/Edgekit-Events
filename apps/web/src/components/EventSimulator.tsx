import React, { useState } from 'react';
import { Send, Sparkles, CheckCircle2, Code, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n/context';
import { useTriggerEvent } from '../hooks/api/use-trigger';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface EventSimulatorProps {
  initialChannel?: string;
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

export const EventSimulator: React.FC<EventSimulatorProps> = ({
  initialChannel = 'pedidos',
}) => {
  const { t } = useI18n();
  const [channel, setChannel] = useState(initialChannel);
  const [event, setEvent] = useState('novo-pedido');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(PRESETS.order.payload, null, 2)
  );

  const triggerMutation = useTriggerEvent();
  const loading = triggerMutation.isPending;

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

    triggerMutation.mutate({
      channel: channel.trim(),
      event: event.trim(),
      data: parsedPayload,
    });
  };

  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-6">
        <CardTitle className="text-base font-semibold text-foreground">
          {t.simulator.title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          {t.simulator.subtitle}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Preset template selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
            <Sparkles className="size-3.5 text-primary" />
            <span>{t.simulator.templatePreset}</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('order')}
          >
            {t.simulator.presetOrder}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('chat')}
          >
            {t.simulator.presetChat}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => handleSelectPreset('alert')}
          >
            {t.simulator.presetAlert}
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleTrigger} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sim-channel" className="text-xs font-medium text-foreground">
                {t.simulator.channelLabel}
              </Label>
              <Input
                id="sim-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder={t.simulator.channelPlaceholder}
                className="font-mono text-xs"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sim-event" className="text-xs font-medium text-foreground">
                {t.simulator.eventLabel}
              </Label>
              <Input
                id="sim-event"
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                placeholder={t.simulator.eventPlaceholder}
                className="font-mono text-xs"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="sim-payload" className="text-xs font-medium text-foreground">
                {t.simulator.payloadLabel}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleFormatJson}
                className="text-xs text-primary hover:text-primary/80 gap-1"
              >
                <Code className="size-3" />
                <span>{t.simulator.formatJson}</span>
              </Button>
            </div>
            <Textarea
              id="sim-payload"
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="bg-muted/60 font-mono text-xs text-foreground resize-y"
              required
            />
          </div>

          {/* Status message directly driven by TanStack Query mutation */}
          {triggerMutation.isSuccess && (
            <Alert
              className="p-3 text-xs flex items-center gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            >
              <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
              <AlertDescription className="font-medium text-inherit">
                {t.simulator.triggerSuccess} (Entregue a {triggerMutation.data?.delivered_to || 0} conexões)
              </AlertDescription>
            </Alert>
          )}

          {triggerMutation.isError && (
            <Alert
              variant="destructive"
              className="p-3 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <AlertDescription className="font-medium text-inherit">
                {triggerMutation.error?.message || t.simulator.triggerError}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="gap-2"
            >
              <Send className="size-4" />
              <span>{loading ? t.simulator.triggering : t.simulator.triggerButton}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
